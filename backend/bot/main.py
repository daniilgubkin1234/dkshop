# bot/main.py
"""Telegram‑бот DK PROduct (улучшенный поиск по названию + уточняющие вопросы).

Алгоритм поиска
================
1. Приоритет «названия»: если в запросе **нет** шаблона модели `0000-00`,
   считаем, что пользователь ищет по имени детали.
2. Если найдено *несколько* средне‑релевантных товаров, просим ввести
   более точную модель/название (без кнопок).
3. Если указана модель ― ищем строго по ней.
4. Фоллбэк: FAQ ➜ менеджер.
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

# ─── Настройка логирования ────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ─── Переменные окружения ────────────────────────────────────────────────
BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
API_URL: str = os.getenv("API_URL", "https://dkshopbot.ru/api")
FRONT_URL: str = os.getenv("FRONT_URL", "https://dkshopbot.ru")
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# ─── Постоянное меню (persistent keyboard) ───────────────────────────────
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"],
    ],
    resize_keyboard=True,
    one_time_keyboard=False,
)

# ─── Вспомогательные функции ─────────────────────────────────────────────

def norm(text: str) -> str:
    """Снижение регистра + удаление лишних символов."""
    return re.sub(r"[^\w\d]+", " ", text.lower()).strip()


def tokens(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower()))


def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def score(query: str, product: dict[str, Any]) -> float:
    """0.0‒1.0: 70 % token‑overlap + 30 % fuzzy."""
    q_toks = tokens(query)
    p_toks = tokens(product["name"])
    overlap = len(q_toks & p_toks) / max(len(p_toks), 1)
    return 0.7 * overlap + 0.3 * fuzzy(query, product["name"])


def build_product_message(product: dict[str, Any]) -> Tuple[str, InlineKeyboardMarkup]:
    url = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Открыть карточку", web_app=WebAppInfo(url=url))]]
    )
    return text, kb

# ─── Хэндлеры ─────────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВыберите пункт меню ниже 👇",
        reply_markup=MAIN_MENU,
    )


async def _search_products(q: str) -> list[dict[str, Any]]:
    """Вспомогательный асинхронный запрос к /products."""
    async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
        async with sess.get(f"{API_URL}/products", params={"q": q}) as resp:
            resp.raise_for_status()
            return await resp.json()


async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return  # ignore non‑text

    raw_text = update.message.text.strip()
    query = norm(raw_text)
    text_lower = raw_text.lower()

    # ── 0. Меню ──────────────────────────────────────────────────────────
    if "открыть магазин" in text_lower:
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("🛍Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]]
            ),
        )
        return
    if "о компании" in text_lower:
        await update.message.reply_text("ℹ️ DK PROduct — запчасти и тюнинг.")
        return
    if "группа вконтакте" in text_lower:
        await update.message.reply_text("📣 https://vk.com/dk_pro_tuning?from=groups")
        return
    if "пригласить друга" in text_lower:
        await update.message.reply_text("🙋‍♂️ https://t.me/DK_PROduct_bot")
        return

    # ── 1. Пустой ввод ──────────────────────────────────────────────────
    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # ── 2. Определяем тип запроса ──────────────────────────────────────
    model_match = re.search(r"\b\d{4}-\d{2}\b", query)

    # 2a. === Поиск по НАЗВАНИЮ (приоритет) ===
    if not model_match:
        products = []
        try:
            products = await _search_products(query)
        except Exception:
            logger.exception("API error [name search]")
            await update.message.reply_text("Сервис временно недоступен 🙏")
            return

        if products:
            scored = sorted(((score(query, p), p) for p in products), key=lambda t: t[0], reverse=True)
            best_score, best_prod = scored[0]

            if best_score >= 0.75:
                txt, kb = build_product_message(best_prod)
                await update.message.reply_text(txt, reply_markup=kb)
                return

            if best_score >= 0.4:
                # Уточняющий вопрос вместо кнопок
                await update.message.reply_text(
                    "Нашёл несколько товаров по запросу. Уточните, пожалуйста, модель автомобиля "
                    "(например 2101‑07) или введите полное название детали более точно.",
                )
                return
        # если ничего не нашли по названию, попробуем как модель

    # 2b. === Поиск по МОДЕЛИ ===
    search_term = model_match.group(0) if model_match else query
    try:
        products = await _search_products(search_term)
    except Exception:
        logger.exception("API error [model search]")
        await update.message.reply_text("Сервис временно недоступен 🙏")
        return

    if products:
        txt, kb = build_product_message(products[0])
        await update.message.reply_text(txt, reply_markup=kb)
        return

    # ── 3. FAQ -----------------------------------------------------------------
    faqs: list[dict[str, Any]] = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp_faq:
                resp_faq.raise_for_status()
                faqs = await resp_faq.json()
    except Exception:
        logger.warning("FAQ API not responding")

    if faqs:
        best = max(faqs, key=lambda f: fuzzy(query, f["question"]))
        if fuzzy(query, best["question"]) >= 0.65:
            await update.message.reply_text(best["answer"])
            return

    # ── 4. Передаём вопрос менеджеру ------------------------------------------
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            await sess.post(f"{API_URL}/questions", json={"question": raw_text})
    except Exception:
        logger.exception("Failed to send question to manager API")


# ─── Точка входа ───────────────────────────────────────────────────────────

def main() -> None:
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
