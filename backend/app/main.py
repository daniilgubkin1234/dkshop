from fastapi import FastAPI, status, Query, Path, UploadFile, File, HTTPException, Depends, Response, Cookie
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from .db import engine, get_db
from .models import (
    Product, FAQ, Question, Order,
    FooterLink, ModelCard, StaticPage,
    CompanyInfo, CartItem, AdminUser
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

def get_current_admin(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        is_super = payload.get("is_super")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    user = db.get(AdminUser, user_id)
    if not user:
        raise HTTPException(401, "Not found")
    return user

def super_required(user=Depends(get_current_admin)):
    if not user.is_super:
        raise HTTPException(403, "Super admin only")
    return user

# --- Admin Login / Logout ---
class AdminLoginIn(BaseModel):
    username: str
    password: str

@app.post("/admin/login")
def admin_login(body: AdminLoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.exec(select(AdminUser).where(AdminUser.username == body.username)).first()
    if not user or not argon2.verify(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    access_token = create_access_token({
        "sub": user.id,
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
async def login(body: LoginRequest):
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
    # TODO: сохранить или обновить User в БД
    return {"status": "ok", "user": user_data}

# --- Products CRUD ---
@app.get("/products")
def list_products(q: str | None = None):
    with Session(engine) as session:
        stmt = select(Product)
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
        return session.exec(stmt).all()

@app.get("/products/{product_id}", response_model=Product)
def get_product(product_id: int = Path(...)):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

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
def create_order(order: Order):
    with Session(engine) as session:
        session.add(order)
        session.commit()
        session.refresh(order)
    bot_token = os.getenv("BOT_TOKEN")
    if bot_token:
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": order.user_id,
                    "text": (
                        f"✅ Ваш заказ #{order.id} принят!\n\n"
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
    return {"status": "ok", "order_id": order.id}

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
    all_ids = {item['product_id'] for o in orders for item in o.items}
    prods = db.exec(select(Product).where(Product.id.in_(all_ids))).all()
    prod_map = {p.id: {"name": p.name, "price": p.price} for p in prods}
    enriched = []
    for o in orders:
        enriched_items = []
        for it in o.items:
            prod = prod_map.get(it['product_id'])
            enriched_items.append({
            "product_id": it['product_id'],
            "quantity": it['quantity'],
            "name": prod["name"] if prod else f"#{it['product_id']}",
            "price": prod["price"] if prod else 0
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
def get_orders(user=Depends(get_current_admin)):
    with Session(engine) as s:
        orders = s.exec(select(Order).order_by(Order.created_at.desc())).all()
        all_ids = {item['product_id'] for o in orders for item in o.items}
        prods = s.exec(select(Product).where(Product.id.in_(all_ids))).all()
        prod_map = {p.id: {"name": p.name, "price": p.price} for p in prods}
        enriched = []
        for o in orders:
            enriched_items = []
            for it in o.items:
                prod = prod_map.get(it['product_id'])
                enriched_items.append({
                    "product_id": it['product_id'],
                    "quantity": it['quantity'],
                    "name": prod["name"] if prod else f"#{it['product_id']}",
                    "price": prod["price"] if prod else 0
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
        order.status = new_status
        s.add(order)
        s.commit()
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
    class Config: orm_mode = True

def _enrich(user_id: int, db: Session) -> list[CartItemFull]:
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
    enriched: list[CartItemFull] = []
    for r in rows:
        p = prods.get(r.product_id)
        if not p:
            continue                # товар удалён из каталога
        enriched.append(
            CartItemFull(
                id       = p.id,
                name     = p.name,
                price    = p.price,
                image    = (p.images or [None])[0],
                quantity = r.quantity,
            )
        )
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
def list_hits(limit: int = 8, db: Session = Depends(get_db)):
    stmt = (
        select(Product)
        .where(Product.is_hit.is_(True))
        .order_by(func.random())   # PostgreSQL random()
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