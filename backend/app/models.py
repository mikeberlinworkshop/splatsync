import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class SyncStatus(str, Enum):
    unmatched = "unmatched"
    matched = "matched"
    synced = "synced"


class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StravaToken(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    access_token: str  # encrypted
    refresh_token: str  # encrypted
    expires_at: datetime
    athlete_id: int


class OtfSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    cognito_token: str  # encrypted - NOT the password
    token_expires_at: Optional[datetime] = None


class WorkoutCache(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    otf_workout_id: str
    workout_date: datetime
    otf_calories: int
    otf_splat_points: int
    otf_avg_hr: int
    otf_max_hr: int
    otf_duration_minutes: int
    otf_class_type: Optional[str] = None
    strava_activity_id: Optional[int] = None
    strava_calories: Optional[int] = None
    strava_avg_hr: Optional[int] = None
    strava_distance: Optional[float] = None
    sync_status: SyncStatus = SyncStatus.unmatched
    last_synced_at: Optional[datetime] = None
