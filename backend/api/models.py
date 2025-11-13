import string
import random
from django.db import models, transaction
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password

def generate_join_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class House(models.Model):
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    place_id = models.CharField(max_length=255, unique=True)
    join_code = models.CharField(max_length=8, unique=True, default=generate_join_code)
    password = models.CharField(max_length=128)
    max_members = models.PositiveIntegerField(default=6)

    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="HouseMember",
        related_name="houses"
    )

    def save(self, *args, **kwargs):
        owner_user = kwargs.pop("user", None)
        is_new = self.pk is None

        if not self.join_code:
            self.join_code = generate_join_code()

        super().save(*args, **kwargs)

        # On first save, assign the creator as an owner
        with transaction.atomic():
            super().save(*args, **kwargs)

            if is_new and owner_user is not None:
                # Only create if not already present
                HouseMember.objects.get_or_create(
                    house=self,
                    user=owner_user,
                    defaults={"role": "owner"}
                )

    def generate_place_id(self):
        if not self.address or self.place_id:
            return

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

    def __str__(self):
        return f"{self.name} ({self.house.name})"

class Rota(models.Model):
    house = models.ForeignKey(House, on_delete=models.CASCADE, related_name="rotas")
    start_date = models.DateField()
    end_date = models.DateField()

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

    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("rota", "chore", "day")

    def __str__(self):
        return f"{self.chore.name} - {self.person} on {self.day}"
