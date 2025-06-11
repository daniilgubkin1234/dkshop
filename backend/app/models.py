from sqlmodel import SQLModel, Field, Column
from typing import Optional, List
from datetime import datetime
from sqlalchemy import JSON

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    price: int
    model_compat: str      # пример: "2101-07"
    type: str              # пример: "глушитель"
    stock: int = 10

    # Дополнительные поля
    description: Optional[str] = None
    images: List[str] = Field(
        sa_column=Column(JSON),
        default_factory=list
    )

class FAQ(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question: str
    answer: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "open"      # open / answered

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    items: List[dict] = Field(
        sa_column=Column(JSON),
        default_factory=list
    )
    name: str
    phone: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"


class FooterLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # то, что выводим в таблице
    title: str

    # куда ведёт ссылка
    url: str

    # код / имя иконки (можно None)
    icon: Optional[str] = None