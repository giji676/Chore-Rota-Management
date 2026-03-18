from django.db import transaction
from .models import *

class HouseService:
    @transaction.atomic
    def create_house(self, data, user):
        """
        Creates a house and assigns the creator as owner.
        """

        password = data.pop("password")

        house = House(**data)
        house.set_password(password)
        house.save()

        # Add creator as owner
        HouseMember.objects.create(
            house=house,
            user=user,
            role="owner"
        )

        return house

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

class MemberAssignmentRuleService:
    def create_rule(self, schedule, rule_type, rotation_offset=0):
        # Prevent duplicate rule creation
        if hasattr(schedule, "assignment_rule"):
            raise ValueError("Schedule already has an assignment rule")

        return MemberAssignmentRule.objects.create(
            schedule=schedule,
            rule_type=rule_type,
            rotation_offset=rotation_offset,
        )

class RotationMemberService:
    def create_rotation_member(self, assignment_rule, user, position):
        return RotationMember.objects.create(
            assignment_rule=assignment_rule,
            user=user,
            position=position,
        )

    def bulk_create_rotation_members(self, assignment_rule, members_data):
        """
        members_data = [
            {"user": user1, "position": 1},
            {"user": user2, "position": 2},
        ]
        """

        # Validate that the assignment rule is a rotation
        if assignment_rule.rule_type != "rotation":
            raise ValueError("Cannot add rotation members to non-rotation rule")

        # Validate that there are no duplicate positions
        positions = [m["position"] for m in members_data]
        if len(positions) != len(set(positions)):
            raise ValueError("Duplicate positions in rotation members")

        rotation_members = [
            RotationMember(
                assignment_rule=assignment_rule,
                user=member["user"],
                position=member["position"],
            )
            for member in members_data
        ]

        return RotationMember.objects.bulk_create(rotation_members)
