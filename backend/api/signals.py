from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import ChoreSchedule, ChoreOccurrence
from .helpers.occurrence_utils import generate_occurrences_for_schedule, generate_next_occurrence_after

@receiver(pre_save, sender=ChoreOccurrence)
def chore_occurrence_pre_save(sender, instance, **kwargs):
    # store whether it was completed previously
    if instance.pk:
        try:
            prev = ChoreOccurrence.objects.get(pk=instance.pk)
            instance._was_completed = prev.completed
        except ChoreOccurrence.DoesNotExist:
            instance._was_completed = False
    else:
        instance._was_completed = False

@receiver(post_save, sender=ChoreOccurrence)
def chore_occurrence_post_save(sender, instance, created, **kwargs):
    # don't generate next occurrences for deleted ones
    if instance.deleted_at is not None:
        return

    if (
        not getattr(instance, "_was_completed", False)
        and instance.completed
        and not instance.schedule.deleted_at
    ):
        if (instance.schedule.generate_occurrences):
            generate_next_occurrence_after(instance)

@receiver(post_save, sender=ChoreSchedule)
def schedule_post_save(sender, instance, created, **kwargs):
    if created and not instance.deleted_at:
        generate_occurrences_for_schedule(instance)
