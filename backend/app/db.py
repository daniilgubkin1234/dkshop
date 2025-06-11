# app/db.py
from sqlmodel import create_engine, Session  # ← добавили Session
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://shop:shop@db:5432/shopdb"  # dev-URL
)
engine = create_engine(DATABASE_URL, echo=False)


# ─── Новая функция-зависимость ──────────────────────────────────────────────
def get_db():
    """
    Генератор FastAPI: открывает Session для запроса и
    автоматически закрывает её после ответа.
    """
    with Session(engine) as session:
        yield session
