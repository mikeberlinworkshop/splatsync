from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth.crypto import decrypt
from app.auth.dependencies import get_current_user
from app.db import get_session
from app.models import OtfSession, StravaToken, User
from app.workouts.service import (
    get_otf_workouts,
    get_strava_activities,
    match_workouts,
)

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


@router.get("/compare")
async def compare_workouts(
    days: int = 30,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Fetch and compare OTF workouts with Strava activities."""
    otf_session = session.exec(
        select(OtfSession).where(OtfSession.user_id == user.id)
    ).first()
    strava_token = session.exec(
        select(StravaToken).where(StravaToken.user_id == user.id)
    ).first()

    if not otf_session:
        raise HTTPException(status_code=400, detail="OTF not connected")
    if not strava_token:
        raise HTTPException(status_code=400, detail="Strava not connected")

    # Fetch from both sources
    # Note: OTF requires re-auth with email/password for API calls.
    # For now, we return an error if the session is expired.
    # Future: prompt re-auth on the frontend.
    try:
        otf_workouts = await get_otf_workouts(user.email, "", days=days)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="OTF session expired. Please reconnect.",
        )

    strava_activities = get_strava_activities(strava_token, days=days)

    comparisons = match_workouts(otf_workouts, strava_activities)

    summary = {
        "total_otf": len(otf_workouts),
        "total_strava": len(strava_activities),
        "matched": sum(1 for c in comparisons if c["status"] == "matched"),
        "needs_fix": sum(1 for c in comparisons if c["needs_fix"]),
        "otf_only": sum(1 for c in comparisons if c["status"] == "otf_only"),
    }

    return {"summary": summary, "comparisons": comparisons}
