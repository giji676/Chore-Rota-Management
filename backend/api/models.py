import string
import random
from datetime import date, time
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from dateutil.relativedelta import relativedelta
from .helpers.repeat import (
    relativedelta_to_dict,
    dict_to_relativedelta,
    generate_repeat_label,
)

HEX_COLOR_VALIDATOR = RegexValidator(
    regex=r"^#(?:[0-9a-fA-F]{6})$",
    message="Color must be in HEX format, e.g., #A1B2C3."
)

def generate_join_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class House(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    place_id = models.CharField(max_length=255)
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    password = models.CharField(max_length=128)
    max_members = models.PositiveIntegerField(default=6)

    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="HouseMember",
        related_name="houses"
    )
    
    def add_member(self, user, role="member"):
        if HouseMember.objects.filter(house=self, user=user).exists():
            raise ValidationError("User already in this house.")

        current_count = HouseMember.objects.filter(house=self).count()
        if current_count >= int(self.max_members):
            raise ValidationError("House is full.")

        return HouseMember.objects.create(
            house=self,
            user=user,
            role=role
        )

    def set_password(self, raw_password):
            self.password= make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.name

class HouseMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("member", "Member"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    house = models.ForeignKey(House, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "house")

    def __str__(self):
        return f"{self.user.username} in {self.house.name}"

class Chore(models.Model):
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name="chores")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR], default="#3498db")

    def __str__(self):
        return f"{self.name} ({self.house.name})"

class ChoreSchedule(models.Model):
    chore = models.ForeignKey(
        Chore,
        on_delete=models.CASCADE,
        related_name="schedules"
    )

    # assignee for this chore schedule
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chore_schedules"
    )

    start_date = models.DateField(default=timezone.now)
    due_time = models.TimeField(default=time(hour=19, minute=0))

    # JSON with relativedelta fields
    repeat_delta = models.JSONField(default=dict)

    @property
    def delta(self) -> relativedelta:
        return dict_to_relativedelta(self.repeat_delta)

    @delta.setter
    def delta(self, value: relativedelta):
        self.repeat_delta = relativedelta_to_dict(value)

    @property
    def repeat_label(self) -> str:
        return generate_repeat_label(self.delta)

    def next_due_date(self, last_datetime):
        return last_datetime + self.delta

    def __str__(self):
        return f"{self.chore.name} for {self.user.username} ({self.repeat_label})"

    class Meta:
        unique_together = ("chore", "user")

class ChoreOccurrence(models.Model):
    schedule = models.ForeignKey(
        ChoreSchedule,
        on_delete=models.CASCADE,
        related_name="occurrences"
    )

    due_date = models.DateTimeField()

    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    notification_sent = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.completed and not self.completed_at:
            self.completed_at = timezone.now()

        if not self.completed:
            self.completed_at = None

        if self.notification_sent and not self.notification_sent_at:
            self.notification_sent_at = timezone.now()

        if not self.notification_sent:
            self.notification_sent_at = None

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.schedule.chore.name} "
                f"for {self.schedule.user.username} "
                f"on {self.due_date.date()}"
        )
