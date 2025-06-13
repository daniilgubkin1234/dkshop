# backend/app/routers/auth.py
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlmodel import Session, select
from dotenv import load_dotenv
import os
from db import engine
from models import User          
   

router = APIRouter(prefix="/auth", tags=["auth"])
load_dotenv(".env.production", override=True) 
ALGORITHM     = "HS256"
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET not set")                  # положите в .env
ACCESS_TTL_MIN = 24 * 60

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer("/auth/login")

# ---- helpers ---------------------------------------------------------
def hash_pw(pw: str)      -> str:  return pwd_ctx.hash(pw)
def verify_pw(pw, hashed) -> bool: return pwd_ctx.verify(pw, hashed)

def make_token(sub: int):
    payload = {
        "sub": sub,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, ALGORITHM)

def get_session():
    with Session(engine) as s:
        yield s

def current_user(token: str = Depends(oauth2_scheme),
                 db: Session = Depends(get_session)):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: int = data.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="bad token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="not found")
    return user

# ---- endpoints -------------------------------------------------------
@router.post("/register", status_code=201)
def register(u: User, db: Session = Depends(get_session)):
    if db.exec(select(User).where(User.phone == u.phone)).first():
        raise HTTPException(409, "phone exists")
    obj = User(phone=u.phone, name=u.name,
               password_hash=hash_pw(u.password_hash))
    db.add(obj); db.commit(); db.refresh(obj)
    return {"id": obj.id}

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.phone == form.username)).first()
    if not user or not verify_pw(form.password, user.password_hash):
        raise HTTPException(401, "bad creds")
    return {"access_token": make_token(user.id), "token_type": "bearer"}

@router.get("/me")
def me(user = Depends(current_user)):
    return {"id": user.id, "phone": user.phone, "name": user.name}
