from fastapi import FastAPI, status
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from .db import engine
from .models import Product, FAQ, Question
from sqlalchemy import or_, func

app = FastAPI(title="DK Exhaust API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
