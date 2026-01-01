from dateutil.relativedelta import relativedelta

# --- PRESET REPEAT OPTIONS ---
PRESET_REPEAT_DELTAS = {
    "no_repeat": relativedelta(),
    "every_day": relativedelta(days=1),
    "every_week": relativedelta(weeks=1),
    "every_2_weeks": relativedelta(weeks=2),
    "every_month": relativedelta(months=1),
    "every_year": relativedelta(years=1),
}

# --- Preset Labels ---
PRESET_LABELS = {
    "no_repeat": "No repeat",
    "every_day": "Every day",
    "every_week": "Every week",
    "every_2_weeks": "Every 2 weeks",
    "every_month": "Every month",
    "every_year": "Every year",
}

def relativedelta_to_dict(delta: relativedelta):
    """Convert relativedelta to a JSON-storable dict."""
    return {
        "years": delta.years,
        "months": delta.months,
        "days": delta.days,
        "hours": delta.hours,
        "minutes": delta.minutes,
        "seconds": delta.seconds,
        "microseconds": delta.microseconds,
    }

def dict_to_relativedelta(data: dict) -> relativedelta:
    """Reconstruct relativedelta from its dict form."""
    return relativedelta(
        years=data.get("years", 0),
        months=data.get("months", 0),
        days=data.get("days", 0),
        hours=data.get("hours", 0),
        minutes=data.get("minutes", 0),
        seconds=data.get("seconds", 0),
        microseconds=data.get("microseconds", 0),
    )

def get_repeat_preset_key(delta: relativedelta) -> str | None:
    """Return preset name if delta matches one of the presets."""
    for key, preset in PRESET_REPEAT_DELTAS.items():
        if (
            delta.years == preset.years and
            delta.months == preset.months and
            delta.days == preset.days and
            delta.hours == preset.hours and
            delta.minutes == preset.minutes
        ):
            return key
    return None

def generate_repeat_label(delta: relativedelta) -> str:
    """Return label for a repeat delta (preset or custom)."""
    preset_key = get_repeat_preset_key(delta)
    if preset_key:
        return PRESET_LABELS[preset_key]

    # Custom label
    parts = []
    if delta.years: parts.append(f"{delta.years} year(s)")
    if delta.months: parts.append(f"{delta.months} month(s)")
    if delta.days: parts.append(f"{delta.days} day(s)")
    if delta.hours: parts.append(f"{delta.hours} hour(s)")
    if delta.minutes: parts.append(f"{delta.minutes} minute(s)")

    if not parts:
        return "No repeat"

    return "Every " + ", ".join(parts)
