# bot/main.py
import os
import logging
import aiohttp
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    constants,
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
    Defaults,
)
from utils import https_product_url

# ──────────────────────── Конфигурация ──────────────────────────
BOT_TOKEN   = os.getenv("BOT_TOKEN")
API_URL     = os.getenv("API_URL", "http://api:8001")
FRONT_URL   = os.getenv("FRONT_URL", "http://localhost:5173")
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=5)

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s: %(message)s",
    level=logging.INFO,
)

# ──────────────────────── Хэндлеры ──────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Привет! Напишите, например, «глушитель 2107», а я проверю наличие."
    )

def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup | None]:
    text = f"Нашёл: <b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb = None
    url = https_product_url(product["id"])
    if url:
        kb = InlineKeyboardMarkup(
            [[InlineKeyboardButton("Открыть карточку",
                                   web_app=WebAppInfo(url=url))]]
        )
    return text, kb

async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.message.text.strip().lower()

    # ─ сначала ищем FAQ
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as session:
            async with session.get(f"{API_URL}/faq", params={"q": query}) as r:
                r.raise_for_status()
                faqs = await r.json()
                if faqs:
                    await update.message.reply_text(faqs[0]["answer"])
                    return
    except Exception:
        logging.warning("FAQ API not responding")

    # ─ затем ищем товар
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as session:
            async with session.get(f"{API_URL}/products", params={"q": query}) as r:
                r.raise_for_status()
                products = await r.json()
    except Exception as e:
        logging.exception("API request failed")
        await update.message.reply_text(
            "Сервис временно недоступен, попробуйте позже 🙏"
        )
        return

    if products:
        txt, kb = build_product_message(products[0])
        await update.message.reply_text(txt, reply_markup=kb, parse_mode="HTML")
        return

    # ─ ничего не нашли → сохраняем как вопрос
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as session:
            await session.post(f"{API_URL}/questions", json={
                "user_id": update.effective_user.id,
                "text": query,
            })
    except Exception:
        logging.warning("Could not send question to API")

# ──────────────────────── Запуск ────────────────────────────────
def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("Please set BOT_TOKEN env-var")

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
