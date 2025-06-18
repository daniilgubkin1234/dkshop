# bot/main.py
import os
import re
import logging
import aiohttp
from difflib import SequenceMatcher
from typing import Dict

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
    CallbackQueryHandler,
    filters,
    Defaults,
    ContextTypes,
)

# ─── ЛОГИРОВАНИЕ ─────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

# ─── ENV ────────────────────────────────────────────────────────
BOT_TOKEN    = os.getenv("BOT_TOKEN")
API_URL      = os.getenv("API_URL")     # https://dkshopbot.ru/api
FRONT_URL    = os.getenv("FRONT_URL")   # https://dkshopbot.ru
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

# ─── Меню ───────────────────────────────────────────────────────
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        ["🛍 Открыть магазин"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"],
    ],
    resize_keyboard=True,
    one_time_keyboard=False,
)

# ─── INTENT_PATTERNS ────────────────────────────────────────────
INTENT_PATTERNS = {
    "PRODUCT": [
        r"\b\d{4}-\d{2}\b",
        r"\b(приора|ваз|иж|ода|веста|vesta|priora|vaz|kalina|калина)\b",
        r"\b(глушитель|коллектор|штаны|паук)\b",
    ],
    "FAQ": [
        r"^(как|почему|когда|можно ли|что делать)\b",
        r"\b(гаранти[яию]|доставка|возврат|оплата)\b",
        r"\b(компани[яиюй]|транспортные|транспортной|траснпортными|отличие|какого)\b",
        r"\b(какого|зачем|изготавливаете ли|сколько|оплата|могу ли|состыковывается|состыкуется|"
        r"как звучит зрб|как звучит zrb|как звучит|комфорт|спорт как звучит|как звучит спорт)\b",
        r"\b(комфорт как звучит|как звучит комфорт|для чего |входят ли)\b",
        r"\b(какой звук зрб|зрб какой звук|какой звук комфорт|комфорт какой звук)\b",
        r"\b(какой звук спорт|спорт какой звук|какой звук sport|comfort какой звук)\b",
        r"\b(как звучит sport|как звучит comfort|sport какой звук)\b",
    ],
}

# ─── Алиасы и транслит ──────────────────────────────────────────
ALIASES: Dict[str, str] = {                 # ★ NEW
}

TRANSLIT = str.maketrans("zrb", "зрб")      # ★ NEW


def normalize_kir_lat(s: str) -> str:       # ★ NEW
    """zrb → зрб, g→г и т.п. (добавляйте по мере надобности)"""
    return s.translate(TRANSLIT)


def apply_aliases(q: str) -> str:           # ★ NEW
   
    return q


# ─── Вспомогательные функции ────────────────────────────────────
def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def tokens(s: str) -> set[str]:
    s = normalize_kir_lat(s.lower())        # ★ MOD
    return set(re.findall(r"\w+", s))


def detect_intent(text: str) -> tuple[str, float]:
    text = text.lower()
    scores = {"PRODUCT": 0, "FAQ": 0}
    for intent, pats in INTENT_PATTERNS.items():
        for p in pats:
            if re.search(p, text):
                scores[intent] += 1
    if re.search(r"\d{4}-\d{2}", text):
        scores["PRODUCT"] += 2
    total = sum(scores.values()) or 1
    intent = max(scores, key=scores.get)
    return intent, scores[intent] / total


def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    url  = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb   = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Открыть карточку", web_app=WebAppInfo(url=url))]]
    )
    return text, kb


# ─── /start ──────────────────────────────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Доброго времени суток! 👋\nВыберите пункт меню ниже 👇",
        reply_markup=MAIN_MENU,
    )


