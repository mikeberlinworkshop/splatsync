"""Sync service — generates FIT files and uploads to Strava."""

import io
from datetime import datetime

from stravalib import Client as StravaClient

from app.auth.crypto import decrypt
from app.models import StravaToken
from app.workouts.fit_generator import generate_fit_file
from app.workouts.service import get_otf_telemetry


def sync_workout(
    otf_email: str,
    otf_password: str,
    strava_token: StravaToken,
    otf_workout: dict,
    existing_strava_id: int | None = None,
) -> dict:
    """Generate a FIT file from OTF data and upload to Strava."""
    client = StravaClient(access_token=decrypt(strava_token.access_token))

    # Fetch full telemetry
    telemetry = get_otf_telemetry(otf_email, otf_password, otf_workout["id"])

    hr_data = [
        {"timestamp": datetime.fromisoformat(t["timestamp"]) if isinstance(t["timestamp"], str) else t["timestamp"],
         "hr": t["hr"]}
        for t in telemetry
        if t.get("timestamp") and t.get("hr")
    ]

    # Determine sport type from class type
    class_type = otf_workout.get("class_type", "").lower()
    if "tread" in class_type or "run" in class_type:
        sport_type = "running"
    elif "row" in class_type:
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
        except Exception:
            pass  # If delete fails, user gets a duplicate — acceptable

    # Upload FIT file to Strava
    workout_name = f"Orangetheory {otf_workout.get('class_type', 'Workout')}"
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

    return {
        "strava_activity_id": activity.id,
        "strava_url": f"https://strava.com/activities/{activity.id}",
        "name": workout_name,
        "synced_at": datetime.utcnow().isoformat(),
    }
