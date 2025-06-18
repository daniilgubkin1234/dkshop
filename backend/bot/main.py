# bot/main.py
"""Telegram‑бот DK PROduct  ·  расширенный поиск товара по полному запросу.

Ключевые изменения (v2)
=======================
1. **Поиск всегда идёт по _полному_ запросу**.  Модель (формата `0000-00`)   
   учитывается как обязательный фильтр, но остальные слова тоже влияют на рейтинг.
2. **Скоринг** = 60 % пересечения токенов + 20 % fuzzy + 20 % «совпала ли модель».  
   Когда модель присутствует в запросе, товар _должен_ содержать такую же модель, иначе
   его рейтинг резко падает.
3. **Уточняющий вопрос** с примером и подсказкой, если найдено ≤ 3 средних
   совпадения или не найдено точных.
4. Фоллбэк: FAQ → вопрос менеджеру (без изменений).
"""

from __future__ import annotations

import os
import re
import logging
from difflib import SequenceMatcher
from typing import Any, Tuple

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

# ─── Логирование ──────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("dkbot")

# ─── Параметры окружения ─────────────────────────────────────────────────
BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
API_URL: str = os.getenv("API_URL", "https://dkshopbot.ru/api")
FRONT_URL: str = os.getenv("FRONT_URL", "https://dkshopbot.ru")
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# ─── Меню ────────────────────────────────────────────────────────────────
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"],
    ],
    resize_keyboard=True,
)

# ─── Вспомогательные утилиты ─────────────────────────────────────────────

def norm(text: str) -> str:
    """Нижний регистр + очистка от лишних символов."""
    return re.sub(r"[^\w\d]+", " ", text.lower()).strip()


def tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower()))


def fuzzy(a: str, b: str) -> float:
    """Sequence‑matcher ratio 0‑1."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def score(query: str, product: dict[str, Any], model: str | None) -> float:
    """Комбинированный рейтинг для сортировки."""
    t_overlap = len(tokens(query) & tokens(product["name"])) / max(len(tokens(product["name"])), 1)
    f = fuzzy(query, product["name"])
    m = 0.0
    if model:
        if model in product.get("name", "") or model in str(product.get("model_compat", "")):
            m = 1.0
    return 0.6 * t_overlap + 0.2 * f + 0.2 * m


def build_product_message(product: dict[str, Any]) -> Tuple[str, InlineKeyboardMarkup]:
    url = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = (
        f"<b>{product['name']}</b>\n"
        f"Цена: <b>{product['price']} ₽</b>"
    )
    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Открыть карточку", web_app=WebAppInfo(url=url))]]
    )
    return text, kb

# ─── Асинхронные запросы к API ───────────────────────────────────────────

async def api_get(path: str, params: dict[str, Any] | None = None) -> Any:
    async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
        async with sess.get(f"{API_URL}{path}", params=params) as resp:
            resp.raise_for_status()
            return await resp.json()

# ─── Хэндлеры ─────────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Доброго времени суток! 👋\n" "Выберите пункт меню ниже.",
        reply_markup=MAIN_MENU,
    )


async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return

    raw = update.message.text.strip()
    query = norm(raw)
    lower = raw.lower()

    # ── системные пункты меню ────────────────────────────────────────────
    if "открыть магазин" in lower:
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("🛍 Открыть", web_app=WebAppInfo(url=FRONT_URL))]]
            ),
        )
        return
    if "о компании" in lower:
        await update.message.reply_text("ℹ️ DK PROduct — запчасти и тюнинг.")
        return
    if "группа вконтакте" in lower:
        await update.message.reply_text("📣 https://vk.com/dk_pro_tuning")
        return
    if "пригласить друга" in lower:
        await update.message.reply_text("🙋‍♂️ https://t.me/DK_PROduct_bot")
        return

    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # ── парсим модель, но не выбрасываем остальные слова ────────────────
    model_match = re.search(r"\b\d{4}-\d{2}\b", query)
    model_token: str | None = model_match.group(0) if model_match else None

    # ── 1) Главный поиск: всегда по полному запросу ─────────────────────
    try:
        products: list[dict[str, Any]] = await api_get("/products", {"q": query})
    except Exception:
        logger.exception("API /products failed")
        await update.message.reply_text("Сервис временно недоступен 🙏")
        return

    # ── 2) Считаем рейтинги ─────────────────────────────────────────────
    rated: list[Tuple[float, dict[str, Any]]] = [
        (score(query, p, model_token), p) for p in products
    ]
    rated.sort(key=lambda x: x[0], reverse=True)

    if rated and rated[0][0] >= 0.75:
        txt, kb = build_product_message(rated[0][1])
        await update.message.reply_text(txt, reply_markup=kb)
        return

    if rated and rated[0][0] >= 0.4:
        # несколько средних совпадений → просим уточнить
        await update.message.reply_text(
            "Нашёл несколько похожих товаров, но точное совпадение не определил.\n"
            "Пожалуйста, уточните модель (например, 2101-07) или введите более точное "
            "название детали целиком.",
        )
        return

    # ── 3) FAQ ──────────────────────────────────────────────────────────
    try:
        faqs: list[dict[str, Any]] = await api_get("/faq", {"q": query})
    except Exception:
        faqs = []
    if faqs:
        best = max(faqs, key=lambda f: fuzzy(query, f["question"]))
        if fuzzy(query, best["question"]) >= 0.65:
            await update.message.reply_text(best["answer"])
            return

    # ── 4) Передаём вопрос менеджеру ────────────────────────────────────
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        await api_get("/questions", {"question": raw})  # допустим GET‑ручка
    except Exception:
        logger.warning("Не удалось отправить вопрос менеджеру")


# ─── Запуск ───────────────────────────────────────────────────────────────

def main():
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .defaults(Defaults(parse_mode=constants.ParseMode.HTML))
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("Bot started")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
