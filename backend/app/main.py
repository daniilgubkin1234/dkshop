from fastapi import FastAPI, status, Query
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from .db import engine
from .models import Product, FAQ, Question
from sqlalchemy import or_, func
from .models import Order 
import requests
import os
from .models import Order
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi import Depends, HTTPException
import secrets
app = FastAPI(title="DK API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
        "https://dkshopbot.ru",
        "https://t.me" ,
        ],
    allow_methods=["*"],
    allow_headers=["*"],
)


security = HTTPBasic()

@app.on_event("startup")
def on_startup() -> None:
    SQLModel.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}

# 1) Список продуктов (с поиском по q)
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

# 2) Создание продукта
@app.post("/products", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(item: Product):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

# ваши существующие вопросы и FAQ...
@app.post("/orders")
def create_order(order: Order):
    with Session(engine) as session:
        session.add(order)
        session.commit()
        session.refresh(order)

    # Уведомление в Telegram
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
def search_faq(q: str = Query(..., min_length=2)):
    with Session(engine) as session:
        stmt = select(FAQ).where(FAQ.question.ilike(f"%{q}%"))
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
    # Берём имя пользователя и пароль из окружения, или "" (пустую строку), если переменных нет:
    admin_user = os.getenv("ADMIN_USER", "")
    admin_pass = os.getenv("ADMIN_PASSWORD", "")

    # Сравниваем введённое с тем, что в окружении
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
        return s.exec(select(Order).order_by(Order.created_at.desc())).all()

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
