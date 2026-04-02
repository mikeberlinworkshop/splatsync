from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlmodel import Session, select
from stravalib import Client as StravaClient

from app.auth.crypto import decrypt, encrypt
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_token, decode_token
from app.config import settings
from app.db import get_session
from app.models import OtfSession, StravaToken, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- OTF Auth ---


class OtfLoginRequest(BaseModel):
    email: str
    password: str


class AuthStatus(BaseModel):
    otf_connected: bool
    strava_connected: bool
    strava_athlete_id: int | None = None
    email: str | None = None


@router.post("/otf/login")
async def otf_login(
    body: OtfLoginRequest, response: Response, session: Session = Depends(get_session)
):
    """Authenticate with OTF. Password is used once and never stored."""
    from otf_api import Otf
    from otf_api.auth.user import OtfUser

    try:
        otf_user = OtfUser(username=body.email, password=body.password)
        otf = Otf(otf_user)
        member = otf.get_member_detail()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"OTF login failed: {str(e)}")

    # Find or create user
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        user = User(email=body.email)
        session.add(user)
        session.commit()
        session.refresh(user)

    # Cache encrypted credentials for API calls (user can disconnect to delete)
    existing = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    if existing:
        existing.otf_email = encrypt(body.email)
        existing.otf_password = encrypt(body.password)
        existing.token_expires_at = datetime.utcnow() + timedelta(days=30)
    else:
        otf_session = OtfSession(
            user_id=user.id,
            otf_email=encrypt(body.email),
            otf_password=encrypt(body.password),
            token_expires_at=datetime.utcnow() + timedelta(days=30),
        )
        session.add(otf_session)
    session.commit()

    # Issue JWT
    token = create_token(user.id)
    response.set_cookie(
        "splatsync_token",
        token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=86400 * 30,  # 30 days
    )

    return {
        "message": "Connected to OTF",
        "member_name": f"{member.first_name} {member.last_name}"
        if hasattr(member, "first_name")
        else "Connected",
    }


# --- Strava OAuth ---


@router.get("/strava/connect")
async def strava_connect(user: User = Depends(get_current_user)):
    """Generate Strava OAuth URL. Passes user_id via state param."""
    client = StravaClient()
    url = client.authorization_url(
        client_id=int(settings.strava_client_id),
        redirect_uri=settings.strava_redirect_uri,
        scope=["activity:read_all", "activity:write"],
        state=user.id,  # Pass user_id so callback doesn't need cookies
    )
    return {"url": url}


@router.get("/strava/callback")
async def strava_callback(
    code: str,
    state: str = "",
    response: Response = None,
    session: Session = Depends(get_session),
):
    """Handle Strava OAuth callback. No cookie required — user_id comes from state param."""
    if not state:
        return Response(
            status_code=302,
            headers={"Location": f"{settings.frontend_url}/?error=missing_state"},
        )

    user_id = state
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        return Response(
            status_code=302,
            headers={"Location": f"{settings.frontend_url}/?error=invalid_user"},
        )

    # Exchange code for tokens
    client = StravaClient()
    try:
        token_info = client.exchange_code_for_token(
            client_id=int(settings.strava_client_id),
            client_secret=settings.strava_client_secret,
            code=code,
        )
    except Exception as e:
        return Response(
            status_code=302,
            headers={"Location": f"{settings.frontend_url}/?error=strava_auth_failed"},
        )

    # Get athlete ID from a quick API call
    authed_client = StravaClient(access_token=token_info["access_token"])
    try:
        athlete = authed_client.get_athlete()
        athlete_id = athlete.id
    except Exception:
        athlete_id = 0

    existing = session.exec(
        select(StravaToken).where(StravaToken.user_id == user_id)
    ).first()
    if existing:
        existing.access_token = encrypt(token_info["access_token"])
        existing.refresh_token = encrypt(token_info["refresh_token"])
        existing.expires_at = datetime.fromtimestamp(token_info["expires_at"])
        existing.athlete_id = athlete_id
    else:
        strava_token = StravaToken(
            user_id=user_id,
            access_token=encrypt(token_info["access_token"]),
            refresh_token=encrypt(token_info["refresh_token"]),
            expires_at=datetime.fromtimestamp(token_info["expires_at"]),
            athlete_id=athlete_id,
        )
        session.add(strava_token)
    session.commit()

    # Set a fresh JWT cookie and redirect to dashboard
    token = create_token(user_id)
    resp = Response(
        status_code=302,
        headers={"Location": f"{settings.frontend_url}/dashboard?strava=connected"},
    )
    resp.set_cookie(
        "splatsync_token",
        token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=86400 * 30,
    )
    return resp


# --- Status ---


@router.get("/status", response_model=AuthStatus)
async def auth_status(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    otf = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    strava = session.exec(
        select(StravaToken).where(StravaToken.user_id == user.id)
    ).first()
    return AuthStatus(
        otf_connected=otf is not None,
        strava_connected=strava is not None,
        strava_athlete_id=strava.athlete_id if strava else None,
        email=user.email,
    )


@router.post("/otf/disconnect")
async def otf_disconnect(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    otf = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    if otf:
        session.delete(otf)
        session.commit()
    return {"message": "OTF disconnected"}


@router.post("/strava/disconnect")
async def strava_disconnect(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    strava = session.exec(
        select(StravaToken).where(StravaToken.user_id == user.id)
    ).first()
    if strava:
        session.delete(strava)
        session.commit()
    return {"message": "Strava disconnected"}
