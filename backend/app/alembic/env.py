from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys, pathlib            # ← добавить
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from sqlmodel import SQLModel
from db import engine                   # берем engine из db.py

# --------------------------------------------------------
config = context.config
fileConfig(config.config_file_name)     # читает logging из alembic.ini
target_metadata = SQLModel.metadata     # ВАЖНО: MetaData моделей
# --------------------------------------------------------

def run_migrations_offline():
    """Генерируем SQL без подключения к БД."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Прямое применение миграций к БД."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection,
                          target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
