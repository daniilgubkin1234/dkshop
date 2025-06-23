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

# ─── Унифицированная отправка товара + подсказки ───
async def send_product_with_hint(update: Update, product: dict) -> None:
    txt, kb = build_product_message(product)
    await update.message.reply_text(txt, reply_markup=kb)
    # дополнительное сообщение-подсказка
    hint_text = (
        "Если я не нашёл интересующий вас товар, вы можете найти конкретно то, что вам нужно в нашем магазине!"
    )
    hint_kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛍 Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
    ])
    await update.message.reply_text(hint_text, reply_markup=hint_kb)

# ─── Новый помощник: Поиск подходящей карточки модели ───
async def find_model_card_link(query: str) -> tuple[str, str] | None:
    """
    Возвращает (label, model), если найдено совпадение по модели в тексте запроса.
    """
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/model_cards") as resp:
                if not resp.ok:
                    return None
                cards = await resp.json()
    except Exception as e:
        logging.warning("Failed to fetch model_cards: %s", e)
        return None

    normalized_query = re.sub(r"[^\wа-я0-9]+", "", query.lower())
    for card in cards:
        for model in card.get("models", []):
            model_norm = re.sub(r"[^\wа-я0-9]+", "", model.lower())
            if model_norm and model_norm in normalized_query:
                return (card.get("label", ""), model)
    return None

# ─── /start ───
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Добро пожаловать в DK PROduct! 👋\n\n"
        "Я помогу вам найти нужный товар по запросу — просто напишите, что ищете, например: «глушитель 2112» или «паук 2110-2112».\n\n"
        "Также вы можете задать любой вопрос по подбору запчастей или работе магазина — я найду для вас ответ или передам вопрос менеджеру.\n\n"
        "Пользуйтесь меню ниже для быстрого доступа к функциям 👇",
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
            await send_product_with_hint(update, best_prod)
            # --- Новое: выдача каталога модели ---
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
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
            await send_product_with_hint(update, best_prod)
            # --- Новое: выдача каталога модели ---
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            return
        if best_score >= 0.4:
            top3 = _rank_products(query, pool, k=3, return_scores=False)
            if isinstance(top3, tuple):  # фикс для кортежа (список, None)
                top3 = top3[0]
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
            # --- Новое: выдача каталога модели (можно убрать если не нужно после топ-3) ---
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            return

    # 3) Поиск по типу (далее логика без изменений)
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products") as resp:
                resp.raise_for_status()
                all_products = await resp.json()
        type_matches = [p for p in all_products if query in p.get("type", "").lower()]
        if type_matches:
            await send_product_with_hint(update, type_matches[0])
            # --- Новое: выдача каталога модели ---
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            return
    except Exception:
        logging.exception("API request failed [type search]")

        faqs = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            # 1. Пробуем точный поиск по API
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                resp.raise_for_status()
                faqs = await resp.json()
                if faqs:
                    await update.message.reply_text(faqs[0]["answer"])
                    return
            # 2. Если не нашли — загружаем все FAQ
            async with sess.get(f"{API_URL}/faq") as resp:
                resp.raise_for_status()
                faqs = await resp.json()
    except Exception:
        logging.exception("FAQ API error")

    # 3. Сначала поиск по SequenceMatcher
    best_faq, best_ratio = None, 0.0
    for f in faqs:
        r = SequenceMatcher(None, query.lower(), f["question"].lower()).ratio()
        if r > best_ratio:
            best_ratio, best_faq = r, f
    if best_faq and best_ratio >= 0.65:
        await update.message.reply_text(best_faq["answer"])
        return

    # 4. Далее — ключевые слова (>=2)
    def keywords(s): return set(re.findall(r"[a-zа-яё0-9\\-]+", s.lower()))
    query_words = keywords(query)
    faq_matches = []
    for idx, f in enumerate(faqs):
        faq_words = keywords(f["question"])
        inter = query_words & faq_words
        if len(inter) >= 2:
            faq_matches.append((len(inter), idx, f))

    # Если найдено хотя бы 1 хороший match — предлагаем лучший или варианты
    if faq_matches:
        faq_matches.sort(reverse=True)  # по количеству совпадений
        if len(faq_matches) == 1:
            await update.message.reply_text(faq_matches[0][2]["answer"])
            return
        # Если есть несколько — вывести топ-3 кнопками
        buttons = [
            InlineKeyboardButton(
                f[2]["question"],
                callback_data=f'faq_{f[1]}'
            )
            for f in faq_matches[:3]
        ]
        await update.message.reply_text(
            "Я нашёл несколько возможных ответов на ваш вопрос. Уточните, что вы имели в виду:",
            reply_markup=InlineKeyboardMarkup([[btn] for btn in buttons])
        )
        return

    # 5. Если ничего не нашли — эскалация менеджеру
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
