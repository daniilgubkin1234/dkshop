FROM python:3.12-slim

WORKDIR /app                       # создаётся внутри образа

COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ .                        
EXPOSE 8001

ENTRYPOINT ["sh", "-c", "alembic upgrade head && \
            uvicorn main:app --host 0.0.0.0 --port 8001"]