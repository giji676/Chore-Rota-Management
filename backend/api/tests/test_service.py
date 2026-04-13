import factory
import datetime as dt

from rest_framework.test import APITestCase, APIClient

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.http import Http404

from api.services import OccurrenceService
from api.models import *
from api.serializers import *

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Sequence(lambda n: f"user{n}")
    password = factory.PostGenerationMethodCall("set_password", "password123")

class HouseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = House
    name = "house-name"
    address = "house-address"
    max_members = 6
    password = factory.PostGenerationMethodCall("set_password", "house-password")

class ChoreFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Chore
    house = factory.SubFactory(HouseFactory)
    name = "chore-name"
    description = "chore-description"
    color = "#ff0000"

class ScheduleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ChoreSchedule
    chore = factory.SubFactory(ChoreFactory)
    start_date = dt.datetime(2026, 1, 25, tzinfo=dt.timezone.utc)
    repeat_unit = "day"
    repeat_interval = 1

class MemberAssignmentRuleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MemberAssignmentRule
    schedule = factory.SubFactory(ScheduleFactory)
    rule_type = "fixed",
    rotation_offset = 0

class RotationMemberFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RotationMember
    user = factory.SubFactory(UserFactory)
    assignment_rule = factory.SubFactory(MemberAssignmentRuleFactory)
    position = 0

class TestOccurrenceService(TestCase):
    def setUp(self):
        self.owner = UserFactory()
        self.house = HouseFactory()
        self.house.add_member(user=self.owner, role="owner")
        self.chore = ChoreFactory(house=self.house)
        self.schedule = ScheduleFactory(
            chore=self.chore,
            repeat_unit="day",
            repeat_interval=1
        )
        self.assignment_rule = MemberAssignmentRuleFactory(schedule=self.schedule)
        self.rotation_member = RotationMemberFactory(
            assignment_rule=self.assignment_rule,
            user=self.owner)
        self.service = OccurrenceService()

    def test_change_due_date_and_user(self):
        new_assignee = UserFactory()
        occ = ChoreOccurrence.objects.create(
            schedule=self.schedule,
            due_date=self.schedule.start_date,
            original_due_date=self.schedule.start_date,
            assigned_user=self.rotation_member.user
        )
        new_due_date = self.schedule.start_date + dt.timedelta(days=2)
        changes = {
            "occurrence_id": occ.id,
            "edit_mode": "single",
            "changes": {
                "due_date": new_due_date.isoformat(),
                "assigned_user": new_assignee.id
            }
        }
        serializer = OccurrenceUpdateSerializer(data=changes)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        updated_occ = self.service.edit_single(
            data["occurrence_id"],
            data["changes"]
        )
        self.assertEqual(updated_occ.due_date, new_due_date)
        self.assertEqual(updated_occ.original_due_date, self.schedule.start_date)
        self.assertEqual(updated_occ.assigned_user, new_assignee)

    def test_resolve_temp_occ(self):
        occ_id = f"temp_{self.schedule.id}_{self.schedule.start_date.isoformat()}"
        resolved = self.service.resolve_occurrence(occ_id)
        self.assertTrue(resolved.is_temp)
        self.assertIsInstance(resolved.temp_id, str)
        self.assertTrue(resolved.temp_id.startswith("temp_"))
        self.assertIsInstance(resolved, ChoreOccurrence)

    def test_resolve_db_occ(self):
        occ = ChoreOccurrence.objects.create(
            schedule=self.schedule,
            due_date=self.schedule.start_date,
            original_due_date=self.schedule.start_date,
            assigned_user=self.rotation_member.user
        )
        resolved = self.service.resolve_occurrence(occ.id)
        self.assertFalse(resolved.is_temp)
        self.assertEqual(resolved.id, occ.id)
        self.assertIsNone(resolved.temp_id)
        self.assertTrue(isinstance(resolved, ChoreOccurrence))

    def test_resolve_none_occ(self):
        with self.assertRaises(ValueError):
            self.service.resolve_occurrence(None)

    def test_resolve_nonexistent_db_occ(self):
        with self.assertRaises(Http404):
            self.service.resolve_occurrence(999999)

    def test_materialize_temp_occ(self):
        occ = self.service.resolve_occurrence(
            f"temp_{self.schedule.id}_{self.schedule.start_date.isoformat()}"
        )
        db_occ = self.service.materialize_occurrence(occ)
        self.assertFalse(db_occ.is_temp)
        self.assertIsNotNone(db_occ.id)

    def test_materialize_idempotent(self):
        occ = self.service.resolve_occurrence(
            f"temp_{self.schedule.id}_{self.schedule.start_date.isoformat()}"
        )
        occ1 = self.service.materialize_occurrence(occ)
        occ2 = self.service.materialize_occurrence(occ)
        self.assertEqual(occ1.id, occ2.id)

    def test_get_occs_with_saved(self):
        ChoreOccurrence.objects.create(
                schedule=self.schedule,
                due_date=self.schedule.start_date + dt.timedelta(days=5),
                original_due_date=self.schedule.start_date + dt.timedelta(days=5))
        range_length = 9
        from_date_raw = self.schedule.start_date
        to_date_raw = self.schedule.start_date + dt.timedelta(days=range_length)
        from_date = from_date_raw.date().isoformat()
        to_date = to_date_raw.date().isoformat()
        occurrences = self.service.get_occurrences(
            house=self.house,
            from_date=from_date,
            to_date=to_date)

        self.assertNotEqual(occurrences, [])
        self.assertEqual(len(occurrences), range_length+1) # +1 for inclusive end date
        for occ in occurrences:
            self.assertFalse(occ.due_date < from_date_raw)
            self.assertFalse(occ.due_date > to_date_raw)

    def test_get_occs_with_end_date(self):
        self.schedule.end_date = self.schedule.start_date + dt.timedelta(days=5)
        self.schedule.save()
        range_length = 9
        from_date_raw = self.schedule.start_date
        to_date_raw = self.schedule.start_date + dt.timedelta(days=range_length)
        from_date = from_date_raw.date().isoformat()
        to_date = to_date_raw.date().isoformat()
        occurrences = self.service.get_occurrences(
            house=self.house,
            from_date=from_date,
            to_date=to_date)
        self.assertNotEqual(occurrences, [])
        self.assertEqual(len(occurrences), 6) # 5 days + start date
        for occ in occurrences:
            self.assertFalse(occ.due_date < from_date_raw)
            self.assertFalse(occ.due_date > to_date_raw)
