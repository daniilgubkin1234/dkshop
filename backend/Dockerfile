# backend/Dockerfile
FROM python:3.12-slim

ENV PIP_DEFAULT_TIMEOUT=120 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# ── фиксим IPv6/HTTP и ставим build-зависимости ───────────
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 && \
    sed -i 's|http://|https://|g' /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends gcc && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. зависимости
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. исходники
COPY app/ .

EXPOSE 8001

ENTRYPOINT ["sh", "-c", "alembic upgrade head && \
            uvicorn main:app --host 0.0.0.0 --port 8001"]