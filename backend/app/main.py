from fastapi import FastAPI, status, Query, Path, UploadFile, File, HTTPException, Depends
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from  db import engine
from .models import Product, FAQ, Question, Order, FooterLink, ModelCard
from sqlalchemy import or_, func
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets
import shutil, uuid, os
import requests
from .routers import auth
from .db import get_db
from pydantic import BaseModel

app = FastAPI(title="DK API")
app.include_router(auth.router)
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

security = HTTPBasic()

# --- Static files ---
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")),
    name="static"
)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
# --- Upload endpoint ---
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

# --- Products CRUD ---

# Список продуктов (GET)
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

# Получить один товар по id (GET)
@app.get("/products/{product_id}", response_model=Product)
def get_product(product_id: int = Path(...)):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

# Создание продукта (POST)
@app.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(item: Product):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

# Редактирование продукта (PATCH)
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

# Удаление продукта (DELETE)
@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        session.delete(product)
        session.commit()
        return {"ok": True}

# --- Остальные эндпоинты (без изменений) ---

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
                        f"📦 Ожидайте звонка для подтверждения."
                    ),
                    "parse_mode": "HTML"
                },
                timeout=5
            )
        except Exception as e:
            print("Ошибка при отправке сообщения в Telegram:", e)

    return {"status": "ok", "order_id": order.id}

@app.get("/faq")
def search_faq(q: str = Query("*", min_length=1)):
    with Session(engine) as session:
        stmt = select(FAQ)
        if q != "*":
            stmt = stmt.where(FAQ.question.ilike(f"%{q}%"))
        return session.exec(stmt).all()

@app.post("/faq", response_model=FAQ)
def create_faq(item: FAQ):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

@app.delete("/faq/{faq_id}")
def delete_faq(faq_id: int):
    with Session(engine) as session:
        faq = session.get(FAQ, faq_id)
        if faq:
            session.delete(faq)
            session.commit()
        return {"ok": True}

def check_admin(credentials: HTTPBasicCredentials = Depends(security)):
    admin_user = os.getenv("ADMIN_USER", "")
    admin_pass = os.getenv("ADMIN_PASSWORD", "")
    correct_user = secrets.compare_digest(credentials.username, admin_user)
    correct_pass = secrets.compare_digest(credentials.password, admin_pass)
    if not (correct_user and correct_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

@app.get("/admin/orders")
def get_orders(creds: HTTPBasicCredentials = Depends(check_admin)):
    with Session(engine) as s:
        orders = s.exec(
            select(Order).order_by(Order.created_at.desc())
        ).all()
        all_ids = {item["product_id"] for o in orders for item in o.items}
        prods = s.exec(select(Product).where(Product.id.in_(all_ids))).all()
        prod_map = {p.id: p.name for p in prods}
        enriched = []
        for o in orders:
            enriched_items = []
            for it in o.items:
                enriched_items.append({
                    "product_id": it["product_id"],
                    "quantity": it["quantity"],
                    "name": prod_map.get(it["product_id"], f"#{it['product_id']}")
                })
            od = o.dict()
            od["items"] = enriched_items
            enriched.append(od)
        return enriched

@app.patch("/admin/orders/{order_id}")
def update_order_status(order_id: int, new_status: str, creds: HTTPBasicCredentials = Depends(check_admin)):
    with Session(engine) as s:
        order = s.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order.status = new_status
        s.add(order)
        s.commit()
        return order

@app.delete("/admin/orders/{order_id}")
def delete_order(order_id: int, creds: HTTPBasicCredentials = Depends(check_admin)):
    with Session(engine) as s:
        order = s.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        s.delete(order)
        s.commit()
        return {"ok": True}

@app.get("/orders/by-phone")
def orders_by_phone(phone: str):
    normalized = phone.strip().replace(" ", "").replace("-", "").lstrip("+").replace("+7", "8").replace("+", "")
    with Session(engine) as session:
        stmt = select(Order).where(
            func.replace(func.replace(Order.phone, ' ', ''), '-', '').ilike(f"%{normalized}%")
        ).order_by(Order.created_at.desc())
        return session.exec(stmt).all()

@app.patch("/faq/{faq_id}", response_model=FAQ)
def update_faq(faq_id: int, item: FAQ, creds: HTTPBasicCredentials = Depends(check_admin)):
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


# ---------------- Pydantic схемы -----------------------------------------
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

# ---------------- CRUD для футера ---------------------------------------
# ───── Публичный GET (витрина) ─────────────────────────────────────────
@app.get("/footer", response_model=list[FooterLinkRead])
def public_footer(db: Session = Depends(get_db)):
    return db.query(FooterLink).all()


# ───── Админ-CRUD (Basic auth) ─────────────────────────────────────────
@app.get("/admin/footer", response_model=list[FooterLinkRead])
def admin_footer(
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    return db.query(FooterLink).all()


@app.post("/admin/footer", response_model=FooterLinkRead, status_code=201)
def create_footer_link(
    link: FooterLinkCreate,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    obj = FooterLink(**link.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.patch("/admin/footer/{link_id}", response_model=FooterLinkRead)
def update_footer_link(
    link_id: int,
    link: FooterLinkCreate,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    db_link = db.get(FooterLink, link_id)
    if not db_link:
        raise HTTPException(status_code=404, detail="Not found")

    for k, v in link.dict().items():
        setattr(db_link, k, v)
    db.commit()
    db.refresh(db_link)
    return db_link


@app.delete("/admin/footer/{link_id}", status_code=204)
def delete_footer_link(
    link_id: int,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    db_link = db.get(FooterLink, link_id)
    if db_link:
        db.delete(db_link)
        db.commit()


# ---------- Схемы для ModelCard ----------
class ModelCardCreate(BaseModel):
    label: str
    models: list[str] = []
    img: str
    match_by_name: bool = True   # ← по умолчанию ищем и по имени тоже


class ModelCardRead(ModelCardCreate):
    id: int

    class Config:
        orm_mode = True



# ---------- PUBLIC: ModelCard -------------------------------------------

@app.get("/model_cards", response_model=list[ModelCardRead])
def public_model_cards(db: Session = Depends(get_db)):
    return db.query(ModelCard).all()

# ---------- ADMIN: ModelCard -------------------------------------------
@app.get("/admin/model_cards", response_model=list[ModelCardRead])
def admin_model_cards(
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    return db.query(ModelCard).all()


@app.post(
    "/admin/model_cards",
    response_model=ModelCardRead,
    status_code=status.HTTP_201_CREATED
)
def create_model_card(
    card: ModelCardCreate,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    obj = ModelCard(**card.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.patch("/admin/model_cards/{card_id}", response_model=ModelCardRead)
def update_model_card(
    card_id: int,
    card: ModelCardCreate,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    db_card = db.get(ModelCard, card_id)
    if not db_card:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in card.dict(exclude_unset=True).items():
        setattr(db_card, k, v)
    db.commit()
    db.refresh(db_card)
    return db_card


@app.delete("/admin/model_cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_card(
    card_id: int,
    db: Session = Depends(get_db),
    creds: HTTPBasicCredentials = Depends(check_admin)
):
    db_card = db.get(ModelCard, card_id)
    if db_card:
        db.delete(db_card)
        db.commit()