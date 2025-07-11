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

USER_SEARCH_RESULTS = {}

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

BOT_TOKEN    = os.getenv("BOT_TOKEN")
API_URL      = os.getenv("API_URL")
FRONT_URL    = os.getenv("FRONT_URL")
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10)

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

def get_list_from_ranked(res):
    print('DEBUG: get_list_from_ranked called, initial type:', type(res))
    while isinstance(res, tuple):
        print('DEBUG: get_list_from_ranked: unwrapping tuple...')
        res = res[0]
    print('DEBUG: get_list_from_ranked result type:', type(res))
    return res

async def send_product_hint(obj) -> None:
    print('DEBUG: send_product_hint called')
    hint_text = (
        "Если я не нашёл интересующий вас товар, попробуйте задать вопрос точнее, или вы можете найти конкретно то, что вам нужно в нашем <b>магазине</b>!"
    )
    hint_kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛍 Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
    ])
    if hasattr(obj, "message") and obj.message:
        await obj.message.reply_text(hint_text, reply_markup=hint_kb)
    elif hasattr(obj, "reply_text"):
        await obj.reply_text(hint_text, reply_markup=hint_kb)

async def find_model_card_link(query: str) -> tuple[str, str] | None:
    print('DEBUG: find_model_card_link called')
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/model_cards") as resp:
                if not resp.ok:
                    print('DEBUG: find_model_card_link: response not ok')
                    return None
                cards = await resp.json()
    except Exception as e:
        print('DEBUG: find_model_card_link: exception', e)
        logging.warning("Failed to fetch model_cards: %s", e)
        return None
    normalized_query = re.sub(r"[^\wа-я0-9]+", "", query.lower())
    for card in cards:
        for model in card.get("models", []):
            model_norm = re.sub(r"[^\wа-я0-9]+", "", model.lower())
            if model_norm and model_norm in normalized_query:
                print('DEBUG: find_model_card_link: match found')
                return (card.get("label", ""), ",".join(card.get("models", [])))
    print('DEBUG: find_model_card_link: no match')
    return None

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    print('DEBUG: cmd_start called')
    await update.message.reply_text(
        "Добро пожаловать в DK PROduct! 👋\n\n"
        "Я помогу вам найти нужный товар по запросу — просто напишите, что ищете, например: «глушитель 2112» или «паук 2110-2112».\n\n"
        "Также вы можете задать любой вопрос по подбору запчастей или работе магазина — я найду для вас ответ или передам вопрос менеджеру.\n\n"
        "Пользуйтесь меню ниже для быстрого доступа к функциям 👇",
        reply_markup=MAIN_MENU,
    )

def match_exact_substr(query, name):
    q = re.sub(r"[^\w\dа-яё-]+", "", query.lower().replace("ё", "е"))
    n = re.sub(r"[^\w\dа-яё-]+", "", name.lower().replace("ё", "е"))
    return q in n

async def handle_main_menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    print('DEBUG: handle_main_menu called')
    await update.callback_query.message.reply_text(
        "Выберите пункт меню:",
        reply_markup=MAIN_MENU
    )
    await update.callback_query.answer()

