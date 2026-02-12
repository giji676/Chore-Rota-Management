from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from .helpers.generate_avatar import generate_avatar

@receiver(post_save, sender=User)
def create_avatar(sender, instance, created, **kwargs):
    if created and not instance.avatar:
        path = generate_avatar(
            initials=f"{instance.first_name[0]}{instance.last_name[0]}",
        )
        instance.avatar = path
        instance.save(update_fields=["avatar"])
