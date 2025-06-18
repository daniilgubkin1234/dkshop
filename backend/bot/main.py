import os
import re
import logging
import aiohttp
from difflib import SequenceMatcher

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    constants,
    ReplyKeyboardMarkup,
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
    Defaults,
    ContextTypes,
)

# ─── Настройка логирования ───
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

# ─── Переменные окружения ───
BOT_TOKEN    = os.getenv("BOT_TOKEN")
API_URL      = os.getenv("API_URL")     # Например https://dkshopbot.ru/api
FRONT_URL    = os.getenv("FRONT_URL")   # Например https://dkshopbot.ru
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# ─── Постоянное меню ───
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"],
    ],
    resize_keyboard=True,
    one_time_keyboard=False,
)

# ─── Помощники ───

def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    """Формирует текст и inline‑кнопку для товара"""
    url  = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb   = InlineKeyboardMarkup([[InlineKeyboardButton(
        "Открыть карточку", web_app=WebAppInfo(url=url)
    )]])
    return text, kb


def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


# токенизатор: буквы + цифры (нужны 2110‑2112)
TOKEN_RE = re.compile(r"[a-zа-яё0-9]+", re.I)

def tokenize(s: str) -> set[str]:
    return set(TOKEN_RE.findall(s.lower()))

# ─── /start ───
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВыберите пункт меню ниже 👇",
        reply_markup=MAIN_MENU,
    )

# ─── Основной обработчик текста ───
async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    text  = update.message.text or ""
    query = text.strip()
    text_lower = query.lower()

    # 0) обработка пунктов меню (оставил без изменений)
    if "открыть магазин" in text_lower:
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🛍Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
            ]),
        )
        return
    if "о компании" in text_lower:
        await update.message.reply_text(
            "ℹ️ DK PROduct — это ваш надёжный партнёр по запчастям и аксессуарами."
        )
        return
    if "группа вконтакте" in text_lower:
        await update.message.reply_text(
            "📣 Наша группа: https://vk.com/dk_pro_tuning?from=groups"
        )
        return
    if "пригласить друга" in text_lower:
        await update.message.reply_text(
            "🙋‍♂️ Приглашайте друзей по ссылке:\nhttps://t.me/DK_PROduct_bot"
        )
        return

    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # 1) Поиск по шаблону модели (2101‑07) (оставляем как было)
    model_match = re.search(r"\b\d{4}-\d{2}\b", text_lower)
    if model_match:
        q_model = model_match.group(0)
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products", params={"q": q_model}) as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [search by model]")
            await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
            return

        if products:
            # повторно ранжируем внутри результатов модели по полному запросу
            best_prod = _rank_products(query, products)[0]
            txt, kb = build_product_message(best_prod)
            await update.message.reply_text(txt, reply_markup=kb)
            return

    # 2) Общий поиск — сначала только по названиям
    products = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        logging.exception("API request failed [general search]")
        await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
        return

    # 2a) Если API не вернуло ничего — загружаем весь список
    if not products:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products") as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [fallback load all]")
            products = []

    if products:
        # ШАГ «точное покрытие по названию»: все токены запроса должны быть в name
        q_toks = tokenize(query)
        exact_name = [p for p in products if q_toks.issubset(tokenize(p["name"]))]
        pool = exact_name if exact_name else products  # если нет 100%‑покрытия, ранжируем весь список

        best_prod, best_score = _rank_products(query, pool)

        if best_score >= 0.6:
            txt, kb = build_product_message(best_prod)
            await update.message.reply_text(txt, reply_markup=kb)
            return
        if best_score >= 0.4:
            top3 = _rank_products(query, pool, k=3, return_scores=False)
            buttons = [
                InlineKeyboardButton(
                    p["name"], web_app=WebAppInfo(url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}")
                )
                for p in top3
            ]
            await update.message.reply_text(
                "Нашёл несколько подходящих товаров, уточните, пожалуйста:",
                reply_markup=InlineKeyboardMarkup([buttons]),
            )
            return

    # 3) Поиск по типу (далее логика без изменений)
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products") as resp:
                resp.raise_for_status()
                all_products = await resp.json()
        type_matches = [p for p in all_products if query in p.get("type", "").lower()]
        if type_matches:
            prod = type_matches[0]
            txt, kb = build_product_message(prod)
            await update.message.reply_text(txt, reply_markup=kb)
            return
    except Exception:
        logging.exception("API request failed [type search]")

    # 4) FAQ — не менялся
    faqs = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                resp.raise_for_status()
                faqs = await resp.json()
                if faqs:
                    await update.message.reply_text(faqs[0]["answer"])
                    return
            async with sess.get(f"{API_URL}/faq") as resp:
                resp.raise_for_status()
                faqs = await resp.json()
    except Exception:
        logging.exception("FAQ API error")

    best_faq, best_ratio = None, 0.0
    for f in faqs:
        r = SequenceMatcher(None, query.lower(), f["question"].lower()).ratio()
        if r > best_ratio:
            best_ratio, best_faq = r, f
    if best_faq and best_ratio >= 0.65:
        await update.message.reply_text(best_faq["answer"])
        return

    # 5) Эскалация менеджеру
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            await sess.post(
                f"{API_URL}/questions",
                json={
                    "question": text,
                    "user_id": update.effective_user.id,
                    "username": update.effective_user.username,
                },
            )
    except Exception:
        logging.exception("Failed to send question to manager API")

# ─── Вспомогательные функции ───

def _rank_products(query: str, products: list[dict], *, k: int | None = 1, return_scores: bool = True):
    """Возвращает лучший товар (или top‑k) по комбинированному рейтингу"""
    q_toks = tokenize(query)
    scored: list[tuple[float, dict]] = []
    for p in products:
        prod_toks = tokenize(p["name"]) | tokenize(p.get("model_compat", ""))
        coverage = len(q_toks & prod_toks) / (len(q_toks) or 1)
        score = fuzzy(query, p["name"]) * 0.4 + coverage * 0.6  # coverage важнее
        scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    if k == 1:
        return scored[0][1], scored[0][0]
    top = [p for _, p in scored[:k]]
    return (top, None) if not return_scores else top


def main() -> None:
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .defaults(Defaults(parse_mode=constants.ParseMode.HTML))
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    logging.info("Bot started")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
