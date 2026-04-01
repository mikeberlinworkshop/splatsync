from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlmodel import Session, select
from stravalib import Client as StravaClient

from app.auth.crypto import decrypt, encrypt
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_token
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

    try:
        otf = Otf(body.email, body.password)
        # Verify auth worked by fetching member details
        member = await otf.get_member_detail()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"OTF login failed: {str(e)}")

    # Find or create user
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        user = User(email=body.email)
        session.add(user)
        session.commit()
        session.refresh(user)

    # Cache the Cognito tokens (NOT the password)
    existing = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    if existing:
        existing.cognito_token = encrypt(otf._api.auth.id_token or "")
        existing.token_expires_at = datetime.utcnow() + timedelta(hours=1)
    else:
        otf_session = OtfSession(
            user_id=user.id,
            cognito_token=encrypt(otf._api.auth.id_token or ""),
            token_expires_at=datetime.utcnow() + timedelta(hours=1),
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
        max_age=86400,
    )

    return {
        "message": "Connected to OTF",
        "member_name": f"{member.first_name} {member.last_name}"
        if hasattr(member, "first_name")
        else "Connected",
    }


# --- Strava OAuth ---


@router.get("/strava/connect")
async def strava_connect():
    """Redirect URL for Strava OAuth."""
    client = StravaClient()
    url = client.authorization_url(
        client_id=int(settings.strava_client_id),
        redirect_uri=settings.strava_redirect_uri,
        scope=["activity:read_all", "activity:write"],
    )
    return {"url": url}


@router.get("/strava/callback")
async def strava_callback(
    code: str,
    response: Response,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Handle Strava OAuth callback."""
    client = StravaClient()
    token_response = client.exchange_code_for_token(
        client_id=int(settings.strava_client_id),
        client_secret=settings.strava_client_secret,
        code=code,
    )

    existing = session.exec(
        select(StravaToken).where(StravaToken.user_id == user.id)
    ).first()
    if existing:
        existing.access_token = encrypt(token_response["access_token"])
        existing.refresh_token = encrypt(token_response["refresh_token"])
        existing.expires_at = datetime.fromtimestamp(token_response["expires_at"])
        existing.athlete_id = token_response["athlete"]["id"]
    else:
        strava_token = StravaToken(
            user_id=user.id,
            access_token=encrypt(token_response["access_token"]),
            refresh_token=encrypt(token_response["refresh_token"]),
            expires_at=datetime.fromtimestamp(token_response["expires_at"]),
            athlete_id=token_response["athlete"]["id"],
        )
        session.add(strava_token)
    session.commit()

    # Redirect back to frontend
    return Response(
        status_code=302,
        headers={"Location": f"{settings.frontend_url}/dashboard?strava=connected"},
    )


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