# ─── Callback: уточняем намерение ────────────────────────────────
async def cb_intent(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = update.callback_query.data
    await update.callback_query.answer()
    if data == "INTENT_PRODUCT":
        ctx.user_data["forced_intent"] = "PRODUCT"
        await update.callback_query.message.reply_text(
            "Окей, ищу товар. Введите название или модель."
        )
    elif data == "INTENT_FAQ":
        ctx.user_data["forced_intent"] = "FAQ"
        await update.callback_query.message.reply_text(
            "Хорошо, слушаю ваш вопрос!"
        )


# ─── Основной обработчик текста ─────────────────────────────────
async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text or ""
    query = text.strip()
    text_lower = query.lower()

    # ---------- меню ----------
    if "открыть магазин" in text_lower:
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🛍 Открыть магазин",
                                     web_app=WebAppInfo(url=FRONT_URL))
            ]]),
        )
        return
    if "о компании" in text_lower:
        await update.message.reply_text("ℹ️ DK PROduct — ваш надёжный партнёр.")
        return
    if "группа вконтакте" in text_lower:
        await update.message.reply_text(
            "📣 Наша группа: https://vk.com/dk_pro_tuning?from=groups"
        )
        return
    if "пригласить друга" in text_lower:
        await update.message.reply_text(
            "🙋‍♂️ Приглашайте друзей: https://t.me/DK_PROduct_bot"
        )
        return

    if not query:
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    # ---------- INTENT ----------
    forced = ctx.user_data.get("forced_intent")
    intent, conf = (forced, 1.0) if forced else detect_intent(query)

    if conf < 0.6 and not forced:
        kb = InlineKeyboardMarkup([[
            InlineKeyboardButton("🔍 Ищу товар", callback_data="INTENT_PRODUCT"),
            InlineKeyboardButton("❓ Вопрос",     callback_data="INTENT_FAQ"),
        ]])
        await update.message.reply_text("Что именно нужно найти?", reply_markup=kb)
        return

    # ==============================================================
    #                       PRODUCT SEARCH
    # ==============================================================
    if intent == "PRODUCT":
        # 1) модель «2101-07»
        model_match = re.search(r"\b\d{4}-\d{2}\b", text_lower)
        if model_match:
            try:
                async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                    async with sess.get(
                        f"{API_URL}/products", params={"q": model_match.group(0)}
                    ) as resp:
                        resp.raise_for_status()
                        products = await resp.json()
            except Exception:
                logging.exception("API request failed [model]")
                await update.message.reply_text(
                    "Сервис временно недоступен, попробуйте позже 🙏"
                )
                return
            if products:
                scored = [
                    (
                        fuzzy(query, p["name"]) * 0.7 +
                        (len(tokens(query) & tokens(p["name"])) /
                         max(len(tokens(p["name"])), 1)) * 0.3,
                        p,
                    )
                    for p in products[:5]
                ]
                scored.sort(key=lambda x: x[0], reverse=True)
                best_score, best_prod = scored[0]
                if best_score >= 0.6:
                    txt, kb = build_product_message(best_prod)
                    await update.message.reply_text(txt, reply_markup=kb)
                    return
                if best_score >= 0.4:
                    buttons = [InlineKeyboardButton(
                        p["name"],
                        web_app=WebAppInfo(
                            url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}"
                        ),
                    ) for _, p in scored[:3]]
                    await update.message.reply_text(
                        "Нашёл несколько вариантов:",
                        reply_markup=InlineKeyboardMarkup([buttons]),
                    )
                    return

        # 2) общий поиск
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            logging.exception("API request failed [general]")
            await update.message.reply_text(
                "Сервис временно недоступен, попробуйте позже 🙏"
            )
            return

        # 3) fallback — загружаем всё
        if not products:
            try:
                async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                    async with sess.get(f"{API_URL}/products") as resp_all:
                        resp_all.raise_for_status()
                        products = await resp_all.json()
            except Exception:
                logging.exception("API request failed [all]")
                products = []

        # 4) сортируем fuzzy
        if products:
            scored = []
            for p in products:
                score = (
                    fuzzy(query, p["name"]) * 0.7 +
                    (len(tokens(query) & tokens(p["name"])) /
                     max(len(tokens(p["name"])), 1)) * 0.3
                )
                scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            best_score, best_prod = scored[0]

            if best_score >= 0.6:
                txt, kb = build_product_message(best_prod)
                await update.message.reply_text(txt, reply_markup=kb)
                return
            if best_score >= 0.4:
                buttons = [InlineKeyboardButton(
                    p["name"],
                    web_app=WebAppInfo(
                        url=f"{FRONT_URL.rstrip('/')}/product/{p['id']}"
                    ),
                ) for _, p in scored[:3]]
                await update.message.reply_text(
                    "Возможно, вы имели в виду:",
                    reply_markup=InlineKeyboardMarkup([buttons]),
                )
                return

        # 5) доп-поиск по type  (если alias заменил слово «паук» на «коллектор») ★ NEW
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products") as resp_all:
                    resp_all.raise_for_status()
                    all_products = await resp_all.json()
            type_matches = [p for p in all_products
                            if query.lower() in (p.get("type", "") or "").lower()]
            if type_matches:
                txt, kb = build_product_message(type_matches[0])
                await update.message.reply_text(txt, reply_markup=kb)
                return
        except Exception:
            logging.exception("API request failed [type search]")

        await update.message.reply_text(
            "Не найдено 😔 Попробуйте изменить запрос или уточнить модель."
        )
        return  # завершили PRODUCT

    # ==============================================================
    #                          FAQ SEARCH
    # ==============================================================
    if intent == "FAQ":
        faqs = []
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                    resp.raise_for_status()
                    faqs = await resp.json()
                if not faqs:
                    async with sess.get(f"{API_URL}/faq") as resp_all:
                        resp_all.raise_for_status()
                        faqs = await resp_all.json()
        except Exception:
            logging.exception("FAQ API error")

        best_faq, best_ratio = None, 0.0
        for f in faqs:
            r = SequenceMatcher(None, query, f["question"].lower()).ratio()
            if r > best_ratio:
                best_ratio, best_faq = r, f
        if best_faq and best_ratio >= 0.55:        # ★ MOD — 0.55
            await update.message.reply_text(best_faq["answer"])
            return

        query_toks = tokens(query)
        best_kw, best_count = None, 0
        for f in faqs:
            inter = query_toks & tokens(f["question"])
            if len(inter) > best_count:
                best_count, best_kw = len(inter), f
        if best_kw and best_count >= 2:
            await update.message.reply_text(best_kw["answer"])
            return

        await update.message.reply_text(
            "Не нашёл ответа 😔 Передаю вопрос менеджеру."
        )
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                await sess.post(f"{API_URL}/questions", json={"question": text})
        except Exception:
            logging.exception("Failed to send to manager")
        return


# ─── main() ──────────────────────────────────────────────────────
def main() -> None:
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .defaults(Defaults(parse_mode=constants.ParseMode.HTML))
        .build()
    )

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CallbackQueryHandler(cb_intent, pattern=r"^INTENT_"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logging.info("Bot started")
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()
