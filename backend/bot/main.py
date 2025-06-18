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


# токенизатор для быстрого пересечения
WORD_RE = re.compile(r"[a-zа-яё]+", re.I)

def smart_tokens(s: str) -> set[str]:
    """Только буквы, lower-case. Можно заменить на лемматизацию."""
    return set(WORD_RE.findall(s.lower()))


def tokens(s: str) -> set[str]:
    """Оставлена старая функция — используется в логике модели"""
    return set(re.findall(r"\w+", s.lower()))

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

    # 0) обработка пунктов меню
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

    # 1) Поиск по шаблону модели (формат 2101-07)
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
            scored: list[tuple[float, dict]] = []
            for p in products[:5]:
                score = fuzzy(query, p["name"]) * 0.7 + (
                    len(tokens(query) & tokens(p["name"])) / max(len(tokens(p["name"])), 1)
                ) * 0.3
                scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            best_score, best_prod = scored[0]
            if best_score >= 0.6:
                txt, kb = build_product_message(best_prod)
                await update.message.reply_text(txt, reply_markup=kb)
                return
            if best_score >= 0.4:
                buttons = [
                    InlineKeyboardButton(
                        p["name"],
                        web_app=WebAppInfo(url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}")
                    )
                    for _, p in scored[:3]
                ]
                await update.message.reply_text(
                    "Нашёл несколько похожих моделей, уточните, пожалуйста:",
                    reply_markup=InlineKeyboardMarkup([buttons]),
                )
                return

    # 2) Общий поиск по товарам с учётом *всех* слов
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        logging.exception("API request failed [general search]")
        await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
        return

    # если ничего не нашли точным поиском – загружаем весь каталог как fallback
    if not products:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products") as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [fallback load all]")
            products = []

    original_products = products  # сохраним для fallback после фильтра

    query_toks = smart_tokens(query)

    # Фильтр «полного покрытия» всех слов запроса (если их ≥2)
    if len(query_toks) >= 2 and products:
        filtered: list[dict] = []
        for p in products:
            prod_toks = (
                smart_tokens(p["name"]) |
                smart_tokens(p.get("model_compat", "")) |
                smart_tokens(p.get("type", "")) |
                smart_tokens(p.get("description", ""))
            )
            if query_toks.issubset(prod_toks):
                filtered.append(p)
        if filtered:
            products = filtered

    # ранжирование
    best_score, best_prod = 0.0, None
    scored: list[tuple[float, dict]] = []
    if products:
        for p in products:
            prod_toks = (
                smart_tokens(p["name"]) | smart_tokens(p.get("model_compat", ""))
            )
            inter = query_toks & prod_toks
            coverage = len(inter) / len(query_toks) if query_toks else 0
            score = fuzzy(query, p["name"]) * 0.5 + coverage * 0.5
            scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        best_score, best_prod = scored[0]

    # если уверены — показываем
    if best_prod and best_score >= 0.6:
        txt, kb = build_product_message(best_prod)
        await update.message.reply_text(txt, reply_markup=kb)
        return

    # если не очень уверены, но что‑то нашли — предлагаем уточнить
    if best_prod and best_score >= 0.4:
        buttons = [
            InlineKeyboardButton(
                p["name"],
                web_app=WebAppInfo(url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}")
            )
            for _, p in scored[:3]
        ]
        await update.message.reply_text(
            "Нашёл несколько подходящих товаров, уточните, пожалуйста:",
            reply_markup=InlineKeyboardMarkup([buttons]),
        )
        return

    # 3) Поиск по типу как крайний вариант
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

    # 4) FAQ (остаётся без изменений)
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

    # 5) эскалация вопроса менеджеру с идентификацией пользователя
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
