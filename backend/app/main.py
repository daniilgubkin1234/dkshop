from fastapi import FastAPI, status, Query, Path, UploadFile, File, HTTPException, Depends, Response, Cookie, Request
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from .db import engine, get_db
from .models import (
    Product, FAQ, Question, Order, OrderCreate,
    FooterLink, ModelCard, StaticPage,
    CompanyInfo, CartItem, AdminUser, User
)
from sqlalchemy import or_, func, delete 
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError
from passlib.hash import argon2
import shutil
import uuid
import os
import requests
from pydantic import BaseModel
from init_data_py import InitData
import datetime
from typing import Optional
from collections import Counter


app = FastAPI(title="DK API")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
SECRET_KEY = os.getenv("ADMIN_SECRET", "dev_secret_!change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://dkshopbot.ru",
        "https://t.me",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(request: Request, access_token: str = Cookie(None), db: Session = Depends(get_db)):
    try:
        print("COOKIES:", request.cookies)
        print("COOKIE access_token:", access_token)
        if not access_token:
            print("Нет access_token в куках!")
            raise HTTPException(401, "Not authenticated")
        
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        print("JWT PAYLOAD:", payload)
        user_id = int(payload.get("sub"))
        is_super = payload.get("is_super")
        
        user = db.get(AdminUser, user_id)
        print("ADMIN in DB:", user)
        if not user:
            print("Не найден админ с id:", user_id)
            raise HTTPException(401, "Not found")
        return user
        
    except JWTError as e:
        print("JWT ERROR:", e)
        raise HTTPException(401, "Invalid token")
    except Exception as e:
        print(f"Ошибка в get_current_admin: {e}")
        raise HTTPException(500, "Internal server error")

def super_required(user=Depends(get_current_admin)):
    if not user.is_super:
        raise HTTPException(403, "Super admin only")
    return user

def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.query_params.get("user_id")
    username = request.query_params.get("username")
    user = None
    if user_id:
        user = db.exec(select(User).where(User.id == int(user_id))).first()
    elif username:
        user = db.exec(select(User).where(User.username == username)).first()
    return user
# --- Admin Login / Logout ---
class AdminLoginIn(BaseModel):
    username: str
    password: str


@app.get("/user/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user

@app.post("/admin/login")
def admin_login(body: AdminLoginIn, response: Response, db: Session = Depends(get_db)):
    try:
        print("===> ЛОГИН: ", repr(body.username), "ПАРОЛЬ: ", repr(body.password))
        user = db.exec(select(AdminUser).where(AdminUser.username == body.username)).first()
        print("===> НАЙДЕН В БД: ", user)
        
        if not user:
            print("===> Нет такого пользователя в БД!")
            raise HTTPException(401, "Invalid credentials")
        
        # Проверяем пароль с обработкой ошибок
        try:
            password_valid = argon2.verify(body.password, user.password_hash)
        except Exception as e:
            print(f"===> Ошибка проверки пароля: {e}")
            password_valid = False
            
        if not password_valid:
            print("===> Пароль не совпал!")
            raise HTTPException(401, "Invalid credentials")

        print("===> АВТОРИЗАЦИЯ УСПЕШНА")

        access_token = create_access_token({
            "sub": str(user.id),
            "is_super": user.is_super
        })
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES*60
        )
        return {
            "ok": True,
            "user": {"id": user.id, "username": user.username, "is_super": user.is_super}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"===> КРИТИЧЕСКАЯ ОШИБКА В admin_login: {e}")
        raise HTTPException(500, f"Internal server error: {str(e)}")
    


# ДОБАВИТЬ ПОСЛЕ ФУНКЦИИ admin_login
@app.post("/admin/reset")
def reset_admin_passwords(db: Session = Depends(get_db)):
    """Временный эндпоинт для сброса паролей администраторов"""
    try:
        # Удаляем всех администраторов
        db.exec(delete(AdminUser))
        
        # Создаем нового суперадмина
        admin = AdminUser(
            username="admin",
            password_hash=argon2.hash("admin123"),
            is_super=True,
            created_at=datetime.datetime.now()
        )
        db.add(admin)
        db.commit()
        
        return {
            "status": "passwords reset", 
            "admin_created": True,
            "credentials": {"username": "admin", "password": "admin123"}
        }
    except Exception as e:
        raise HTTPException(500, f"Reset failed: {str(e)}")

@app.get("/admin/debug")
def admin_debug(db: Session = Depends(get_db)):
    """Диагностический эндпоинт"""
    admins = db.exec(select(AdminUser)).all()
    return {
        "admin_count": len(admins),
        "admins": [
            {
                "id": a.id,
                "username": a.username, 
                "password_hash_length": len(a.password_hash) if a.password_hash else 0,
                "is_super": a.is_super
            } for a in admins
        ]
    }
@app.get("/admin/me")
def get_current_me(user=Depends(get_current_admin)):
    return {
        "id": user.id,
        "username": user.username,
        "is_super": user.is_super
    }
@app.post("/admin/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}

# --- Static files ---
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")),
    name="static"
)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    new_name = f"{uuid.uuid4()}.{ext}"
    out_path = os.path.join(UPLOAD_DIR, new_name)
    with open(out_path, "wb") as out_file:
        shutil.copyfileobj(file.file, out_file)
    url = f"https://dkshopbot.ru/static/uploads/{new_name}"
    return JSONResponse({"url": url})

@app.on_event("startup")
def on_startup() -> None:
    SQLModel.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}

