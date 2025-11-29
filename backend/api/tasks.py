import datetime
import requests
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model
from celery import shared_task
from .models import ChoreAssignment
from accounts.models import PushToken

User = get_user_model()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


@shared_task
def send_chore_reminders():
    now = timezone.localtime()
    one_hour_later = now + datetime.timedelta(hours=1)

    # Prepare weekday codes (mon, tue, wed...)
    today_str = now.strftime("%a").lower()[:3]
    tomorrow_str = one_hour_later.strftime("%a").lower()[:3]

    # +/- 1 min window for matching
    lower = one_hour_later - datetime.timedelta(minutes=1)
    upper = one_hour_later + datetime.timedelta(minutes=1)

    # If the time one hour from now is on the next day,
    # check chores assigned for TOMORROW instead of TODAY
    if one_hour_later.date() != now.date():
        day_filter = tomorrow_str           # next day
    else:
        day_filter = today_str              # same day

    chores_due = ChoreAssignment.objects.filter(
        day=day_filter,
        completed=False,
        due_time__gte=lower.time(),
        due_time__lte=upper.time()
    )

    for chore in chores_due:
        user = chore.person
        if not user:
            continue

        token_obj = PushToken.objects.filter(user=user).first()
        if not token_obj:
            continue

        push_token = token_obj.token

        # Expo format
        message = {
            "to": push_token,
            "sound": "default",
            "title": "⏰ Chore Reminder",
            "body": f"You have '{chore.chore.name}' due in 1 hour.",
            "priority": "high",
        }

        try:
            resp = requests.post(EXPO_PUSH_URL, json=message, timeout=5)
        except Exception as e:
            print("Error sending notification:", e)
