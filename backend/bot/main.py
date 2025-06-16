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

# ─── Постоянное меню (persistent keyboard) ───
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"]
    ],
    resize_keyboard=True,
    one_time_keyboard=False
)

# ─── Помощник: формирует сообщение и кнопку для одного товара ───
def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    url  = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb   = InlineKeyboardMarkup([[InlineKeyboardButton(
        "Открыть карточку", web_app=WebAppInfo(url=url)
    )]])
    return text, kb

# ─── Функции для оценки схожести ───
def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def tokens(s: str) -> set[str]:
    return set(re.findall(r"\w+", s.lower()))

# ─── /start: просто выводим MAIN_MENU ───
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВыберите пункт меню ниже 👇",
        reply_markup=MAIN_MENU
    )

# ─── Обработка любого текста ───
async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text or ""
    query = text.strip()
    text_lower = query.lower()

    # 0) Перехватываем нажатия из persistent-меню
    if "открыть магазин" in text_lower:
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🛍Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))
            ]])
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

    # Если пустой запрос
    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # 1) Поиск по модели (например: 2101-07)
    model_match = re.search(r"\b\d{4}-\d{2}\b", text_lower)
    if model_match:
        q_model = model_match.group(0)
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(
                    f"{API_URL}/products",
                    params={"q": q_model}
                ) as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [search by model]")
            await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
            return
        if products:
            # Сортируем топ-5 по fuzzy + токены
            scored = []
            for p in products[:5]:
                score = fuzzy(query, p["name"]) * 0.7 + \
                        (len(tokens(query) & tokens(p["name"])) / max(len(tokens(p["name"])),1)) * 0.3
                scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            best_score, best_prod = scored[0]
            if best_score >= 0.6:
                txt, kb = build_product_message(best_prod)
                await update.message.reply_text(txt, reply_markup=kb)
                return
            if best_score >= 0.4:
                buttons = [InlineKeyboardButton(p["name"], web_app=WebAppInfo(
                    url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}"
                )) for _, p in scored[:3]]
                await update.message.reply_text(
                    "Нашёл несколько похожих моделей, уточните, пожалуйста:",
                    reply_markup=InlineKeyboardMarkup([buttons])
                )
                return

     # 2) Общий поиск по товарам
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        logging.exception("API request failed [general search]")
        await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
        return

    # если API по фразе ничего не нашёл — подгружаем полный список
    if not products:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products") as resp_all:
                    resp_all.raise_for_status()
                    products = await resp_all.json()
        except Exception:
            logging.exception("API request failed [fallback load all]")
            products = []  # пусть дальше просто будет пусто

    # теперь применяем fuzzy-логику ко всему списку products
    if products:
        # рассчитываем score для каждого товара
        scored = []
        for p in products:
            score = (
                fuzzy(query, p["name"]) * 0.7 +
                (len(tokens(query) & tokens(p["name"])) / max(len(tokens(p["name"])), 1)) * 0.3
            )
            scored.append((score, p))
        # берём топ-5, сортируем
        scored.sort(key=lambda x: x[0], reverse=True)
        best_score, best_prod = scored[0]

        # если уверены, что нашли — показываем
    if best_score >= 0.6:
        txt, kb = build_product_message(best_prod)
        await update.message.reply_text(txt, reply_markup=kb)
        return

        # если не очень уверены, но что-то нашлось — предлагаем выбор
    if best_score >= 0.4:
            buttons = [
                InlineKeyboardButton(
                    p["name"],
                    web_app=WebAppInfo(url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}")
                )
                for _, p in scored[:3]
            ]
            await update.message.reply_text(
                "Нашёл несколько подходящих товаров, уточните, пожалуйста:",
                reply_markup=InlineKeyboardMarkup([buttons])
            )
            return

    # 3) Поиск по типу товара (fallback)
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products") as resp_all:
                resp_all.raise_for_status()
                all_products = await resp_all.json()
        type_matches = [p for p in all_products if query in p.get("type", "").lower()]
        if type_matches:
            prod = type_matches[0]
            txt, kb = build_product_message(prod)
            await update.message.reply_text(txt, reply_markup=kb)
            return
    except Exception:
        logging.exception("API request failed [type search]")

    # 4) Поиск ответа в FAQ
    faqs = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            # точный поиск
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp_faq:
                resp_faq.raise_for_status()
                faqs = await resp_faq.json()
                if faqs:
                    await update.message.reply_text(faqs[0]["answer"])
                    return
            # фоллбэк загрузить все
            async with sess.get(f"{API_URL}/faq") as resp_all:
                resp_all.raise_for_status()
                faqs = await resp_all.json()
    except Exception:
        logging.exception("FAQ API error")
    # fuzzy
    best_faq, best_ratio = None, 0.0
    for f in faqs:
        r = SequenceMatcher(None, query, f["question"].lower()).ratio()
        if r > best_ratio:
            best_ratio, best_faq = r, f
    if best_faq and best_ratio >= 0.65:
        await update.message.reply_text(best_faq["answer"])
        return
    # ключевые слова
    query_toks = tokens(query)
    best_kw, best_count = None, 0
    for f in faqs:
        inter = query_toks & tokens(f["question"])
        if len(inter) > best_count:
            best_count, best_kw = len(inter), f
    if best_kw and best_count >= 2:
        await update.message.reply_text(best_kw["answer"])
        return

    # 5) Ничего не найдено — передаём вопрос менеджеру
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            await sess.post(f"{API_URL}/questions", json={"question": text})
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
    app.run_polling(allowed_updates=["message"] )

if __name__ == "__main__":
    main()
