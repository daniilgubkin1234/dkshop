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

# ──────────── Конфигурация ─────────────
BOT_TOKEN   = os.getenv("BOT_TOKEN")                       # обязателен
API_URL     = os.getenv("API_URL",   "http://api:8001")    # FastAPI
FRONT_URL   = os.getenv("FRONT_URL", "https://dkshopbot.ru")
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
    """
    Формируем текст + Web-кнопку на карточку товара.
    """
    web_url = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"

    text = (
        f"<b>{product['name']}</b>\n"
        f"Цена: <b>{product['price']} ₽</b>"
    )

    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Открыть карточку",
                               web_app=WebAppInfo(url=web_url))]]
    )
    return text, kb


async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.message.text.strip().lower()

    # ─── 0. Если пустая строчка – сразу отшлём “не понял”
    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # ─── 1. Проверка на “модельный паттерн” (например “2101-07”, “1600-12” и т.п.)
    model_match = re.search(r"\b\d{4}-\d{2}\b", query)
    if model_match:
        # Попробуем найти товар по точному совпадению с моделью
        # (API /products?q=2101-07)
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
            await update.message.reply_text(
                "Сервис временно недоступен, попробуйте позже 🙏"
            )
            return

        if products:
            txt, kb = build_product_message(products[0])
            await update.message.reply_text(txt, reply_markup=kb)
            return
        # Если по модели не нашлось – просто падаем дальше, чтобы попытаться FAQ

    # ─── 2. Если явно “вопрос-фраза” (FAQ)
    # Например: содержит “как”, “что”, “почему”, “зачем”, “где” и т.п.
    # Здесь можно расширить список ключевых слов или регулярку.
    faq_keywords = (
    "как", "что", "почему", "зачем",
    "сколько", "где", "когда",
    "можно ли", "нужно ли", "какие", "какое", "изготавливаете",
    "для чего", "могу ли", "транспортными компаниями", "в чем отличие",
    "какие сроки", "входят ли", "какого"
)
    if any(query.startswith(kw + " ") or f" {kw} " in query for kw in faq_keywords):
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(
                    f"{API_URL}/faq",
                    params={"q": query}
                ) as resp:
                    resp.raise_for_status()
                    faqs = await resp.json()
                    if faqs:
                        # Отправляем первый подходящий ответ из FAQ
                        await update.message.reply_text(faqs[0]["answer"])
                        return
        except Exception:
            logging.warning("FAQ API not responding")
        # Если FAQ не дал результата — упадём дальше (попытаемся искать товар по ключевым словам)

    # ─── 3. Поиск товара “по ключевой фразе” (например “глушитель спорт”, “паук с гофрой”)
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(
                f"{API_URL}/products",
                params={"q": query}
            ) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        logging.exception("API request failed [general search]")
        await update.message.reply_text(
            "Сервис временно недоступен, попробуйте позже 🙏"
        )
        return

    if products:
        for p in products[:3]:
            txt, kb = build_product_message(p)
            await update.message.reply_text(txt, reply_markup=kb)
        return

    # ─── 4. Ничего из выше не сработало → пересылаем менеджеру
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
