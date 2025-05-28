from sqlmodel import create_engine
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://shop:shop@db:5432/shopdb"   # dev-URL
)
engine = create_engine(DATABASE_URL, echo=False)