async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    print('DEBUG: handle_text called')
    text  = update.message.text or ""
    query = text.strip()
    text_lower = query.lower()
    print('DEBUG: handle_text: received text:', query)

    if "открыть магазин" in text_lower:
        print('DEBUG: handle_text: Открыть магазин')
        await update.message.reply_text(
            "🚀 Перейдите в магазин:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🛍Открыть магазин", web_app=WebAppInfo(url=FRONT_URL))]
            ]),
        )
        return
    if "поиск товара" in text_lower:
        print('DEBUG: handle_text: Поиск товара')
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
        print('DEBUG: handle_text: О компании')
        await update.message.reply_text(
            "ℹ️ DK PROduct — это ваш надёжный партнёр по запчастям и аксессуарами."
        )
        return
    if "группа вконтакте" in text_lower:
        print('DEBUG: handle_text: Группа ВКонтакте')
        await update.message.reply_text(
            "📣 Наша группа: https://vk.com/dk_pro_tuning?from=groups"
        )
        return
    if "пригласить друга" in text_lower:
        print('DEBUG: handle_text: Пригласить друга')
        await update.message.reply_text(
            "🙋‍♂️ Приглашайте друзей по ссылке:\nhttps://t.me/DK_PROduct_bot"
        )
        return

    if not query:
        print('DEBUG: handle_text: пустой запрос')
        await update.message.reply_text("Напишите, пожалуйста, запрос.")
        return

    model_match = re.search(r"\b\d{4}-\d{2}\b", text_lower)
    if model_match:
        print('DEBUG: handle_text: model_match:', model_match.group(0))
        q_model = model_match.group(0)
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products", params={"q": q_model}) as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            print('DEBUG: handle_text: Exception in model search')
            logging.exception("API request failed [search by model]")
            await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
            return

        if products:
            print('DEBUG: handle_text: products found by model:', len(products))
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

    print('DEBUG: handle_text: General product search')
    products = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products", params={"q": query}) as resp:
                resp.raise_for_status()
                products = await resp.json()
    except Exception:
        print('DEBUG: handle_text: Exception in general search')
        logging.exception("API request failed [general search]")
        await update.message.reply_text("Сервис временно недоступен, попробуйте позже 🙏")
        return

    if not products:
        print('DEBUG: handle_text: No products found, loading all')
        try:
            async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
                async with sess.get(f"{API_URL}/products") as resp:
                    resp.raise_for_status()
                    products = await resp.json()
        except Exception:
            print('DEBUG: handle_text: Exception in fallback load all')
            logging.exception("API request failed [fallback load all]")
            products = []

    if products:
        print('DEBUG: handle_text: Products before filter:', len(products))
        filtered_products = [p for p in products if match_exact_substr(query, p["name"])]
        print('DEBUG: handle_text: Filtered products:', len(filtered_products))
        if filtered_products:
            products = filtered_products

    if products:
        print('DEBUG: handle_text: Products after filter:', len(products))
        q_toks = tokenize(query)
        exact_name = [p for p in products if q_toks.issubset(tokenize(p["name"]))]
        print('DEBUG: handle_text: exact_name:', len(exact_name))
        pool = exact_name if exact_name else products
        print('DEBUG: handle_text: pool before get_list_from_ranked:', type(pool))
        pool = get_list_from_ranked(pool)
        print('DEBUG: handle_text: pool after get_list_from_ranked:', type(pool))
        best_prod, best_score = _rank_products(query, pool)
        print('DEBUG: handle_text: best_score:', best_score)

        if best_score >= 0.6:
            print('DEBUG: handle_text: Processing all_ranked for score >= 0.6')
            all_ranked = _rank_products(query, pool, k=len(pool), return_scores=False)
            all_ranked = get_list_from_ranked(all_ranked)
            if not isinstance(all_ranked, list):
                print('DEBUG: all_ranked NOT a list, re-unwrapping...')
                all_ranked = get_list_from_ranked(all_ranked)
            print('DEBUG: all_ranked type:', type(all_ranked))
            print('DEBUG: all_ranked repr:', repr(all_ranked))
            user_id = update.effective_user.id
            USER_SEARCH_RESULTS[user_id] = {"products": all_ranked, "query": query}

            count = len(all_ranked)
            print('DEBUG: all_ranked count:', count)
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
                print('DEBUG: Iterating product:', prod.get("name"))
                txt, kb = build_product_message(prod)
                await update.message.reply_text(txt, reply_markup=kb)

            if len(all_ranked) > 3:
                remaining = len(all_ranked) - 3
                btn = InlineKeyboardMarkup([
                    [InlineKeyboardButton(f"Показать ещё ({remaining})", callback_data=f"showmore_{user_id}_3")],
                    [InlineKeyboardButton("Вернуться в меню", callback_data="main_menu")]
                ])
                await update.message.reply_text(f"<b>Показать ещё подходящие товары ({remaining})?</b>", reply_markup=btn)
                return
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
            print('DEBUG: handle_text: Processing top3 for score >= 0.4')
            top3 = _rank_products(query, pool, k=3, return_scores=False)
            top3 = get_list_from_ranked(top3)
            if not isinstance(top3, list):
                print('DEBUG: top3 NOT a list, re-unwrapping...')
                top3 = get_list_from_ranked(top3)
            print('DEBUG: top3 type:', type(top3))
            print('DEBUG: top3 repr:', repr(top3))
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

    print('DEBUG: handle_text: Поиск по типу')
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/products") as resp:
                resp.raise_for_status()
                all_products = await resp.json()
        type_matches = [p for p in all_products if query in p.get("type", "").lower()]
        print('DEBUG: handle_text: type_matches:', len(type_matches))
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
        print('DEBUG: handle_text: Exception in type search')
        logging.exception("API request failed [type search]")

    print('DEBUG: handle_text: Поиск по FAQ')
    faqs = []
    try:
        async with aiohttp.ClientSession(timeout=HTTP_TIMEOUT) as sess:
            async with sess.get(f"{API_URL}/faq", params={"q": query}) as resp:
                resp.raise_for_status()
                faqs = await resp.json()
                if faqs:
                    print('DEBUG: handle_text: FAQ found')
                    await update.message.reply_text(faqs[0]["answer"])
                    return
            async with sess.get(f"{API_URL}/faq") as resp:
                resp.raise_for_status()
                faqs = await resp.json()
    except Exception:
        print('DEBUG: handle_text: Exception in FAQ')
        logging.exception("FAQ API error")

    best_faq, best_ratio = None, 0.0
    for f in faqs:
        r = SequenceMatcher(None, query.lower(), f["question"].lower()).ratio()
        if r > best_ratio:
            best_ratio, best_faq = r, f
    print('DEBUG: handle_text: best_faq ratio:', best_ratio)
    if best_faq and best_ratio >= 0.65:
        await update.message.reply_text(best_faq["answer"])
        return

    def keywords(s): return set(re.findall(r"[a-zа-я0-9\\-]+", s.lower()))
    query_words = keywords(query)
    faq_matches = []
    for idx, f in enumerate(faqs):
        faq_words = keywords(f["question"])
        inter = query_words & faq_words
        if len(inter) >= 2:
            faq_matches.append((len(inter), idx, f))

    print('DEBUG: handle_text: faq_matches:', len(faq_matches))
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

    print('DEBUG: handle_text: escalate to менеджеру')
    await update.message.reply_text("Передаю вопрос менеджеру 👨‍🔧")

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
        print('DEBUG: handle_text: Exception send to manager', e)
        logging.exception("Не удалось отправить вопрос менеджеру в чат: %s", e)

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
        print('DEBUG: handle_text: Exception send question to manager API')
        logging.exception("Failed to send question to manager API")