# --- Auth via Telegram WebApp initData ---
class LoginRequest(BaseModel):
    initData: str

@app.post("/login")
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    init_data = InitData.parse(body.initData)
    if not init_data.validate(BOT_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid auth data")
    user_obj = init_data.user
    try:
        user_data = user_obj.model_dump()
    except Exception:
        try:
            user_data = user_obj.dict()
        except Exception:
            user_data = vars(user_obj)
    user = db.get(User, user_data["id"])
    if not user:
        user = User(
            id=user_data["id"],
            username=user_data.get("username"),
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name"),
            # phone можно не трогать — из Telegram не приходит
        )
        db.add(user)
    else:
        # Обновить username, first_name, last_name если вдруг изменились
        user.username = user_data.get("username")
        user.first_name = user_data.get("first_name", "")
        user.last_name = user_data.get("last_name")
        db.add(user)
    db.commit()
    db.refresh(user)
    return {"status": "ok", "user": user_data}

# --- Products CRUD ---
@app.get("/products")
def list_products(
    q: str | None = None, 
    wholesale: bool = False,
    request: Request = None,
    db: Session = Depends(get_db)
):
    user = get_current_user(request, db)
    with Session(engine) as session:
        stmt = select(Product)
        # Фильтр по оптовым
        if wholesale:
            if not user or not getattr(user, "is_wholesale", False):
                raise HTTPException(403, "Нет доступа к оптовому каталогу")
            stmt = stmt.where(Product.is_wholesale == True)
        if q:
            tokens = q.lower().split()
            cleaned = [tok.replace("-", "") for tok in tokens]
            stmt = stmt.where(
                or_(
                    *(
                        or_(
                            Product.name.ilike(f"%{tok}%"),
                            func.replace(Product.model_compat, "-", "").ilike(f"%{tok}%")
                        )
                        for tok in cleaned
                    )
                )
            )
        products = session.exec(stmt).all()

        # --- ДОБАВЛЯЕМ персональные цены ---
        result = []
        user_prices = getattr(user, "wholesale_prices", {}) if user else {}
        # Если почему-то wholesale_prices int-ключи, приводим к строке
        user_prices = {str(k): v for k, v in (user_prices or {}).items()}

        for p in products:
            d = p.dict()
            if user and user_prices:
                if str(p.id) in user_prices:
                    d["personal_price"] = user_prices[str(p.id)]
            result.append(d)
        return result

@app.get("/products/{product_id}")
def get_product(
    product_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    user = get_current_user(request, db)
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        data = product.dict()
        # Добавим персональную цену, если пользователь — оптовик и она есть
        user_prices = getattr(user, "wholesale_prices", {}) if user else {}
        user_prices = {str(k): v for k, v in (user_prices or {}).items()}
        if user and getattr(user, "is_wholesale", False):
            if str(product_id) in user_prices:
                data["personal_price"] = user_prices[str(product_id)]
        return JSONResponse(content=data)

@app.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(item: Product):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

@app.patch("/products/{product_id}", response_model=Product)
def update_product(product_id: int, item: Product):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        update_data = item.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
        session.add(product)
        session.commit()
        session.refresh(product)
        return product

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        session.delete(product)
        session.commit()
        return {"ok": True}

# --- Orders ---
@app.post("/orders")
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # Найти пользователя по user_id
    user = db.get(User, order.user_id)
    is_wholesale = user.is_wholesale if user else False

    # Создаем Order (SQLModel) для сохранения в БД
    order_obj = Order(
        user_id=order.user_id,
        name=order.name,
        phone=order.phone,
        items=[item.dict() for item in order.items],
        is_wholesale=is_wholesale
    )

    with Session(engine) as session:
        session.add(order_obj)
        session.commit()
        session.refresh(order_obj)

    bot_token = os.getenv("BOT_TOKEN")
    ACCOUNTANT_CHAT_ID = os.getenv("ACCOUNTANT_CHAT_ID", None)

    # Отправка клиенту
    if bot_token:
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": order.user_id,
                    "text": (
                        f"✅ Ваш заказ #{order_obj.id} принят!\n\n"
                        f"<b>Имя:</b> {order.name}\n"
                        f"<b>Телефон:</b> {order.phone}\n"
                        f"<b>Позиций:</b> {len(order.items)}\n"
                        f"📦 Ожидайте звонка для подтверждения.\n"
                        f"\n"
                        f"<b>Подробную информацию</b> о заказе можно посмотреть в вашем личном кабинете.\n"
                    ),
                    "parse_mode": "HTML"
                },
                timeout=5
            )
        except Exception as e:
            print("Ошибка при отправке сообщения в Telegram:", e)
    # --- УВЕДОМЛЕНИЕ БУХГАЛТЕРУ ---
    if bot_token and ACCOUNTANT_CHAT_ID and is_wholesale:
        try:
            print(">>> Попытка отправки оптового заказа в Telegram...")
            print(">>> bot_token:", bot_token)
            print(">>> ACCOUNTANT_CHAT_ID:", ACCOUNTANT_CHAT_ID)
            user_link = ""
            if user:
                username = getattr(user, "username", None)
                first_name = getattr(user, "first_name", None)
                user_link = f"@{username or first_name or ''}"
            else:
                user_link = "(Не найден)"
            msg_text = (
                f"💼 <b>Новый оптовый заказ</b>\n"
                f"ID заказа: <b>#{order_obj.id}</b>\n"
                f"Имя: <b>{order.name}</b>\n"
                f"Телефон: <b>{order.phone}</b>\n"
                f"Клиент: <a href='tg://user?id={order.user_id}'>{user_link}</a>\n"
                f"Позиций: <b>{len(order.items)}</b>\n"
                f"Состав:\n" + '\n'.join(
                    [f"- {it['name']} × {it['quantity']}" for it in order.items]
                ) + "\n"
                f"Время: {order_obj.created_at.strftime('%d.%m.%Y %H:%M')}\n"
            )
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": ACCOUNTANT_CHAT_ID,
                    "text": msg_text,
                    "parse_mode": "HTML"
                },
                timeout=5
            )
        except Exception as e:
            print("Ошибка при отправке сообщения бухгалтеру:", e)
    return {"status": "ok", "order_id": order_obj.id}
