from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth.crypto import decrypt
from app.auth.dependencies import get_current_user
from app.db import get_session
from app.models import OtfSession, StravaToken, User
from app.sync.service import sync_workout

router = APIRouter(prefix="/api/sync", tags=["sync"])


class SyncRequest(BaseModel):
    otf_workout: dict
    strava_activity_id: int | None = None


@router.post("/execute")
def execute_sync(
    body: SyncRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Generate FIT file from OTF data and upload to Strava."""
    strava_token = session.exec(
        select(StravaToken).where(StravaToken.user_id == user.id)
    ).first()
    if not strava_token:
        raise HTTPException(status_code=400, detail="Strava not connected")

    otf_session = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    if not otf_session:
        raise HTTPException(status_code=400, detail="OTF not connected")

    try:
        result = sync_workout(
            otf_email=decrypt(otf_session.otf_email),
            otf_password=decrypt(otf_session.otf_password),
            strava_token=strava_token,
            session=session,
            otf_workout=body.otf_workout,
            existing_strava_id=body.strava_activity_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

    return result
