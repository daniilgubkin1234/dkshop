# deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from models import User
from sqlmodel import Session, select
from db import get_db
SECRET = os.getenv("JWT_SECRET", "supersecretkey")
ALGO   = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/telegram")  # формально

def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        tg_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="invalid token")
    user = db.exec(select(User).where(User.tg_id == tg_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
