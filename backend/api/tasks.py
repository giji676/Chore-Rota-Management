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
    one_hour_later = now + datetime.timedelta(minutes=10)

    today_abbrev = now.strftime("%a").lower()[:3]   # "mon"
    today_full = now.strftime("%A") 
    tomorrow_str = (now + datetime.timedelta(days=1)).strftime("%a").lower()[:3]

    # Time window: ±1 minute around the target time
    lower = one_hour_later - datetime.timedelta(minutes=1)
    upper = one_hour_later + datetime.timedelta(minutes=1)

    # Case A — same day (not crossing midnight)
    chores_due = ChoreAssignment.objects.filter(
        due_time__gte=lower.time(),
        due_time__lte=upper.time())

    print("Found chores:", chores_due.count())

    for chore in chores_due:
        user = chore.person
        print(user)
        if not user:
            print("no user")
            continue
        token_obj = PushToken.objects.filter(user=user).first()
        if not token_obj:
            print("no token")
            continue

        push_token = token_obj.token
        print("token:", push_token)

        message = {
            "to": push_token,
            "sound": "default",
            "title": "⏰ Chore Reminder",
            "body": f"You have '{chore.chore.name}' due in 1 hour.",
            "priority": "high"
        }

        res = requests.post(EXPO_PUSH_URL, json=message, timeout=5)
        print("Expo res:", res.json())
