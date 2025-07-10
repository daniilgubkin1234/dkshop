from sqlmodel import SQLModel, Field, Column
from typing import Optional, List, Dict
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
    is_hit: bool = False 
    is_hit_auto: bool = False 
    is_wholesale: bool = False

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

# --- Новая строгая модель для позиции заказа ---
class OrderItem(BaseModel):
    product_id: int
    name: str
    quantity: int
    price: int

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None)
    # теперь строгое описание структуры items:
    items: List[OrderItem] = Field(
        sa_column=Column(JSON),
        default_factory=list
    )
    name: str
    phone: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "Принят в работу"
    is_wholesale: bool = False 

class FooterLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    url: str
    icon: Optional[str] = None

class ModelCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    label: str
    models: List[str] = Field(
        sa_column=Column(JSON),
        default_factory=list
    )
    img: str
    match_by_name: bool = True

class User(SQLModel, table=True):
    id: int = Field(primary_key=True)            # = Telegram user ID
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_wholesale: bool = False
    wholesale_prices: Optional[Dict] = Field(default_factory=dict, sa_column=Column(JSON))

class StaticPage(SQLModel, table=True):
    id:        int | None = Field(default=None, primary_key=True)
    slug:      str        # 'payment' / 'refund' / 'delivery' / 'contacts'
    title:     str
    content:   str

class CompanyInfo(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    phone: str

class CartItem(SQLModel, table=True):
    user_id: int      = Field(primary_key=True)   # Telegram user
    product_id: int   = Field(primary_key=True)
    quantity: int     = 1

class AdminUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    is_super: bool = False  # True — суперадмин
    created_at: datetime = Field(default_factory=datetime.utcnow)