@app.get("/orders/by-phone")
def orders_by_phone(phone: str):
    normalized = phone.strip().replace(" ", "").replace("-", "").lstrip("+").replace("+7", "8").replace("+", "")
    with Session(engine) as session:
        stmt = select(Order).where(
            func.replace(func.replace(Order.phone, ' ', ''), '-', '').ilike(f"%{normalized}%")
        ).order_by(Order.created_at.desc())
        return session.exec(stmt).all()

@app.get("/orders/by-user")
def orders_by_user(user_id: int, db: Session = Depends(get_db)):
    orders = db.exec(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    ).all()
    # Собираем все product_id из всех заказов пользователя
    all_ids = {item.get('product_id') for o in orders for item in o.items}
    prods = db.exec(select(Product).where(Product.id.in_(all_ids))).all()
    prod_map = {p.id: {"name": p.name, "price": p.price} for p in prods}
    enriched = []
    for o in orders:
        enriched_items = []
        for it in o.items:
            prod = prod_map.get(it.get('product_id'))
            enriched_items.append({
                "product_id": it.get('product_id'),
                "quantity": it.get('quantity', 1),
                "name": it.get('name') or (prod["name"] if prod else f"#{it.get('product_id')}"),
                "price": it.get('price') if it.get('price') is not None else (prod["price"] if prod else 0)
            })
        od = o.dict()
        od['items'] = enriched_items
        enriched.append(od)
    return enriched

