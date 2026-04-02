"""Workout fetching and comparison logic.

Pulls workouts from both OTF and Strava, matches them by date/time,
and computes diffs for the comparison UI.
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session
from stravalib import Client as StravaClient

from app.auth.strava_refresh import get_strava_client
from app.models import StravaToken


def get_otf_workouts(email: str, password: str, days: int = 30) -> list[dict]:
    """Fetch recent OTF workouts via otf-api."""
    from otf_api import Otf
    from otf_api.auth.user import OtfUser

    otf_user = OtfUser(username=email, password=password)
    otf = Otf(otf_user)

    cutoff = datetime.utcnow() - timedelta(days=days)
    workouts = otf.workouts.get_workouts()

    results = []
    for w in workouts:
        workout_date = w.otf_class.starts_at if w.otf_class else None
        if workout_date and workout_date < cutoff:
            continue

        zone_minutes = None
        if w.zone_time_minutes:
            zone_minutes = {
                "gray": w.zone_time_minutes.gray,
                "blue": w.zone_time_minutes.blue,
                "green": w.zone_time_minutes.green,
                "orange": w.zone_time_minutes.orange,
                "red": w.zone_time_minutes.red,
            }

        results.append(
            {
                "id": w.performance_summary_id,
                "date": workout_date.isoformat() if workout_date else None,
                "calories": w.calories_burned or 0,
                "splat_points": w.splat_points or 0,
                "avg_hr": w.heart_rate.avg_hr if w.heart_rate else 0,
                "max_hr": w.heart_rate.max_hr if w.heart_rate else 0,
                "duration_minutes": (w.active_time_seconds or 0) // 60,
                "class_type": w.otf_class.name if w.otf_class else "Unknown",
                "zone_minutes": zone_minutes,
                "tread_distance_miles": float(w.treadmill_data.total_distance.metric_value) if w.treadmill_data else None,
                "tread_avg_speed": float(w.treadmill_data.avg_speed.metric_value) if w.treadmill_data else None,
                "tread_avg_pace": str(w.treadmill_data.avg_pace) if w.treadmill_data else None,
                "rower_distance_meters": float(w.rower_data.total_distance.metric_value) if w.rower_data else None,
            }
        )

    return results


def get_otf_telemetry(email: str, password: str, workout_id: str) -> list[dict]:
    """Fetch minute-level HR telemetry for a specific OTF workout."""
    from otf_api import Otf
    from otf_api.auth.user import OtfUser

    otf_user = OtfUser(username=email, password=password)
    otf = Otf(otf_user)
    telemetry = otf.workouts.get_telemetry(workout_id)

    hr_data = []
    if telemetry and telemetry.telemetry:
        for item in telemetry.telemetry:
            hr_data.append(
                {
                    "timestamp": item.timestamp,
                    "hr": item.hr if hasattr(item, "hr") else 0,
                    "calories": getattr(item, "agg_calories", 0),
                    "splats": getattr(item, "agg_splats", 0),
                }
            )

    return hr_data


def get_strava_activities(strava_token: StravaToken, session: Session, days: int = 30) -> list[dict]:
    """Fetch recent Strava activities."""
    client = get_strava_client(strava_token, session)

    after = datetime.utcnow() - timedelta(days=days)
    activities = client.get_activities(after=after)

    results = []
    for a in activities:
        results.append(
            {
                "id": a.id,
                "name": a.name,
                "date": a.start_date_local.isoformat() if a.start_date_local else None,
                "calories": getattr(a, "calories", None),
                "avg_hr": getattr(a, "average_heartrate", None),
                "max_hr": getattr(a, "max_heartrate", None),
                "distance": float(a.distance) if a.distance else None,
                "avg_speed": float(a.average_speed) if a.average_speed else None,
                "max_speed": float(a.max_speed) if a.max_speed else None,
                "duration_minutes": (float(a.elapsed_time) / 60)
                if a.elapsed_time
                else 0,
                "sport_type": a.sport_type.root if a.sport_type and hasattr(a.sport_type, "root") else str(a.sport_type or "Workout"),
            }
        )

    return results


def match_workouts(
    otf_workouts: list[dict],
    strava_activities: list[dict],
    window_hours: float = 2.0,
) -> list[dict]:
    """Match OTF workouts to Strava activities by date/time proximity."""
    window = timedelta(hours=window_hours)
    matched_strava_ids = set()
    comparisons = []

    def _parse_naive(dt_val) -> datetime | None:
        """Parse a datetime and strip timezone info for comparison."""
        if not dt_val:
            return None
        if isinstance(dt_val, str):
            dt_val = datetime.fromisoformat(dt_val)
        if dt_val.tzinfo is not None:
            dt_val = dt_val.replace(tzinfo=None)
        return dt_val

    for otf in otf_workouts:
        otf_date = _parse_naive(otf["date"])
        if not otf_date:
            continue

        best_match = None
        best_diff = None

        for strava in strava_activities:
            if strava["id"] in matched_strava_ids:
                continue
            strava_date = _parse_naive(strava["date"])
            if not strava_date:
                continue

            diff = abs((otf_date - strava_date).total_seconds())
            if diff <= window.total_seconds():
                if best_diff is None or diff < best_diff:
                    best_match = strava
                    best_diff = diff

        if best_match:
            matched_strava_ids.add(best_match["id"])
            cal_diff = (otf["calories"] or 0) - (best_match["calories"] or 0)
            comparisons.append(
                {
                    "status": "matched",
                    "otf": otf,
                    "strava": best_match,
                    "diffs": {
                        "calories": cal_diff,
                        "avg_hr": (otf["avg_hr"] or 0) - (best_match["avg_hr"] or 0),
                        "max_hr": (otf["max_hr"] or 0) - (best_match["max_hr"] or 0),
                        "distance": float(otf.get("tread_distance_miles", 0) or 0) * 1609.34 - float(best_match.get("distance", 0) or 0),
                    },
                    "needs_fix": abs(cal_diff) > 20
                    or abs((otf["avg_hr"] or 0) - (best_match["avg_hr"] or 0)) > 5,
                }
            )
        else:
            comparisons.append(
                {
                    "status": "otf_only",
                    "otf": otf,
                    "strava": None,
                    "diffs": None,
                    "needs_fix": True,
                }
            )

    for strava in strava_activities:
        if strava["id"] not in matched_strava_ids:
            comparisons.append(
                {
                    "status": "strava_only",
                    "otf": None,
                    "strava": strava,
                    "diffs": None,
                    "needs_fix": False,
                }
            )

    comparisons.sort(
        key=lambda c: (c.get("otf") or c.get("strava", {})).get("date") or "",
        reverse=True,
    )
    return comparisons
