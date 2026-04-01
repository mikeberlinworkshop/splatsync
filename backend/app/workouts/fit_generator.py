"""Generate Garmin FIT files from OTF telemetry data.

This is the core technical piece of SplatSync. It converts minute-level
heart rate telemetry from OTF's API into a valid FIT file that Strava
can ingest with full HR data and correct calories.
"""

from datetime import datetime, timedelta

from fit_tool.fit_file_builder import FitFileBuilder
from fit_tool.profile.messages.event_message import EventMessage
from fit_tool.profile.messages.file_id_message import FileIdMessage
from fit_tool.profile.messages.record_message import RecordMessage
from fit_tool.profile.messages.session_message import SessionMessage
from fit_tool.profile.profile_type import (
    Event,
    EventType,
    FileType,
    Manufacturer,
    Sport,
    SubSport,
)


def datetime_to_fit_timestamp(dt: datetime) -> int:
    """Convert a Python datetime to fit-tool timestamp (milliseconds since Unix epoch)."""
    return round(dt.timestamp() * 1000)


def generate_fit_file(
    start_time: datetime,
    duration_minutes: int,
    total_calories: int,
    avg_hr: int,
    max_hr: int,
    hr_data: list[dict],  # [{"timestamp": datetime, "hr": int}, ...]
    sport_type: str = "training",
    tread_distance_meters: float | None = None,
) -> bytes:
    """Generate a FIT file from OTF workout data.

    Args:
        start_time: Workout start time (UTC)
        duration_minutes: Total workout duration
        total_calories: Total calories burned (from OTF)
        avg_hr: Average heart rate (from OTF)
        max_hr: Max heart rate (from OTF)
        hr_data: List of {"timestamp": datetime, "hr": int} records
        sport_type: "training", "running", or "rowing"
        tread_distance_meters: Treadmill distance if available

    Returns:
        FIT file as bytes
    """
    builder = FitFileBuilder(auto_define=True, min_string_size=50)

    # File ID
    file_id = FileIdMessage()
    file_id.type = FileType.ACTIVITY
    file_id.manufacturer = Manufacturer.DEVELOPMENT.value
    file_id.product = 1
    file_id.serial_number = 12345
    file_id.time_created = datetime_to_fit_timestamp(start_time)
    builder.add(file_id)

    # Start event
    start_event = EventMessage()
    start_event.timestamp = datetime_to_fit_timestamp(start_time)
    start_event.event = Event.TIMER
    start_event.event_type = EventType.START
    builder.add(start_event)

    # Record messages — one per HR data point
    if hr_data:
        for point in hr_data:
            record = RecordMessage()
            record.timestamp = datetime_to_fit_timestamp(point["timestamp"])
            record.heart_rate = point["hr"]
            if tread_distance_meters and "distance" in point:
                record.distance = point["distance"]
            builder.add(record)
    else:
        # No telemetry — generate synthetic records at 1-minute intervals
        for i in range(duration_minutes):
            record = RecordMessage()
            record.timestamp = datetime_to_fit_timestamp(
                start_time + timedelta(minutes=i)
            )
            record.heart_rate = avg_hr
            builder.add(record)

    # Stop event
    end_time = start_time + timedelta(minutes=duration_minutes)
    stop_event = EventMessage()
    stop_event.timestamp = datetime_to_fit_timestamp(end_time)
    stop_event.event = Event.TIMER
    stop_event.event_type = EventType.STOP_ALL
    builder.add(stop_event)

    # Session summary
    sport, sub_sport = _map_sport(sport_type)
    session_msg = SessionMessage()
    session_msg.timestamp = datetime_to_fit_timestamp(end_time)
    session_msg.start_time = datetime_to_fit_timestamp(start_time)
    session_msg.total_elapsed_time = duration_minutes * 60 * 1000  # fit-tool uses milliseconds
    session_msg.total_timer_time = duration_minutes * 60 * 1000
    session_msg.total_calories = total_calories
    session_msg.avg_heart_rate = avg_hr
    session_msg.max_heart_rate = max_hr
    session_msg.sport = sport
    session_msg.sub_sport = sub_sport
    if tread_distance_meters:
        session_msg.total_distance = tread_distance_meters
    session_msg.first_lap_index = 0
    session_msg.num_laps = 1
    builder.add(session_msg)

    # Build the FIT file
    fit_file = builder.build()
    return fit_file.to_bytes()


def _map_sport(sport_type: str) -> tuple[int, int]:
    """Map OTF class type to FIT sport/sub_sport."""
    mapping = {
        "training": (Sport.TRAINING, SubSport.CARDIO_TRAINING),
        "running": (Sport.RUNNING, SubSport.TREADMILL),
        "rowing": (Sport.ROWING, SubSport.INDOOR_ROWING),
    }
    sport, sub = mapping.get(sport_type, mapping["training"])
    return sport.value if hasattr(sport, "value") else sport, (
        sub.value if hasattr(sub, "value") else sub
    )
