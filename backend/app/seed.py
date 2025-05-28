from sqlmodel import Session
from .db import engine
from .models import Product, FAQ

demo_products = [
    Product(name="Глушитель ВАЗ 2101-07 (51 мм)", price=5500,
            model_compat="2101-07", type="глушитель"),
    Product(name="Резонатор Samara 2108-15 (51 мм)", price=3200,
            model_compat="2108-15", type="резонатор"),
]

demo_faq = [
    FAQ(question="Как выбрать глушитель?",
        answer="Ориентируйтесь на модель автомобиля и диаметр входного патрубка."),
    FAQ(question="Доставляете ли вы в регионы?",
        answer="Да, работаем с СДЭК и Почтой РФ — укажите город при оформлении."),
]

with Session(engine) as s:
    s.add_all(demo_products + demo_faq)
    s.commit()

print("Seed OK")
