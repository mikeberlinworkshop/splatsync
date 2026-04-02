"""Test the sync data flow: OTF workout → FIT file → verify contents.

Generates a FIT file from sample OTF workout data (with treadmill distance),
reads it back, and verifies all critical fields are present and correct.
"""

import sys
from datetime import datetime, timedelta

# Add backend to path so we can import the app modules
sys.path.insert(0, ".")

from app.workouts.fit_generator import generate_fit_file

from fit_tool.fit_file import FitFile
from fit_tool.profile.messages.record_message import RecordMessage
from fit_tool.profile.messages.session_message import SessionMessage
from fit_tool.profile.profile_type import Sport, SubSport


def build_sample_workout():
    """Create a realistic OTF treadmill workout with HR telemetry."""
    start = datetime(2026, 4, 1, 6, 0, 0)
    duration_minutes = 55
    tread_distance_miles = 2.1
    tread_distance_meters = tread_distance_miles * 1609.34

    # Simulate 55 minutes of HR data (one per minute)
    hr_data = []
    for i in range(duration_minutes):
        # Ramp HR from 120 to 175 over the workout
        hr = 120 + int(55 * (i / duration_minutes))
        hr_data.append({
            "timestamp": start + timedelta(minutes=i),
            "hr": hr,
        })

    return {
        "start_time": start,
        "duration_minutes": duration_minutes,
        "total_calories": 520,
        "avg_hr": 148,
        "max_hr": 175,
        "hr_data": hr_data,
        "sport_type": "running",
        "tread_distance_meters": tread_distance_meters,
    }


def run_tests():
    workout = build_sample_workout()
    results = []

    # Generate FIT file
    try:
        fit_bytes = generate_fit_file(**workout)
        results.append(("FIT file generated", True, f"{len(fit_bytes)} bytes"))
    except Exception as e:
        results.append(("FIT file generated", False, str(e)))
        print_results(results)
        return

    # Parse FIT file back
    try:
        fit_file = FitFile.from_bytes(fit_bytes)
        results.append(("FIT file parseable", True, ""))
    except Exception as e:
        results.append(("FIT file parseable", False, str(e)))
        print_results(results)
        return

    all_messages = [r.message for r in fit_file.records if hasattr(r, 'message') and r.message is not None]
    records = [m for m in all_messages if isinstance(m, RecordMessage)]
    sessions = [m for m in all_messages if isinstance(m, SessionMessage)]

    # Check 1: HR records exist
    hr_records = [r for r in records if r.heart_rate is not None]
    results.append((
        "HR records exist",
        len(hr_records) == workout["duration_minutes"],
        f"{len(hr_records)} HR records (expected {workout['duration_minutes']})",
    ))

    # Check 2: HR values are reasonable
    hr_values = [r.heart_rate for r in hr_records]
    if hr_values:
        avg = sum(hr_values) / len(hr_values)
        results.append((
            "HR values reasonable",
            100 < avg < 200,
            f"avg={avg:.0f}, min={min(hr_values)}, max={max(hr_values)}",
        ))
    else:
        results.append(("HR values reasonable", False, "no HR data"))

    # Check 3: Session exists
    results.append((
        "Session message exists",
        len(sessions) == 1,
        f"{len(sessions)} session(s)",
    ))

    if sessions:
        s = sessions[0]

        # Check 4: total_calories
        results.append((
            "total_calories set",
            s.total_calories == workout["total_calories"],
            f"got {s.total_calories}, expected {workout['total_calories']}",
        ))

        # Check 5: total_distance set (in meters)
        expected_dist = workout["tread_distance_meters"]
        # fit-tool scale=100, so read value should be close to what we set
        dist_ok = s.total_distance is not None and abs(s.total_distance - expected_dist) < 1.0
        results.append((
            "total_distance set",
            dist_ok,
            f"got {s.total_distance}, expected ~{expected_dist:.1f}m",
        ))

        # Check 6: total_elapsed_time is correct (should be seconds, not milliseconds)
        expected_seconds = workout["duration_minutes"] * 60
        elapsed_ok = (
            s.total_elapsed_time is not None
            and abs(s.total_elapsed_time - expected_seconds) < 1.0
        )
        results.append((
            "total_elapsed_time correct (seconds)",
            elapsed_ok,
            f"got {s.total_elapsed_time}, expected {expected_seconds}",
        ))

        # Check 7: Sport type is running/treadmill
        results.append((
            "sport type is RUNNING",
            s.sport == Sport.RUNNING.value,
            f"got {s.sport}, expected {Sport.RUNNING.value}",
        ))
        results.append((
            "sub_sport is TREADMILL",
            s.sub_sport == SubSport.TREADMILL.value,
            f"got {s.sub_sport}, expected {SubSport.TREADMILL.value}",
        ))

        # Check 8: avg/max HR on session
        results.append((
            "avg_heart_rate set",
            s.avg_heart_rate == workout["avg_hr"],
            f"got {s.avg_heart_rate}, expected {workout['avg_hr']}",
        ))
        results.append((
            "max_heart_rate set",
            s.max_heart_rate == workout["max_hr"],
            f"got {s.max_heart_rate}, expected {workout['max_hr']}",
        ))

    # Check 9: Record-level distance is set and cumulative
    dist_records = [r for r in records if r.distance is not None]
    results.append((
        "Record-level distance set",
        len(dist_records) == len(records),
        f"{len(dist_records)}/{len(records)} records have distance",
    ))

    if dist_records:
        last_dist = dist_records[-1].distance
        expected_total = workout["tread_distance_meters"]
        results.append((
            "Final record distance matches total",
            abs(last_dist - expected_total) < 1.0,
            f"last record distance={last_dist:.1f}m, expected ~{expected_total:.1f}m",
        ))

    print_results(results)


def print_results(results):
    print("\n" + "=" * 60)
    print("SplatSync FIT File Test Results")
    print("=" * 60)
    all_pass = True
    for name, passed, detail in results:
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        detail_str = f"  ({detail})" if detail else ""
        print(f"  [{status}] {name}{detail_str}")
    print("=" * 60)
    if all_pass:
        print("  ALL TESTS PASSED")
    else:
        print("  SOME TESTS FAILED")
    print("=" * 60 + "\n")
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    run_tests()
