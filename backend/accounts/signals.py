from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from .helpers.generate_avatar import generate_avatar

# TEMP: Needs to be updated to use all the avatar_* fields
@receiver(post_save, sender=User)
def create_avatar(sender, instance, created, **kwargs):
    if created and not instance.avatar_image:
        path = generate_avatar(
            initials=f"{instance.name[0]}".upper(),
        )
        instance.avatar_image = path
        instance.save(update_fields=["avatar_image"])