# --- FAQ CRUD ---
@app.get("/faq")
def search_faq(q: str = Query("*", min_length=1)):
    with Session(engine) as session:
        stmt = select(FAQ)
        if q != "*":
            stmt = stmt.where(FAQ.question.ilike(f"%{q}%"))
        return session.exec(stmt).all()

@app.post("/faq", response_model=FAQ)
def create_faq(item: FAQ, user=Depends(get_current_admin)):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

@app.patch("/faq/{faq_id}", response_model=FAQ)
def update_faq(faq_id: int, item: FAQ, user=Depends(get_current_admin)):
    with Session(engine) as session:
        faq = session.get(FAQ, faq_id)
        if not faq:
            raise HTTPException(status_code=404, detail="FAQ not found")
        faq.question = item.question
        faq.answer = item.answer
        session.add(faq)
        session.commit()
        session.refresh(faq)
        return faq

@app.delete("/faq/{faq_id}")
async def delete_faq(faq_id: int, user=Depends(get_current_admin)):
    with Session(engine) as session:
        faq = session.get(FAQ, faq_id)
        if faq:
            session.delete(faq)
            session.commit()
    return {"ok": True}

# --- Admin Orders ---
@app.get("/admin/orders")
def get_orders(request: Request, user=Depends(get_current_admin)):
    with Session(engine) as s:
        orders = s.exec(select(Order).order_by(Order.created_at.desc())).all()
        # Собираем все product_id из всех заказов (учитываем старый/новый формат)
        all_ids = {item.get('product_id') for o in orders for item in o.items}
        prods = s.exec(select(Product).where(Product.id.in_(all_ids))).all()
        prod_map = {p.id: {"name": p.name, "price": p.price} for p in prods}
        enriched = []
        for o in orders:
            enriched_items = []
            for it in o.items:
                prod = prod_map.get(it.get('product_id'))
                enriched_items.append({
                    "product_id": it.get('product_id'),
                    "quantity": it.get('quantity', 1),
                    "name": it.get('name') or (prod["name"] if prod else f"#{it.get('product_id')}"),
                    "price": it.get('price') if it.get('price') is not None else (prod["price"] if prod else 0)
                })
            od = o.dict()
            od['items'] = enriched_items
            enriched.append(od)
        return enriched

