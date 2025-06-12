# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /code

COPY backend/app/requirements.txt ./requirements.txt   
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
WORKDIR /app
# ── 3. запускаем: миграция Alembic + Uvicorn ──────────────────────────
ENTRYPOINT ["sh", "-c", "alembic upgrade head && \
                         uvicorn app.main:app --host 0.0.0.0 --port 8001"]

                         