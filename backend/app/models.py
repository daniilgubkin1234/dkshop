from sqlmodel import SQLModel, Field, Column
from typing import Optional, List
from datetime import datetime
from sqlalchemy import JSON
from pydantic import BaseModel
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


class ModelCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    label: str                     # видимый заголовок карточки
    models: List[str] = Field(     # список «масок» моделей (2101-07 и т.д.)
    sa_column=Column(JSON),
    default_factory=list
    )
    img: str                       # URL картинки
    match_by_name: bool = True    # искать подстроку в названии товара?

class User(SQLModel, table=True):
    id:          int | None = Field(default=None, primary_key=True)
    tg_id:       int        = Field(unique=True, index=True)
    first_name:  str | None = None
    last_name:   str | None = None
    username:    str | None = None

class OrderCreate(BaseModel):
    items: list[dict]
    name: str
    phone: str
class OrderRead(BaseModel):
    id: int
    user_id: int | None
    items: list[dict]
    name: str
    phone: str
    created_at: datetime
    status: str

    class Config:
        orm_mode = True