@app.patch("/admin/orders/{order_id}")
def update_order_status(order_id: int, new_status: str, user=Depends(get_current_admin)):
    with Session(engine) as s:
        order = s.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        old_status = order.status
        order.status = new_status
        s.add(order)
        s.commit()
         # === Уведомляем бухгалтерию ===
        bot_token = os.getenv("BOT_TOKEN")
        ACCOUNTANT_CHAT_ID = os.getenv("ACCOUNTANT_CHAT_ID")
        ACCOUNTANT_TOPIC_ID = os.getenv("ACCOUNTANT_TOPIC_ID")
        # Отправлять только для оптовых заказов (или по желанию — для всех)
        if bot_token and ACCOUNTANT_CHAT_ID and ACCOUNTANT_TOPIC_ID and getattr(order, "is_wholesale", False):
            try:
                user_info = s.get(User, order.user_id)
                msg = (
                    f"🔄 <b>Статус заказа изменён</b>\n"
                    f"ID заказа: <b>#{order.id}</b>\n"
                    f"Имя: <b>{order.name}</b>\n"
                    f"Телефон: <b>{order.phone}</b>\n"
                    f"Клиент: <a href='tg://user?id={order.user_id}'>@{getattr(user_info, 'username', '') or getattr(user_info, 'first_name', '')}</a>\n"
                    f"Старый статус: <b>{old_status}</b>\n"
                    f"Новый статус: <b>{new_status}</b>\n"
                    f"Время: {order.created_at.strftime('%d.%m.%Y %H:%M')}\n"
                )
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": int(ACCOUNTANT_CHAT_ID),
                        "message_thread_id": int(ACCOUNTANT_TOPIC_ID),
                        "text": msg,
                        "parse_mode": "HTML"
                    },
                    timeout=5
                )
            except Exception as e:
                print("Ошибка при отправке статуса заказа в топик:", e)
        return order

@app.delete("/admin/orders/{order_id}")
def delete_order(order_id: int, user=Depends(get_current_admin)):
    with Session(engine) as s:
        order = s.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        s.delete(order)
        s.commit()
        return {"ok": True}

# --- Admin Footer Links ---
class FooterLinkCreate(BaseModel):
    title: str
    url: str
    icon: str | None = None

class FooterLinkRead(BaseModel):
    id: int
    title: str
    url: str
    icon: str | None = None
    class Config:
        orm_mode = True

@app.get("/footer", response_model=list[FooterLinkRead])
def public_footer(db: Session = Depends(get_db)):
    return db.query(FooterLink).all()

@app.get("/admin/footer", response_model=list[FooterLinkRead])
def admin_footer_db(db: Session = Depends(get_db), user=Depends(get_current_admin)):
    return db.query(FooterLink).all()

