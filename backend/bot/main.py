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
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
    Defaults,
)
from dotenv import load_dotenv

load_dotenv()

# ──────────── Конфигурация ─────────────
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_URL = os.getenv("API_URL", "http://api:8001")
FRONT_URL = os.getenv("FRONT_URL", "https://dkshopbot.ru")
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=5)

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s: %(message)s",
    level=logging.INFO,
)

# ──────────── Хэндлеры ─────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВведите интересующий вас запрос."
    )


def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    url = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("Открыть карточку", web_app=WebAppInfo(url=url))]
    ])
    return text, kb


async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.message.text.strip().lower()

    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # 1. Поиск по модели
    model_match = re.search(r"\b\d{4}-\d{2}\b", query)
    if model_match:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(
                    f"{API_URL}/products", params={"q": model_match.group(0)}
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

    # 2. Явный вопрос → FAQ
    faq_keywords = (
        "как", "что", "почему", "зачем",
        "сколько", "где", "когда",
        "можно ли", "нужно ли", "какие", "какое", "изготавливаете",
        "для чего", "могу ли", "транспортными компаниями", "в чем отличие",
        "какие сроки", "входят ли", "какого", "оплата", "платеж", "карта",
        "при получении", "стоимость", "цена", "доставка"
    )
    is_faq = any(query.startswith(kw + " ") or f" {kw} " in query for kw in faq_keywords)
    if is_faq:
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                    resp.raise_for_status()
                    faqs = await resp.json()
                    if faqs:
                        await update.message.reply_text(faqs[0]["answer"])
                        return
        except Exception:
            logging.warning("FAQ API not responding")

    # 3. Попытка найти товар по ключевым словам
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

    # 4. Fallback: проверка FAQ в любом случае
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                resp.raise_for_status()
                faqs = await resp.json()
                if faqs:
                    await update.message.reply_text(faqs[0]["answer"])
                    return
    except Exception:
        logging.warning("FAQ fallback failed")

    # 5. Вообще ничего не нашли → пишем менеджеру
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            await sess.post(
                f"{API_URL}/questions",
                json={"user_id": update.effective_user.id, "text": query}
            )
    except Exception:
        logging.warning("Could not send question to API")

# ──────────── Запуск ─────────────
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
