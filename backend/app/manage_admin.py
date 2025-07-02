import sys
from sqlmodel import SQLModel, Session, create_engine, select
from models import AdminUser
from passlib.hash import argon2

DB_URL = "postgresql://shop:shop@db:5432/shopdb"  # проверь данные из docker-compose

def usage():
    print("Использование:")
    print("  python manage_admin.py <логин> <пароль> [--super]")
    print("    --super - сделать пользователя суперадмином (по умолчанию обычный админ)")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        usage()
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]
    is_super = "--super" in sys.argv

    engine = create_engine(DB_URL)
    with Session(engine) as session:
        q = select(AdminUser).where(AdminUser.username == username)
        user = session.exec(q).first()
        if user:
            print(f"Пользователь {username} уже существует, обновляю пароль и роль...")
            user.password_hash = argon2.hash(password)
            user.is_super = is_super
        else:
            print(f"Создаю пользователя {username} (is_super={is_super})")
            user = AdminUser(
                username=username,
                password_hash=argon2.hash(password),
                is_super=is_super
            )
            session.add(user)
        session.commit()
        print("Готово.")