@app.post("/admin/footer", response_model=FooterLinkRead, status_code=status.HTTP_201_CREATED)
def create_footer_link(link: FooterLinkCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    obj = FooterLink(**link.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@app.patch("/admin/footer/{link_id}", response_model=FooterLinkRead)
def update_footer_link(link_id: int, link: FooterLinkCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_link = db.get(FooterLink, link_id)
    if not db_link:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in link.dict().items():
        setattr(db_link, k, v)
    db.commit()
    db.refresh(db_link)
    return db_link

@app.delete("/admin/footer/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_footer_link(link_id: int, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_link = db.get(FooterLink, link_id)
    if db_link:
        db.delete(db_link)
        db.commit()

# --- Model Cards CRUD ---
class ModelCardCreate(BaseModel):
    label: str
    models: list[str] = []
    img: str
    match_by_name: bool = True

class ModelCardRead(ModelCardCreate):
    id: int
    class Config:
        orm_mode = True

@app.get("/model_cards", response_model=list[ModelCardRead])
def public_model_cards(db: Session = Depends(get_db)):
    return db.query(ModelCard).all()

@app.get("/admin/model_cards", response_model=list[ModelCardRead])
def admin_model_cards_db(db: Session = Depends(get_db), user=Depends(get_current_admin)):
    return db.query(ModelCard).all()

@app.post("/admin/model_cards", response_model=ModelCardRead, status_code=status.HTTP_201_CREATED)
def create_model_card(card: ModelCardCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    obj = ModelCard(**card.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@app.patch("/admin/model_cards/{card_id}", response_model=ModelCardRead)
def update_model_card_db(card_id: int, card: ModelCardCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_card = db.get(ModelCard, card_id)
    if not db_card:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in card.dict(exclude_unset=True).items():
        setattr(db_card, k, v)
    db.commit()
    db.refresh(db_card)
    return db_card

@app.delete("/admin/model_cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_card_db(card_id: int, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_card = db.get(ModelCard, card_id)
    if db_card:
        db.delete(db_card)
        db.commit()

# --- Static pages (/info) ---
class StaticPageCreate(BaseModel):
    slug: str
    title: str
    content: str

class StaticPageRead(StaticPageCreate):
    id: int
    class Config: orm_mode = True

@app.get("/info", response_model=list[StaticPageRead])
def public_info(db: Session = Depends(get_db)):
    return db.query(StaticPage).all()

# --- admin CRUD ---
@app.get("/admin/info", response_model=list[StaticPageRead])
def admin_info(db: Session = Depends(get_db), user=Depends(get_current_admin)):
    return db.query(StaticPage).all()

@app.post("/admin/info", response_model=StaticPageRead, status_code=201)
def create_info(page: StaticPageCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    obj = StaticPage(**page.dict())
    db.add(obj); db.commit(); db.refresh(obj)
    return obj

@app.patch("/admin/info/{page_id}", response_model=StaticPageRead)
def update_info(page_id: int, page: StaticPageCreate, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_page = db.get(StaticPage, page_id)
    if not db_page:
        raise HTTPException(404, "Not found")
    for k, v in page.dict().items():
        setattr(db_page, k, v)
    db.commit(); db.refresh(db_page)
    return db_page

@app.delete("/admin/info/{page_id}", status_code=204)
def delete_info(page_id: int, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    db_page = db.get(StaticPage, page_id)
    if db_page:
        db.delete(db_page); db.commit()

class PhoneIn(BaseModel):
    phone: str

@app.get("/company", response_model=CompanyInfo | None)
def get_company(db: Session = Depends(get_db)):
    return db.exec(select(CompanyInfo).limit(1)).first()

@app.post("/admin/company", response_model=CompanyInfo)
def upsert_company(info: PhoneIn, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    obj = db.exec(select(CompanyInfo).limit(1)).first()
    if obj:
        obj.phone = info.phone          # update
    else:
        obj = CompanyInfo(phone=info.phone)
        db.add(obj)
    db.commit(); db.refresh(obj)
    return obj

# ---------- Cart ----------
class CartItemFull(BaseModel):
    id: int           # product_id
    name: str
    price: int
    image: str | None = None
    quantity: int
    class Config:
        from_attributes = True

def _enrich(user_id: int, db: Session) -> list[dict]:
    user = db.get(User, user_id)
    wholesale_prices = getattr(user, "wholesale_prices", {}) if user else {}
    wholesale_prices = {str(k): v for k, v in (wholesale_prices or {}).items()}
    rows = db.exec(
        select(CartItem).where(CartItem.user_id == user_id)
    ).all()
    if not rows:
        return []
    prod_ids = [r.product_id for r in rows]
    prods = {
        p.id: p for p in db.exec(
            select(Product).where(Product.id.in_(prod_ids))
        )
    }
    enriched = []
    for r in rows:
        p = prods.get(r.product_id)
        if not p:
            continue
        price = p.price
        # --- используем персональную цену ТОЛЬКО для оптовиков! ---
        if getattr(user, "is_wholesale", False) and str(p.id) in wholesale_prices:
            price = wholesale_prices[str(p.id)]
        enriched.append({
            "id": p.id,
            "name": p.name,
            "price": price,
            "image": (p.images or [None])[0],
            "quantity": r.quantity,
        })
    return enriched


@app.get("/cart", response_model=list[CartItemFull])
def get_cart(user_id: int, db: Session = Depends(get_db)):
    return _enrich(user_id, db)

class CartAdd(BaseModel):
    user_id: int
    product_id: int
    delta: int = 1                 # может быть отрицательным

@app.post("/cart", response_model=list[CartItemFull])
def add_to_cart(body: CartAdd, db: Session = Depends(get_db)):
    row = db.get(CartItem, (body.user_id, body.product_id))
    if row:
        row.quantity += body.delta
    else:
        row = CartItem(
            user_id   = body.user_id,
            product_id= body.product_id,
            quantity  = body.delta
        )
    if row.quantity <= 0:
        db.delete(row)
    else:
        row.quantity = max(1, row.quantity)
        db.add(row)
    db.commit()
    return _enrich(body.user_id, db)

@app.delete("/cart/clear", status_code=204)
def clear_cart(user_id: int, db: Session = Depends(get_db)):
    db.exec(delete(CartItem).where(CartItem.user_id == user_id))
    db.commit()

@app.get("/hits", response_model=list[Product])
def list_hits(limit: int = 12, db: Session = Depends(get_db)):
    stmt = (
        select(Product)
        .where(
            (Product.is_hit == True) | (Product.is_hit_auto == True)
        )
        .limit(limit)
    )
    return db.exec(stmt).all()

class AdminUserCreate(BaseModel):
    username: str
    password: str
    is_super: Optional[bool] = False

class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_super: Optional[bool] = None

class AdminUserRead(BaseModel):
    id: int
    username: str
    is_super: bool
    created_at: datetime.datetime
    class Config:
        orm_mode = True

# Получить список всех админов (только для супера)
@app.get("/admin/users", response_model=list[AdminUserRead])
def list_admin_users(user=Depends(super_required), db: Session = Depends(get_db)):
    return db.exec(select(AdminUser)).all()

# Создать нового админа
@app.post("/admin/users", response_model=AdminUserRead)
def create_admin_user(data: AdminUserCreate, user=Depends(super_required), db: Session = Depends(get_db)):
    if db.exec(select(AdminUser).where(AdminUser.username == data.username)).first():
        raise HTTPException(409, "Username already exists")
    obj = AdminUser(
        username=data.username,
        password_hash=argon2.hash(data.password),
        is_super=data.is_super or False
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# Изменить админа (логин, пароль, роль)
@app.patch("/admin/users/{uid}", response_model=AdminUserRead)
def update_admin_user(uid: int, data: AdminUserUpdate, user=Depends(super_required), db: Session = Depends(get_db)):
    obj = db.get(AdminUser, uid)
    if not obj:
        raise HTTPException(404, "User not found")
    if data.username:
        if db.exec(select(AdminUser).where(AdminUser.username == data.username, AdminUser.id != uid)).first():
            raise HTTPException(409, "Username already exists")
        obj.username = data.username
    if data.password:
        obj.password_hash = argon2.hash(data.password)
    if data.is_super is not None:
        obj.is_super = data.is_super
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# Удалить пользователя (самого себя нельзя)
@app.delete("/admin/users/{uid}", status_code=204)
def delete_admin_user(uid: int, user=Depends(super_required), db: Session = Depends(get_db)):
    if uid == user.id:
        raise HTTPException(400, "Нельзя удалить самого себя")
    obj = db.get(AdminUser, uid)
    if not obj:
        raise HTTPException(404, "User not found")
    db.delete(obj)
    db.commit()

@app.post("/admin/recalc_hits")
def recalc_hits(limit: int = 12, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    """Пересчитывает авто-хиты на основе продаж."""
    # 1. Считаем все product_id из заказов
    orders = db.exec(select(Order)).all()
    all_ids = []
    for order in orders:
        for item in order.items:
            all_ids.extend([item["product_id"]] * int(item["quantity"]))
    counter = Counter(all_ids)
    # 2. Берём топ-N товаров
    top_ids = [pid for pid, _ in counter.most_common(limit)]
    # 3. Сбрасываем всем is_hit_auto
    prods = db.exec(select(Product)).all()
    for p in prods:
        p.is_hit_auto = p.id in top_ids
        db.add(p)
    db.commit()
    return {"updated": top_ids}
#Оптовики 
@app.get("/admin/clients")
def list_clients(user=Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.exec(select(User)).all()

class UpdateWholesaleStatus(BaseModel):
    is_wholesale: bool

@app.patch("/admin/clients/{user_id}")
def set_wholesale_flag(
    user_id: int,
    data: UpdateWholesaleStatus,
    user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    client = db.get(User, user_id)
    if not client:
        raise HTTPException(404, "User not found")
    client.is_wholesale = data.is_wholesale
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
class UpdateWholesalePrices(BaseModel):
    wholesale_prices: dict

@app.patch("/admin/clients/{user_id}/prices")
def set_wholesale_prices(
    user_id: int,
    data: UpdateWholesalePrices,
    user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    client = db.get(User, user_id)
    if not client:
        raise HTTPException(404, "User not found")
    client.wholesale_prices = data.wholesale_prices
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
