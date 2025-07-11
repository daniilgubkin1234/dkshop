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
    CallbackQueryHandler,
    filters,
    Defaults,
    ContextTypes,
)

MANAGER_CHAT_ID = -1002721283584  # ← 

# ─── Хранилище результатов для постраничного вывода ───
USER_SEARCH_RESULTS = {}

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
        ["🔎 Поиск товара"],
        ["ℹ️ О компании", "📣 Группа Вконтакте"],
        ["🙋‍♂️ Пригласить друга"],
    ],
    resize_keyboard=True,
    one_time_keyboard=False,
)

def build_product_message(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    url  = f"{FRONT_URL.rstrip('/')}/product/{product['id']}"
    text = f"<b>{product['name']}</b>\nЦена: <b>{product['price']} ₽</b>"
    kb   = InlineKeyboardMarkup([[InlineKeyboardButton(
        "Открыть карточку", web_app=WebAppInfo(url=url)
    )]])
    return text, kb

def fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

TOKEN_RE = re.compile(r"[a-zа-яё0-9]+", re.I)
def tokenize(s: str) -> set[str]:
    return set(TOKEN_RE.findall(s.lower()))

async def send_product_hint(obj) -> None:
    hint_text = (
        "Если я не нашёл интересующий вас товар, попробуйте задать вопрос точнее, или вы можете найти конкретно то, что вам нужно в нашем <b>магазине</b>!"
    )
    hint_kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛍 Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
    ])
    # Поддержка Update и CallbackQuery
    if hasattr(obj, "message") and obj.message:
        await obj.message.reply_text(hint_text, reply_markup=hint_kb)
    elif hasattr(obj, "reply_text"):  # прямо message
        await obj.reply_text(hint_text, reply_markup=hint_kb)

async def find_model_card_link(query: str) -> tuple[str, str] | None:
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
                return (card.get("label", ""), ",".join(card.get("models", [])))
    return None

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Добро пожаловать в DK PROduct! 👋\n\n"
        "Я помогу вам найти нужный товар по запросу — просто напишите, что ищете, например: «глушитель 2112» или «паук 2110-2112».\n\n"
        "Также вы можете задать любой вопрос по подбору запчастей или работе магазина — я найду для вас ответ или передам вопрос менеджеру.\n\n"
        "Пользуйтесь меню ниже для быстрого доступа к функциям 👇",
        reply_markup=MAIN_MENU,
    )

# >>> NEW: Строгое подстрочное совпадение для поиска по названию
def match_exact_substr(query, name):
    q = re.sub(r"[^\w\dа-яё-]+", "", query.lower().replace("ё", "е"))
    n = re.sub(r"[^\w\dа-яё-]+", "", name.lower().replace("ё", "е"))
    return q in n

# >>> NEW: обработчик кнопки "Вернуться в меню"
async def handle_main_menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.message.reply_text(
        "Выберите пункт меню:",
        reply_markup=MAIN_MENU
    )
    await update.callback_query.answer()
