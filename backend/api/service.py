from django.db import transaction
from .models import *


class ChoreManagementService:
    def create_chore(self, data, user):
        return Chore.objects.create(
            house=data["house"],
            name=data["name"],
            description=data["description"],
            color=data.get("color"),
        )

class ChoreScheduleManagementService:
    def create_schedule(self, data, user):
        return ChoreSchedule.objects.create(
            chore=data["chore"],
            start_date=data["start_date"],
            repeat_unit=data["repeat_unit"],
            repeat_interval=data.get("repeat_interval", 1),
            constraints=data.get("constraints", {}),
            end_date=data.get("end_date"),
        )

class ChoreOccurrenceManagementService:
    def create_occurrence(self, schedule, original_due_date, assigned_user=None):
        return ChoreOccurrence.objects.create(
            schedule=schedule,
            assigned_user=assigned_user,
            original_due_date=original_due_date,
            due_date=original_due_date,
        )
