"""Sync service — generates FIT files and uploads to Strava."""

import io
import logging
from datetime import datetime

from sqlmodel import Session
from stravalib import Client as StravaClient

from app.auth.crypto import decrypt
from app.auth.strava_refresh import get_strava_client
from app.models import StravaToken
from app.workouts.fit_generator import generate_fit_file
from app.workouts.service import get_otf_telemetry

logger = logging.getLogger("splatsync")


def sync_workout(
    otf_email: str,
    otf_password: str,
    strava_token: StravaToken,
    session: Session,
    otf_workout: dict,
    existing_strava_id: int | None = None,
) -> dict:
    """Generate a FIT file from OTF data and upload to Strava."""
    client = get_strava_client(strava_token, session)

    # Fetch full telemetry
    telemetry = get_otf_telemetry(otf_email, otf_password, otf_workout["id"])

    hr_data = [
        {"timestamp": datetime.fromisoformat(t["timestamp"]) if isinstance(t["timestamp"], str) else t["timestamp"],
         "hr": t["hr"]}
        for t in telemetry
        if t.get("timestamp") and t.get("hr")
    ]

    # Determine sport type from OTF class type
    # Tread 50 → running, Row 50 → rowing, everything else → training
    _RUNNING_CLASSES = {"tread 50"}
    _ROWING_CLASSES = {"row 50"}
    class_type = otf_workout.get("class_type", "").strip()
    class_type_lower = class_type.lower()
    if class_type_lower in _RUNNING_CLASSES:
        sport_type = "running"
    elif class_type_lower in _ROWING_CLASSES:
        sport_type = "rowing"
    else:
        sport_type = "training"

    # Parse start time
    start_time = otf_workout["date"]
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)

    # Generate FIT file
    fit_bytes = generate_fit_file(
        start_time=start_time,
        duration_minutes=otf_workout["duration_minutes"],
        total_calories=otf_workout["calories"],
        avg_hr=otf_workout["avg_hr"],
        max_hr=otf_workout["max_hr"],
        hr_data=hr_data,
        sport_type=sport_type,
    )

    # Delete existing Strava activity if replacing (stravalib v2 lacks delete_activity)
    if existing_strava_id:
        try:
            import httpx
            httpx.delete(
                f"https://www.strava.com/api/v3/activities/{existing_strava_id}",
                headers={"Authorization": f"Bearer {decrypt(strava_token.access_token)}"},
            )
            logger.info("Deleted existing Strava activity %s before re-upload", existing_strava_id)
        except Exception:
            logger.warning("Failed to delete Strava activity %s, may create duplicate", existing_strava_id)

    # Upload FIT file to Strava
    workout_name = f"Orangetheory - {otf_workout.get('class_type', 'Workout')}"
    description = (
        f"{otf_workout['calories']} cal | "
        f"{otf_workout['splat_points']} splats | "
        f"Synced by SplatSync"
    )

    upload = client.upload_activity(
        activity_file=io.BytesIO(fit_bytes),
        data_type="fit",
        name=workout_name,
        description=description,
    )

    activity = upload.wait()
    logger.info("Synced OTF workout %s → Strava activity %s", otf_workout.get("id"), activity.id)

    return {
        "strava_activity_id": activity.id,
        "strava_url": f"https://strava.com/activities/{activity.id}",
        "name": workout_name,
        "synced_at": datetime.utcnow().isoformat(),
    }
