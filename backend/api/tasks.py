import datetime
import requests
from django.utils import timezone
from celery import shared_task
from .models import ChoreOccurrence
from accounts.models import PushToken

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


@shared_task
def send_chore_reminders():
    now = timezone.localtime()
    one_hour_later = now + datetime.timedelta(hours=1)

    # +/- 1 min window
    lower = one_hour_later - datetime.timedelta(minutes=1)
    upper = one_hour_later + datetime.timedelta(minutes=1)

    # Fetch occurrences due in ~1 hour, not yet completed or notified
    occurrences_due = ChoreOccurrence.objects.filter(
        completed=False,
        notification_sent=False,
        due_date__gte=lower,
        due_date__lte=upper
    ).select_related("schedule__chore", "schedule__user")

    for occ in occurrences_due:
        user = occ.schedule.user
        if not user:
            continue

        token_obj = PushToken.objects.filter(user=user).first()
        if not token_obj:
            continue

        push_token = token_obj.token

        message = {
            "to": push_token,
            "sound": "default",
            "title": "⏰ Chore Reminder",
            "body": f"You have '{occ.schedule.chore.name}' due in 1 hour.",
            "priority": "high",
        }

        try:
            resp = requests.post(EXPO_PUSH_URL, json=message, timeout=5)
            # Mark notification as sent
            occ.notification_sent = True
            occ.save(update_fields=["notification_sent", "notification_sent_at"])
        except Exception as e:
            print(f"Error sending notification for {user.username}: {e}")
