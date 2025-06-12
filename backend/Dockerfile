FROM python:3.11-slim
WORKDIR /app

# 1. кладём кэш колёс
COPY wheelhouse /wheelhouse
COPY app/requirements.txt /tmp/requirements.txt

# 2. устанавливаем **только из локальной папки**, без сети
RUN pip install --no-index --find-links=/wheelhouse \
        -r /tmp/requirements.txt

# 3. копируем исходники и запускаем
COPY app /app
ENTRYPOINT ["sh","-c","alembic upgrade head && \
                       uvicorn app.main:app --host 0.0.0.0 --port 8001"]