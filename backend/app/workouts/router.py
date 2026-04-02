from fastapi import APIRouter, Depends, HTTPException, Query
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
def compare_workouts(
    days: int = Query(default=30, ge=1, le=365),
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

    try:
        otf_email = decrypt(otf_session.otf_email)
        otf_password = decrypt(otf_session.otf_password)
        otf_workouts = get_otf_workouts(otf_email, otf_password, days=days)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"OTF session error: {str(e)}. Please reconnect.",
        )

    strava_activities = get_strava_activities(strava_token, session, days=days)

    comparisons = match_workouts(otf_workouts, strava_activities)

    summary = {
        "total_otf": len(otf_workouts),
        "total_strava": len(strava_activities),
        "matched": sum(1 for c in comparisons if c["status"] == "matched"),
        "needs_fix": sum(1 for c in comparisons if c["needs_fix"]),
        "otf_only": sum(1 for c in comparisons if c["status"] == "otf_only"),
    }

    return {"summary": summary, "comparisons": comparisons}
