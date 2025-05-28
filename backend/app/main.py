from fastapi import FastAPI
from sqlmodel import SQLModel, Session, select
from fastapi.middleware.cors import CORSMiddleware
from .db import engine
from .models import Product, FAQ, Question
from sqlalchemy import or_, func
app = FastAPI(title="DK Exhaust API")

# ⬇️  добавляем CORS прямо здесь
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # на dev можно ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup() -> None:
    SQLModel.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/products")
def products(q: str | None = None):
    with Session(engine) as s:
        stmt = select(Product)
        if q:
            stmt = stmt.where(Product.name.ilike(f"%{q}%"))
        return s.exec(stmt).all()

@app.post("/questions")
def save_question(question: Question):
    with Session(engine) as s:
        s.add(question)
        s.commit()
        s.refresh(question)
        return question
@app.get("/products")
def products(q: str | None = None):
    with Session(engine) as s:
        stmt = select(Product)
        if q:
            tokens = q.lower().split()
            cleaned = [tok.replace("-", "") for tok in tokens]
            stmt = stmt.where(or_(
                *(
                    or_(
                        Product.name.ilike(f"%{tok}%"),
                        func.replace(Product.model_compat, '-', '').ilike(f"%{tok}%")
                    ) for tok in cleaned
                )
            ))
        return s.exec(stmt).all()