def get_list_from_ranked(res):
    # "раскручиваем" tuple, пока не получим список (list)
    while isinstance(res, tuple):
        res = res[0]
    return res
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
    if "поиск товара" in text_lower:
        await update.message.reply_text(
            "🔎 Я могу найти любой товар по названию, коду модели или даже по вопросу!\n\n"
            "Например, вы можете написать:\n"
            "• «глушитель 2112»\n"
            "• «коллектор ваз 2107»\n"
            "• «резонатор на 2109»\n"
            "• или просто введите модель автомобиля — например, «2108»\n\n"
            "Чем точнее запрос, тем точнее будет поиск и, соответственно, ответ!\n"
            "Попробуйте задать свой вопрос, или откройте каталог для просмотра ассортимента 👇",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
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
            best_prod = _rank_products(query, products)[0]
            txt, kb = build_product_message(best_prod)
            await update.message.reply_text(txt, reply_markup=kb)
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            await send_product_hint(update)
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

    # >>> NEW: Строгая фильтрация по подстроке запроса для товаров
    if products:
        filtered_products = [p for p in products if match_exact_substr(query, p["name"])]
        if filtered_products:
            products = filtered_products
        # если фильтр ничего не дал — используем старую логику pool

    if products:
        q_toks = tokenize(query)
        exact_name = [p for p in products if q_toks.issubset(tokenize(p["name"]))]
        pool = exact_name if exact_name else products
        pool = get_list_from_ranked(pool)
        best_prod, best_score = _rank_products(query, pool)

        if best_score >= 0.6:
            # Постраничный вывод по 3 карточки с кнопкой "Показать ещё"
            all_ranked = _rank_products(query, pool, k=len(pool), return_scores=False)
            all_ranked = get_list_from_ranked(all_ranked)
            user_id = update.effective_user.id
            # -- ВАЖНО! Сохраняем и карточки, и исходный текст запроса --
            USER_SEARCH_RESULTS[user_id] = {"products": all_ranked, "query": query}

            count = len(all_ranked)
            if count == 1:
                await update.message.reply_text("По вашему запросу найден <b>1</b> товар.\n"
                                                "Нажмите <b>«Открыть карточку»</b>, чтобы узнать подробнее о товаре, посмотреть характеристики и фото.")
            elif 2 <= count <= 4:
                await update.message.reply_text(f"По вашему запросу найдено <b>{count}</b> товара.\n"
                                                "Нажмите <b>«Открыть карточку»</b>, чтобы узнать подробнее о товаре, посмотреть характеристики и фото.")
            else:
                await update.message.reply_text(f"По вашему запросу найдено <b>{count}</b> товаров.\n"
                                                "Нажмите <b>«Открыть карточку»</b>, чтобы узнать подробнее о товаре, посмотреть характеристики и фото.")
            
            for prod in all_ranked[:3]:
                txt, kb = build_product_message(prod)
                await update.message.reply_text(txt, reply_markup=kb)

            # >>> NEW: Кнопка "Показать еще" + "Вернуться в меню"
            if len(all_ranked) > 3:
                remaining = len(all_ranked) - 3
                btn = InlineKeyboardMarkup([
                    [InlineKeyboardButton(f"Показать ещё ({remaining})", callback_data=f"showmore_{user_id}_3")],
                    [InlineKeyboardButton("Вернуться в меню", callback_data="main_menu")]
                ])
                await update.message.reply_text(f"<b>Показать ещё подходящие товары ({remaining})?</b>", reply_markup=btn)
                return
            # Если карточек <= 3, выводим каталог и магазин сразу
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом <b>каталоге</b>:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            await send_product_hint(update)
            return

        if best_score >= 0.4:
            top3 = _rank_products(query, pool, k=3, return_scores=False)
            top3 = get_list_from_ranked(top3)
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
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            await send_product_hint(update)
            return

    # 3) Поиск по типу (далее логика без изменений)
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products") as resp:
                resp.raise_for_status()
                all_products = await resp.json()
        type_matches = [p for p in all_products if query in p.get("type", "").lower()]
        if type_matches:
            txt, kb = build_product_message(type_matches[0])
            await update.message.reply_text(txt, reply_markup=kb)
            model_card = await find_model_card_link(query)
            if model_card:
                label, model_val = model_card
                catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
                msg = f"Возможно, то что вы ищете находится в этом каталоге:"
                kb = InlineKeyboardMarkup([
                    [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
                ])
                await update.message.reply_text(msg, reply_markup=kb)
            await send_product_hint(update)
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
    def keywords(s): return set(re.findall(r"[a-zа-я0-9\\-]+", s.lower()))
    query_words = keywords(query)
    faq_matches = []
    for idx, f in enumerate(faqs):
        faq_words = keywords(f["question"])
        inter = query_words & faq_words
        if len(inter) >= 2:
            faq_matches.append((len(inter), idx, f))

    if faq_matches:
        faq_matches.sort(reverse=True)
        if len(faq_matches) == 1:
            await update.message.reply_text(faq_matches[0][2]["answer"])
            return
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

    # --- ОТПРАВКА ВОПРОСА В ГРУППУ ---
    try:
        user_info = f"<b>ID:</b> <code>{update.effective_user.id}</code>"
        if update.effective_user.username:
            user_info += f"\n<b>Username:</b> @{update.effective_user.username}"
        question_msg = (
            f"❓ <b>Новый вопрос от пользователя</b>\n"
            f"{user_info}\n"
            f"<b>Вопрос:</b> {text}"
        )
        await ctx.bot.send_message(
            chat_id=MANAGER_CHAT_ID,
            text=question_msg,
            parse_mode="HTML",
        )
    except Exception as e:
        logging.exception("Не удалось отправить вопрос менеджеру в чат: %s", e)

    # --- Сохраняем вопрос через API (старое поведение) ---
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

def _rank_products(query: str, products: list[dict], *, k: int | None = 1, return_scores: bool = True):
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

# --- ОБРАБОТЧИК для кнопки "Показать ещё" ---
async def handle_show_more(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    data = query.data
    m = re.match(r"showmore_(\d+)_(\d+)", data)
    if not m:
        await query.answer("Ошибка данных.")
        return
    user_id = int(m.group(1))
    offset = int(m.group(2))
    data_obj = USER_SEARCH_RESULTS.get(user_id, {})
    products = data_obj.get("products", [])
    orig_query = data_obj.get("query", "")

    await query.edit_message_reply_markup(reply_markup=None)
    # Показываем следующие 3 карточки
    for prod in products[offset:offset+3]:
        txt, kb = build_product_message(prod)
        await query.message.reply_text(txt, reply_markup=kb)
    # >>> NEW: Кнопка "Показать ещё" всегда с "Вернуться в меню"
    if offset + 3 < len(products):
        remaining = len(products) - (offset + 3)
        btn = InlineKeyboardMarkup([
            [InlineKeyboardButton(f"Показать ещё ({remaining})", callback_data=f"showmore_{user_id}_{offset+3}")],
            [InlineKeyboardButton("Вернуться в меню", callback_data="main_menu")]
        ])
        await query.message.reply_text(f"<b>Показать ещё подходящие товары ({remaining})?</b>", reply_markup=btn)
    else:
        model_card = await find_model_card_link(orig_query)
        if model_card:
            label, model_val = model_card
            catalog_url = f"{FRONT_URL.rstrip('/')}/?model={model_val}"
            msg = (
            "<b>Это все подходящие товары по вашему запросу.</b>\n"
            "Возможно, то что вы ищете находится в этом <b>каталоге</b>:"
            )
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton(label or model_val, web_app=WebAppInfo(url=catalog_url))]
            ])
            await query.message.reply_text(msg, reply_markup=kb)
        await send_product_hint(query)
        # >>> NEW: После окончания товаров обязательно выводим "Вернуться в меню"
        await query.message.reply_text(
            "Вы можете вернуться в главное меню 👇",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Вернуться в меню", callback_data="main_menu")]
            ])
        )
    await query.answer()
    

def main() -> None:
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .defaults(Defaults(parse_mode=constants.ParseMode.HTML))
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_show_more, pattern=r"^showmore_\d+_\d+$"))
    # >>> NEW: обработчик кнопки main_menu
    app.add_handler(CallbackQueryHandler(handle_main_menu, pattern=r"^main_menu$"))
    logging.info("Bot started")
    app.run_polling(allowed_updates=["message", "callback_query"])

if __name__ == "__main__":
    main()
