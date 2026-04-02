"""Strava token auto-refresh helper.

Strava access tokens expire every 6 hours. This module checks expiry
and refreshes transparently before returning a ready-to-use client.
"""

import logging
from datetime import datetime

from sqlmodel import Session
from stravalib import Client as StravaClient

from app.auth.crypto import decrypt, encrypt
from app.config import settings
from app.models import StravaToken

logger = logging.getLogger("splatsync")


def get_strava_client(strava_token: StravaToken, session: Session) -> StravaClient:
    """Return a StravaClient with a valid access token, refreshing if expired.

    Args:
        strava_token: The user's StravaToken row (with encrypted fields).
        session: Active SQLModel session for persisting refreshed tokens.

    Returns:
        A StravaClient ready for API calls.
    """
    if strava_token.expires_at < datetime.utcnow():
        logger.info("Strava token expired (expires_at=%s), refreshing", strava_token.expires_at)
        client = StravaClient()
        token_response = client.refresh_access_token(
            client_id=int(settings.strava_client_id),
            client_secret=settings.strava_client_secret,
            refresh_token=decrypt(strava_token.refresh_token),
        )

        strava_token.access_token = encrypt(token_response["access_token"])
        strava_token.refresh_token = encrypt(token_response["refresh_token"])
        strava_token.expires_at = datetime.fromtimestamp(token_response["expires_at"])
        session.add(strava_token)
        session.commit()
        session.refresh(strava_token)
        logger.info("Strava token refreshed, new expiry=%s", strava_token.expires_at)

    return StravaClient(access_token=decrypt(strava_token.access_token))
