# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from db import get_db
from models import User
from routers.auth_utils import create_access_token
import hmac, hashlib, os, time, urllib.parse

router = APIRouter(prefix="/auth", tags=["auth"])
BOT_TOKEN = os.getenv("BOT_TOKEN")

def verify(init_data_raw: str) -> dict:
    """Проверка подписи initData из Telegram Web-App"""
    data = dict(urllib.parse.parse_qsl(init_data_raw, strict_parsing=True))
    hash_ = data.pop("hash", None)
    if not hash_:
        raise ValueError("no hash")

    data_check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
    if hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest() != hash_:
        raise ValueError("bad hash")
    # свежесть
    if time.time() - int(data["auth_date"]) > 86400:
        raise ValueError("stale auth")

    return {**data, **eval(data["user"])}   # user{id,username,…}

@router.post("/telegram")
def auth_telegram(init_data: str, db: Session = Depends(get_db)):
    try:
        payload = verify(init_data)
    except Exception as e:
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

    token = create_access_token({"sub": str(user.tg_id)})
    return {"access_token": token, "token_type": "bearer"}
