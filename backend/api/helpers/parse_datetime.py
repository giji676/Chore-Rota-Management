from datetime import timezone as dt_timezone
from django.utils import timezone
from django.utils.dateparse import parse_datetime


def parse_client_datetime(value: str):
    """
    Accepts JS new Date().toISOString() strings and returns
    a timezone-aware UTC datetime compatible with DateTimeField.
    """

    if not value:
        return None

    dt = parse_datetime(value)

    if dt is None:
        raise ValueError("Invalid datetime format")

    # If naive -> assume UTC from client ISO string
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)

    # Normalize to UTC
    return dt.astimezone(dt_timezone.utc)
