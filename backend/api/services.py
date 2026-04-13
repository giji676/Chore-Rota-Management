import math
import datetime
from dateutil.relativedelta import relativedelta

from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import *
from .serializers import *
from .helpers.generic_utils import timeit

User = get_user_model()

# TODO: Check for conflicts!!
# TODO: Check if deleted_at__isnull is necessary for .filter

"""
Make naive datetimes timezone aware,
using the current timezone.
If already aware, return as is.
"""
def make_aware_safe(dt):
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


class OccurrenceService:
    @transaction.atomic
    def edit_single(self, occ_id: str | int, changes: dict) -> ChoreOccurrence:
        """
        Edit a single occurrence.
        Possible changes:
        - due_time
        - completed_at
        - assigned_user
        - skipped_at
        """
        occ: ChoreOccurrence = self.resolve_occurrence(occ_id)
        occ: ChoreOccurrence = self.materialize_occurrence(occ)

        due_date = changes.get("due_date")
        if due_date is not None:
            occ.due_date = due_date

        if "completed" in changes:
            occ.set_completed(bool(changes["completed"]))

        if "skipped" in changes:
            occ.set_skipped(bool(changes["skipped"]))

        if "assigned_user" in changes:
            user = get_object_or_404(User, id=changes["assigned_user"])
            occ.assigned_user = user

        occ.save()
        return occ

    @transaction.atomic
    def materialize_occurrence(self, _occ: ChoreOccurrence) -> ChoreOccurrence:
        """
        Convert virtual occurrence to DB occurrence if needed.
        Always returns a persisted ChoreOccurrence.
        """
        if not _occ.is_temp:
            return _occ

        occ, created = ChoreOccurrence.objects.get_or_create(
            schedule=_occ.schedule,
            original_due_date=_occ.original_due_date,
            defaults={
                "due_date": _occ.due_date,
                "assigned_user": _occ.assigned_user,
            }
        )

        return occ

    def resolve_occurrence(self, id: str | int) -> ChoreOccurrence:
        """
        Returns an occurrence object.
        Either generating it in-memory or loading from database
        """
        if id is None:
            raise ValueError("occurrence_id cannot be None")

        if isinstance(id, str) and id.startswith("temp_"):
            _, schedule_id, due_date_str = id.split("_", 2)

            due_date = datetime.datetime.fromisoformat(due_date_str)
            schedule = get_object_or_404(ChoreSchedule, id=schedule_id)
            occ = ChoreOccurrence(
                schedule=schedule,
                due_date=due_date,
                original_due_date=due_date,
                assigned_user=self._get_assigned_member(schedule),
            )
            occ.temp_id = id
            return occ
        return get_object_or_404(ChoreOccurrence, id=id)

    def _get_assigned_member(self, schedule):
        """
        Get the assigned member based on rotation rule for schedule members
        """
        # TODO:Do the actual member offset/rotation calculation
        return RotationMember.objects.filter(assignment_rule__schedule=schedule).first().user

    def get_occurrences(self, house, from_date, to_date):
        """
        Get any already generated/saved occurences,
        and generate the rest without saving them
        """
        saved = self._get_saved_occurrences(house, from_date, to_date)
        generated = self._generate_occurrences(house, saved, from_date, to_date)
        return saved + generated

    def _get_saved_occurrences(self, house, from_date, to_date):
        """ Get a list of already saved occurrences for a house within a date range """
        from_date = datetime.date.fromisoformat(from_date)
        to_date = datetime.date.fromisoformat(to_date)
        return list(ChoreOccurrence.objects.filter(
            schedule__chore__house=house,
            due_date__date__range=(from_date, to_date),
        ))

    # @timeit
    def _generate_occurrences(self, house, saved, from_date, to_date):
        """
        Generate occurrences for all schedules in the house,
        within a date range, excluding already saved occurrences.
        Does not save generated occurrences to the database.
        """
        saved_keys = {
            (occ.schedule_id, occ.original_due_date.date())
            for occ in saved
        }
        from_date = datetime.date.fromisoformat(from_date)
        to_date = datetime.date.fromisoformat(to_date)
        schedules = (
            ChoreSchedule.objects
            .filter(
                chore__house=house,
                start_date__lte=to_date
            )
            .select_related("chore")
            .prefetch_related("assignment_rule__rotation_members")
        )
        occurrences = []
        for schedule in schedules:
            start_date = schedule.start_date.date()
            end_date = schedule.end_date.date() if schedule.end_date else None
            repeat_multipler = None
            match(schedule.repeat_unit.lower()):
                case "day":
                    repeat_multipler = 1
                case "week":
                    repeat_multipler = 7
                case "month":
                    repeat_multipler = 31
                case "year":
                    repeat_multipler = 365

            delta_days = (from_date - start_date).days
            step_days = repeat_multipler * schedule.repeat_interval

            offset = max(0, math.ceil(delta_days / step_days))
            max_iterations = 1000  # safety cap

            while offset < max_iterations:
                if schedule.repeat_unit == "month":
                    due_date = start_date + relativedelta(
                        months=offset * schedule.repeat_interval)
                elif schedule.repeat_unit == "year":
                    due_date = start_date + relativedelta(
                        years=offset * schedule.repeat_interval)
                else:
                    due_date = start_date + datetime.timedelta(days=step_days * offset)

                if due_date > to_date: break
                if end_date and due_date > end_date: break
                if due_date < from_date:
                    offset += 1
                    continue

                offset += 1

                if (schedule.id, due_date) in saved_keys:
                    continue

                rule = getattr(schedule, "assignment_rule", None)
                if not rule:
                    continue

                rot_member = rule.rotation_members.first()
                if not rot_member:
                    continue

                due_datetime = datetime.datetime.combine(
                    due_date,
                    schedule.start_date.timetz()  # preserves time + tz
                )
                occurrence = ChoreOccurrence(
                    schedule=schedule,
                    due_date=due_datetime,
                    original_due_date=due_datetime,
                    assigned_user=rot_member.user
                ) # Not saved to database without .objects.create || .save
                """
                As these objects aren't saved to db, they don't get ids
                so temp_id is set manually. Handeled by serializer in
                to_representation funciton. Which sets the id to temp_id
                if id not present
                """
                occurrence.temp_id = f"temp_{schedule.id}_{due_date.isoformat()}"
                occurrences.append(occurrence)
        return occurrences

class ChoreService:
    @transaction.atomic
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
