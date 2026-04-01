from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth.jwt import decode_token
from app.db import get_session
from app.models import User


def get_current_user(
    session: Session = Depends(get_session),
    token: str = Cookie(None, alias="splatsync_token"),
) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user
