"""Workout fetching and comparison logic.

Pulls workouts from both OTF and Strava, matches them by date/time,
and computes diffs for the comparison UI.
"""

from datetime import datetime, timedelta

from stravalib import Client as StravaClient

from app.auth.crypto import decrypt
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
    if telemetry and telemetry.telemetry_items:
        for item in telemetry.telemetry_items:
            hr_data.append(
                {
                    "timestamp": item.actual_timestamp
                    if hasattr(item, "actual_timestamp")
                    else None,
                    "hr": item.hr if hasattr(item, "hr") else 0,
                    "calories": getattr(item, "agg_calories", 0),
                    "splats": getattr(item, "agg_splats", 0),
                }
            )

    return hr_data


def get_strava_activities(strava_token: StravaToken, days: int = 30) -> list[dict]:
    """Fetch recent Strava activities."""
    client = StravaClient(access_token=decrypt(strava_token.access_token))

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
                "distance": a.distance.num if a.distance else None,
                "duration_minutes": (a.elapsed_time.total_seconds() / 60)
                if a.elapsed_time
                else 0,
                "sport_type": str(a.sport_type) if a.sport_type else "Workout",
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

    for otf in otf_workouts:
        otf_date_str = otf["date"]
        if not otf_date_str:
            continue
        otf_date = datetime.fromisoformat(otf_date_str) if isinstance(otf_date_str, str) else otf_date_str

        best_match = None
        best_diff = None

        for strava in strava_activities:
            if strava["id"] in matched_strava_ids:
                continue
            strava_date_str = strava["date"]
            if not strava_date_str:
                continue
            strava_date = datetime.fromisoformat(strava_date_str) if isinstance(strava_date_str, str) else strava_date_str

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
