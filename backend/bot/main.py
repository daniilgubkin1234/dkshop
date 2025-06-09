# bot/main.py

import os
import re
import logging
import aiohttp

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
BOT_TOKEN   = os.getenv("BOT_TOKEN")
API_URL     = os.getenv("API_URL")     # Например https://dkshopbot.ru/api
FRONT_URL   = os.getenv("FRONT_URL")   # Например https://dkshopbot.ru
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# ─── Постоянное меню (persistent keyboard) ───
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин", "🛒 Мои заказы"],
        ["ℹ️ О компании",       "📣 Наш канал"],
        ["🙋‍♂️ Пригласить друга"]
    ],
    resize_keyboard=True,
    one_time_keyboard=False
)

# ─── Помощник: формирует сообщение и кнопку для одного товара ───
def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    url  = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb   = InlineKeyboardMarkup([[
        InlineKeyboardButton("Открыть карточку", web_app=WebAppInfo(url=url))
    ]])
    return text, kb

# ─── /start: просто выводим MAIN_MENU ───
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВыберите пункт меню ниже 👇",
        reply_markup=MAIN_MENU
    )

# ─── Обработка любого текста ───
async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    text_lower = update.message.text.strip().lower()

    # 0) Перехватываем нажатия из persistent-меню
    if text_lower == "открыть магазин":
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))
            ]])
        )
        return


    if text_lower == "о компании":
        await update.message.reply_text(
            "ℹ️ DK PROduct — это ваш надёжный партнёр по запчастям и аксессуарам."
        )
        return

    if text_lower.startswith("группа вконтакте"):
        await update.message.reply_text(
            "📣 Наша группа: https://vk.com/dk_pro_tuning?from=groups"
        )
        return

    if "пригласить друга" in text_lower:
        await update.message.reply_text(
            "🙋‍♂️ Приглашайте друзей по ссылке:\nhttps://t.me/share/url?url=https://t.me/your_bot"
        )
        return

    # 1) Обычный поисковый запрос
    query = text_lower.strip()
    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # 2) Поиск по модели (например: 2101-07)
    model_match = re.search(r"\b\d{4}-\d{2}\b", query)
    if model_match:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(
                    f"{API_URL}/products",
                    params={"q": model_match.group(0)}
                ) as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [search by model]")
            await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
            return

        if products:
            txt, kb = build_product_message(products[0])
            await update.message.reply_text(txt, reply_markup=kb)
            return

    # 3) Прямой запрос к FAQ
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                resp.raise_for_status()
                faqs = await resp.json()
                if faqs:
                    # Просто выводим ответ из FAQ
                    await update.message.reply_text(faqs[0]["answer"])
                    return
    except Exception:
        logging.warning("FAQ API not responding")

    # 4) Общий поиск по товарам
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        logging.exception("API request failed [general search]")
        await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
        return

    if products:
        txt, kb = build_product_message(products[0])
        await update.message.reply_text(txt, reply_markup=kb)
        return

    # 5) Ничего не найдено — передаём вопрос менеджеру
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            await sess.post(f"{API_URL}/questions", json={"question": update.message.text})
    except Exception:
        logging.exception("Failed to send question to manager API")


# ─── Точка входа ───
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
