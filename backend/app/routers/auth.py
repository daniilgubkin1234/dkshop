# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from db import get_db
from models import User
from routers.auth_utils import create_access_token
import hmac, hashlib, os, time, urllib.parse
import logging
from fastapi import Body
router = APIRouter(prefix="/auth", tags=["auth"])
BOT_TOKEN = os.getenv("BOT_TOKEN")

logger = logging.getLogger("uvicorn.error")

def verify(init_data_raw: str) -> dict:
    logger.info(f"[TelegramAuth] BOT_TOKEN (в контейнере): {BOT_TOKEN!r}")
    logger.info(f"[TelegramAuth] Проверяем init_data_raw: {init_data_raw!r}")
    
    try:
        data = dict(urllib.parse.parse_qsl(init_data_raw, strict_parsing=True))
    except Exception as e:
        logger.error(f"[TelegramAuth] Ошибка парсинга initData: {e}")
        raise
    hash_ = data.pop("hash", None)
    data.pop("signature", None)  # <- вот тут
    if not hash_:
        logger.error("[TelegramAuth] Нет hash в initData!")
        raise ValueError("no hash")

    data_check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    logger.info(f"[TelegramAuth] data_check строка: {data_check!r}")
    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    expected_hash = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    logger.info(f"[TelegramAuth] Проверка подписи: hash={hash_}, expected={expected_hash}")
    if expected_hash != hash_:
        logger.error(f"[TelegramAuth] bad hash! expected={expected_hash}, got={hash_}")
        raise ValueError("bad hash")
    # свежесть
    delta = time.time() - int(data["auth_date"])
    logger.info(f"[TelegramAuth] age={delta} сек")
    if delta > 86400:
        logger.error("[TelegramAuth] stale auth!")
        raise ValueError("stale auth")

    logger.info(f"[TelegramAuth] Успешная верификация пользователя: {data.get('user', data)}")
    return {**data, **eval(data["user"])}   # user{id,username,…}

@router.post("/telegram")
def auth_telegram(init_data: str = Body(..., media_type="text/plain"), db: Session = Depends(get_db)):
    logger.info(f"[TelegramAuth] /auth/telegram вызван, длина init_data={len(init_data) if init_data else 'None'}")
    logger.info(f"[TelegramAuth] Полученные init_data: {init_data}")
    
    try:
        payload = verify(init_data)
    except Exception as e:
        logger.error(f"[TelegramAuth] Ошибка авторизации: {e}")
        raise HTTPException(403, str(e))

    tg_id = int(payload["id"])
    user = db.exec(select(User).where(User.tg_id == tg_id)).first()
    if not user:
        user = User(
            tg_id      = tg_id,
            username   = payload.get("username"),
            first_name = payload.get("first_name"),
            last_name  = payload.get("last_name"),
        )
        db.add(user); db.commit(); db.refresh(user)
        logger.info(f"[TelegramAuth] Создан пользователь с tg_id={tg_id}")
    else:
        logger.info(f"[TelegramAuth] Пользователь уже существует: tg_id={tg_id}")

    token = create_access_token({"sub": str(user.tg_id)})
    logger.info(f"[TelegramAuth] Успех, возвращаем токен для tg_id={tg_id}")
    return {"access_token": token, "token_type": "bearer"}
