import factory
import datetime as dt

from rest_framework.test import APITestCase, APIClient

from django.test import TestCase
from django.contrib.auth import get_user_model

from api.services import OccurrenceService
from api.models import *

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

    def test_occurrences_with_saved(self):
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

    def test_occurrences_with_end_date(self):
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
