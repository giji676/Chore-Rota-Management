import string
import random
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

HEX_COLOR_VALIDATOR = RegexValidator(
    regex=r"^#(?:[0-9a-fA-F]{6})$",
    message="Color must be in HEX format, e.g., #A1B2C3."
)

def generate_join_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class House(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    place_id = models.CharField(max_length=255)
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    password = models.CharField(max_length=128)
    max_members = models.PositiveIntegerField(default=6)
    deleted_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=0)
    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="HouseMember",
        related_name="houses"
    )

    objects = ActiveManager()
    all_objects = models.Manager()
    
    def add_member(self, user, role="member"):
        if HouseMember.objects.filter(
            house=self,
            user=user,
            deleted_at__isnull=True
        ).exists():
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
    deleted_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=0)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("user", "house")

    def __str__(self):
        return f"{self.user.name} in {self.house.name}"

class Chore(models.Model):
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name="chores")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, validators=[HEX_COLOR_VALIDATOR], default="#3498db")
    deleted_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=0)

    objects = ActiveManager()        # default: only active
    all_objects = models.Manager()   # raw access to everything

    def __str__(self):
        return f"{self.name} ({self.house.name})"

class ChoreSchedule(models.Model):
    chore = models.ForeignKey(
        Chore,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    start_date = models.DateTimeField()
    repeat_unit = models.CharField(
        max_length=10,
        choices=[
            ("day", "Day"),
            ("week", "Week"),
            ("month", "Month"),
            ("year", "Year"),
        ]
    )
    repeat_interval = models.IntegerField(default=1)
    constraints = models.JSONField(default=dict, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    deleted_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=0)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["start_date"]),
            models.Index(fields=["end_date"]),
        ]

    def __str__(self):
        return (f"{self.chore.name} starting at {self.start_date} "
            f"every {self.repeat_interval} {self.repeat_unit} until {self.end_date}")

class ChoreOccurrence(models.Model):
    schedule = models.ForeignKey(
        ChoreSchedule,
        on_delete=models.CASCADE,
        related_name="occurrences"
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    original_due_date = models.DateTimeField()
    due_date = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    skipped_at = models.DateTimeField(null=True, blank=True)
    notification_sent_at = models.DateTimeField(null=True, blank=True)

    deleted_at = models.DateTimeField(null=True, blank=True)
    version = models.IntegerField(default=0)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        indexes = [
            models.Index(fields=["schedule", "original_due_date"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["notification_sent_at", "due_date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["schedule", "original_due_date"],
                name="unique_occurrence_override"
            )
        ]

    def mark_completed(self):
        self.completed_at = timezone.now()
        self.save(update_fields=["completed_at"])

    def __str__(self):
        return (f"{self.schedule.chore.name} "
                f"on {self.due_date}")

class MemberAssignmentRule(models.Model):
    schedule = models.OneToOneField(
        ChoreSchedule,
        on_delete=models.CASCADE,
        related_name="assignment_rule"
    )
    rule_type = models.CharField(
        max_length=20,
        choices= [
            ("fixed", "Fixed"),
            ("rotation", "Rotation")
        ]
    )
    rotation_offset = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.schedule} with type: {self.rule_type}"

class RotationMember(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chore_rotations")
    assignment_rule = models.ForeignKey(
        MemberAssignmentRule,
        on_delete=models.CASCADE,
        related_name="rotation_members")
    position = models.PositiveIntegerField()

    class Meta:
        unique_together = ("assignment_rule", "position")
        ordering = ["position"]

    def __str__(self):
        return f"{self.user} at position {self.position}"
