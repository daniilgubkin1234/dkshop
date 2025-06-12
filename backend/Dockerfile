# backend/Dockerfile
FROM python:3.11-slim



# ── 1. Путь сборки ──────────────────────────────────────────────────
WORKDIR /code

# ── 2. Python-зависимости ───────────────────────────────────────────
COPY app/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir \
        --default-timeout=120 --retries 20 \
        --index-url https://mirror.yandex.ru/mirrors/pypi/simple/ \
        --trusted-host mirror.yandex.ru \
        --extra-index-url https://pypi.org/simple \
        -r /tmp/requirements.txt

# ── 3. Исходники приложения ────────────────────────────────────────
COPY app /app

# ── 4. Запуск: миграция Alembic + Uvicorn ──────────────────────────
EXPOSE 8001
ENTRYPOINT ["sh", "-c", "alembic upgrade head && \
                       uvicorn app.main:app --host 0.0.0.0 --port 8001"]
