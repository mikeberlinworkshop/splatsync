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

    # Convert treadmill distance from miles to meters (if available)
    tread_distance_meters = None
    if otf_workout.get("tread_distance_miles"):
        tread_distance_meters = float(otf_workout["tread_distance_miles"]) * 1609.34

    # Convert rower distance (already in meters from OTF API)
    rower_distance_meters = None
    if otf_workout.get("rower_distance_meters"):
        rower_distance_meters = float(otf_workout["rower_distance_meters"])

    # Pick the right distance for the sport type
    distance_meters = None
    if sport_type == "running" and tread_distance_meters:
        distance_meters = tread_distance_meters
    elif sport_type == "rowing" and rower_distance_meters:
        distance_meters = rower_distance_meters

    # Generate FIT file
    fit_bytes = generate_fit_file(
        start_time=start_time,
        duration_minutes=otf_workout["duration_minutes"],
        total_calories=otf_workout["calories"],
        avg_hr=otf_workout["avg_hr"],
        max_hr=otf_workout["max_hr"],
        hr_data=hr_data,
        sport_type=sport_type,
        tread_distance_meters=distance_meters,
    )

    # Delete or mark existing Strava activity if replacing.
    # NOTE: Strava only allows deleting activities created by the same OAuth app.
    # Activities from Apple Health / Apple Watch / other apps will return 401/404.
    # In that case, we fall back to renaming the old activity to mark it as replaced.
    logger.info("Delete check: existing_strava_id=%s", existing_strava_id)
    if existing_strava_id:
        try:
            import httpx
            access_token = str(client.access_token)
            logger.info("Attempting DELETE /activities/%s", existing_strava_id)
            resp = httpx.delete(
                f"https://www.strava.com/api/v3/activities/{existing_strava_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 204:
                logger.info("Deleted existing Strava activity %s before re-upload", existing_strava_id)
            else:
                logger.warning(
                    "Strava DELETE returned %s for activity %s: %s — falling back to rename",
                    resp.status_code, existing_strava_id, resp.text[:200],
                )
                # Fall back: rename the old activity so the user knows it was replaced.
                # This works for any activity the user owns, regardless of which app created it.
                try:
                    client.update_activity(
                        activity_id=existing_strava_id,
                        name="[Replaced by SplatSync]",
                        description="This activity was replaced by a SplatSync upload with corrected OTF data.",
                    )
                    logger.info("Renamed Strava activity %s as replaced", existing_strava_id)
                except Exception as rename_exc:
                    logger.warning(
                        "Could not rename Strava activity %s: %s — may create duplicate",
                        existing_strava_id, rename_exc,
                    )
        except Exception as exc:
            logger.warning("Failed to delete Strava activity %s: %s — may create duplicate", existing_strava_id, exc)

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
