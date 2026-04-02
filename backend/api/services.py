from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db import transaction
from .models import *
from .serializers import *

# TODO: Check for conflicts!!
# TODO: Check if deleted_at__isnull is necessary for .filter

class ChoreService:
    def create_chore(self, house, data, user):
        """
        Create a chore and its nested models.
        """
        schedule_data = data.pop("schedule")
        assignment_data = schedule_data.pop("assignment")
        rotation_members_data = assignment_data.pop("rotation_members", [])

        # 1. Chore
        chore_serializer = ChoreSerializer(data=data)
        chore_serializer.is_valid(raise_exception=True)
        chore = Chore.objects.create(
            house=house,
            **chore_serializer.validated_data
        )

        # 2. Schedule
        schedule_serializer = ScheduleSerializer(data=schedule_data)
        schedule_serializer.is_valid(raise_exception=True)
        schedule = ChoreSchedule.objects.create(
            chore=chore,
            **schedule_serializer.validated_data
        )

        # 3. Assignment Rule (OneToOne)
        assignment_serializer = MemberAssignmentRuleSerializer(data=assignment_data)
        assignment_serializer.is_valid(raise_exception=True)
        assignment = MemberAssignmentRule.objects.create(
            schedule=schedule,
            **assignment_serializer.validated_data
        )

        # 4. Rotation Members
        for member_data in rotation_members_data:
            member_serializer = RotationMemberSerializer(data=member_data)
            member_serializer.is_valid(raise_exception=True)

            RotationMember.objects.create(
                assignment_rule=assignment,
                **member_serializer.validated_data
            )

        return chore

class HouseService:
    def _check_owner(self, house, user):
        membership = house.memberships.filter(
            user=user,
            deleted_at__isnull=True
        ).first()

        if not membership or membership.role != "owner":
            raise PermissionDenied("Only owners can perform this action.")

        return membership

    def _get_member(self, house, member_id):
        member = house.memberships.filter(
            id=member_id,
            deleted_at__isnull=True
        ).first()

        if not member:
            raise ValidationError({
                "member_id": ["Member not found in this house."]
            })

        return member

    def update_house(self, house, user, data):
        """
        Updates a house. Only owners can update.
        """
        # Check ownership
        membership = house.memberships.filter(user=user).first()
        if not membership or membership.role != "owner":
            raise PermissionDenied("Only owners can update the house.")

        # Password handling
        if "password" in data:
            house.set_password(data.pop("password"))

        for attr, value in data.items():
            setattr(house, attr, value)
        house.save()

        return house

    def delete_house(self, house, user):
        """
        Soft delete a house. Only owners can delete.
        """
        membership = house.memberships.filter(user=user).first()
        if not membership or membership.role != "owner":
            raise PermissionDenied("Only owners can delete the house.")

        house.delete()
        return house

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

    @transaction.atomic
    def join_house(self, user, join_code, password=None):
        """
        Joins a user to a house using join_code.
        Raises ValidationError on failure.
        """
        try:
            house = House.objects.get(join_code=join_code)
        except House.DoesNotExist:
            raise ValidationError("Invalid join code.")

        if house.password and not house.check_password(password):
            raise ValidationError("Incorrect password.")
        house.add_member(user)
        return house

    def remove_member(self, house, member_id, user):
        """
        Removes a member from the house. Only owners can remove members.
        """
        self._check_owner(house, user)
        member = self._get_member(house, member_id)
        member.delete()
        return member

    def update_member(self, house, member_id, role, user):
        """
        Update user role. Only owners can change role.
        """
        self._check_owner(house, user)
        member = self._get_member(house, member_id)
        member.role = role
        member.save()
        return member

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
