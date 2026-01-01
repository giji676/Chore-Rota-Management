from datetime import datetime, date, time as dt_time, timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from dateutil.relativedelta import relativedelta

from ..models import ChoreOccurrence
from ..helpers.repeat_utils import dict_to_relativedelta

def _start_datetime_for_schedule(schedule):
    """
    Return a timezone-aware datetime for the schedule's start.
    Uses schedule.start_date if present, otherwise midnight.
    Handles start_date as either a date object or a string.
    """
    tz = timezone.get_current_timezone()
    start_date = schedule.start_date
    if isinstance(start_date, str):
        start_date = parse_datetime(start_date)

    return timezone.make_aware(start_date, tz) if timezone.is_naive(start_date) else start_date

def generate_occurrences_for_schedule(schedule, days_ahead=30):
    """
    Idempotently ensure there are occurrences up to `today + days_ahead`.
    - If there are no occurrences, start at start_date (or first >= start_date).
    - Else start from last occurrence's due_date + delta.
    - Uses schedule.repeat_delta (JSON) -> relativedelta.
    Returns list of created occurrences.
    """
    created = []
    now = timezone.now()
    horizon = now + timedelta(days=days_ahead)
    delta = dict_to_relativedelta(schedule.repeat_delta)
    if schedule.generate_occurrences is False:
        return created

    # Find last existing occurrence for this schedule
    last_occ = (
        schedule.occurrences
        .order_by("-due_date")
        .first()
    )

    if last_occ:
        next_dt = last_occ.due_date + delta
    else:
        # initial base datetime from start_date/time
        next_dt = _start_datetime_for_schedule(schedule)
        # If start datetime is in the past and delta is zero (no repeat),
        # create a single occurrence at start_date only if not past cutoff.
        if next_dt < now and (delta.years == delta.months == delta.days == delta.hours == delta.minutes == 0):
            # single one-off in past; still create once if not exists
            # we'll still attempt get_or_create below
            pass

    # Advance next_dt forward until it's after now - we want upcoming occurrences too,
    # but we still generate from next_dt up to horizon.
    # This prevents generating occurrences far in the past when schedule started long ago.
    # But we still want occurrences between start_date and horizon if none were created.
    # To be safe: if no last_occ, use start_dt and do not fast-forward past now.
    # If last_occ exists, next_dt already set to last + delta.

    # Loop generating until next_dt > horizon
    while next_dt <= horizon:
        # use microsecond trimming for equality comparison
        due_dt = next_dt.replace(microsecond=0)
        occs = ChoreOccurrence.all_objects.filter(schedule=schedule, due_date=due_dt)
        if occs.count() == 0:
            occ, created_flag = ChoreOccurrence.objects.get_or_create(
                schedule=schedule,
                due_date=due_dt,
                defaults={}
            )
            if created_flag:
                created.append(occ)
        # increment
        next_dt = next_dt + delta

        # safety: if delta is zero, break to avoid infinite loop
        if (delta.years == delta.months == delta.days == delta.hours == delta.minutes == 0 and
            delta.seconds == delta.microseconds == 0):
            break

    return created


def generate_next_occurrence_after(occurrence):
    """
    Called when an occurrence is completed: generate only the immediate next occurrence
    (i.e. occurrence.due_date + delta) if the schedule repeats.
    Returns the created occurrence or None.
    """
    schedule = occurrence.schedule
    delta = dict_to_relativedelta(schedule.repeat_delta)

    # if delta is zero => no repeat
    if (delta.years == delta.months == delta.days == delta.hours == delta.minutes == 0 and
        delta.seconds == delta.microseconds == 0):
        return None

    next_dt = occurrence.due_date + delta
    due_dt = next_dt.replace(microsecond=0)
    occ, created_flag = ChoreOccurrence.objects.get_or_create(
        schedule=schedule,
        due_date=due_dt,
        defaults={}
    )
    return occ if created_flag else None
