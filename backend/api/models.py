import string
import random
from datetime import date, time
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

class Rota(models.Model):
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name="rotas")
    start_date = models.DateField(default=date.today)  
    end_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rota ({self.house.name}) {self.start_date} - {self.end_date}"

class ChoreAssignment(models.Model):
    rota = models.ForeignKey(Rota, on_delete=models.CASCADE, related_name="assignments")
    chore = models.ForeignKey(Chore, on_delete=models.CASCADE)
    person = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    day = models.CharField(max_length=10, choices=[
        ("mon", "Monday"),
        ("tue", "Tuesday"),
        ("wed", "Wednesday"),
        ("thu", "Thursday"),
        ("fri", "Friday"),
        ("sat", "Saturday"),
        ("sun", "Sunday"),
    ])
    due_time = models.TimeField(default=time(19, 0))

    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("rota", "chore", "day")

    def save(self, *args, **kwargs):
        if self.completed and self.completed_at is None:
            self.completed_at = timezone.now()

        if not self.completed and self.completed_at is not None:
            self.completed_at = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.chore.name} - {self.person} on {self.day}"