def _rank_products(query: str, products: list[dict], *, k: int | None = 1, return_scores: bool = True):
    print('DEBUG: _rank_products called')
    q_toks = tokenize(query)
    scored: list[tuple[float, dict]] = []
    for p in products:
        prod_toks = tokenize(p["name"]) | tokenize(p.get("model_compat", ""))
        coverage = len(q_toks & prod_toks) / (len(q_toks) or 1)
        score = fuzzy(query, p["name"]) * 0.4 + coverage * 0.6
        scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    if k == 1:
        print('DEBUG: _rank_products: return k==1')
        return scored[0][1], scored[0][0]
    top = [p for _, p in scored[:k]]
    print('DEBUG: _rank_products: return', ('tuple', top, None) if not return_scores else top)
    return (top, None) if not return_scores else top

async def handle_show_more(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    print('DEBUG: handle_show_more called')
    query = update.callback_query
    data = query.data
    m = re.match(r"showmore_(\d+)_(\d+)", data)
    if not m:
        print('DEBUG: handle_show_more: bad callback data')
        await query.answer("Ошибка данных.")
        return
    user_id = int(m.group(1))
    offset = int(m.group(2))
    data_obj = USER_SEARCH_RESULTS.get(user_id, {})
    products = data_obj.get("products", [])
    orig_query = data_obj.get("query", "")

    await query.edit_message_reply_markup(reply_markup=None)
    for prod in products[offset:offset+3]:
        print('DEBUG: handle_show_more: Iterating product:', prod.get("name"))
        txt, kb = build_product_message(prod)
        await query.message.reply_text(txt, reply_markup=kb)
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
        await query.message.reply_text(
            "Вы можете вернуться в главное меню 👇",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Вернуться в меню", callback_data="main_menu")]
            ])
        )
    await query.answer()
    
def main() -> None:
    print('DEBUG: main called')
    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .defaults(Defaults(parse_mode=constants.ParseMode.HTML))
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_show_more, pattern=r"^showmore_\d+_\d+$"))
    app.add_handler(CallbackQueryHandler(handle_main_menu, pattern=r"^main_menu$"))
    logging.info("Bot started")
    app.run_polling(allowed_updates=["message", "callback_query"])

if __name__ == "__main__":
    main()
