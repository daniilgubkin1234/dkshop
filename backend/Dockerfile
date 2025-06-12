# backend/Dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# ── 1. ставим зависимости ───────────────────────────────────────────
WORKDIR /code

COPY /app/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir \
        --default-timeout=120 \
        --retries 20 \
        -i https://mirror.yandex.ru/mirrors/pypi/simple/ \
        --trusted-host mirror.yandex.ru \
        -r /tmp/requirements.txt

# ── 2. копируем исходники ───────────────────────────────────────────
COPY /app /app
WORKDIR /app

# ── 3. запускаем: миграция Alembic + Uvicorn ────────────────────────
ENTRYPOINT ["sh", "-c", "alembic upgrade head && \
                         uvicorn app.main:app --host 0.0.0.0 --port 8001"]