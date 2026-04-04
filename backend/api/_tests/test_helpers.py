import pytest
from django.test import TestCase
from dateutil.relativedelta import relativedelta

from api.exceptions import Conflict
from api.helpers.generic_utils import check_version
import api.helpers.repeat_utils as ru

class TestRepeatLabels(TestCase):
    def test_get_repeat_preset_key(self):
        delta = relativedelta(days=1)
        preset_key = ru.get_repeat_preset_key(delta)
        self.assertEqual(preset_key, "every_day")

    def test_get_repeat_preset_custom_delta(self):
        delta = relativedelta(days=3)
        preset_key = ru.get_repeat_preset_key(delta)
        self.assertEqual(preset_key, None)

    def test_generate_repeat_label_preset(self):
        delta = relativedelta(days=1)
        label = ru.generate_repeat_label(delta)
        self.assertEqual(label, "Every day")

    def test_generate_repeat_label_custom(self):
        delta = relativedelta(days=3)
        label = ru.generate_repeat_label(delta)
        self.assertEqual(label, "Every 3 day(s)")

    def test_generate_repeat_label_custom_composite(self):
        delta = relativedelta(days=3, months=4, years=5)
        label = ru.generate_repeat_label(delta)
        self.assertEqual(label, "Every 5 year(s), 4 month(s), 3 day(s)")

    def test_generate_repeat_label_empty(self):
        delta = relativedelta()
        label = ru.generate_repeat_label(delta)
        self.assertEqual(label, "No repeat")

class TestDictToRelativeDelta(TestCase):
    def test_dict_to_relativedelta(self):
        delta_dict = {
            "years": 1,
            "months": 2,
            "days": 3,
            "hours": 4,
            "minutes": 5,
            "seconds": 6,
            "microseconds": 7,
        }
        delta = ru.dict_to_relativedelta(delta_dict)
        expected_delta = relativedelta(years=1, months=2, days=3, hours=4, minutes=5, seconds=6, microseconds=7)
        self.assertEqual(delta, expected_delta)

    def test_dict_to_relativedelta_missing_fields(self):
        delta_dict = {
            "days": 30,
        }
        delta = ru.dict_to_relativedelta(delta_dict)
        expected_delta = relativedelta(days=30)
        self.assertEqual(delta, expected_delta)

    def test_dict_to_relativedelta_no_fields(self):
        delta_dict = { }
        delta = ru.dict_to_relativedelta(delta_dict)
        expected_delta = relativedelta()
        self.assertEqual(delta, expected_delta)

    def test_dict_to_relativedelta_field_with_0(self):
        delta_dict = {"days": 0}
        delta = ru.dict_to_relativedelta(delta_dict)
        expected_delta = relativedelta()
        self.assertEqual(delta, expected_delta)

class TestRelativeDeltaToDict(TestCase):
    def test_relativedelta_to_dict(self):
        delta = relativedelta(years=1, months=2, days=3, hours=4, minutes=5, seconds=6, microseconds=7)
        delta_dict = ru.relativedelta_to_dict(delta)
        expected_dict = {
            "years": 1,
            "months": 2,
            "days": 3,
            "hours": 4,
            "minutes": 5,
            "seconds": 6,
            "microseconds": 7,
        }
        self.assertEqual(delta_dict, expected_dict)

    def test_relativedelta_to_dict_missing_fields(self):
        delta = relativedelta(days=30)
        delta_dict = ru.relativedelta_to_dict(delta)
        expected_dict = {
            "years": 0,
            "months": 0,
            "days": 30,
            "hours": 0,
            "minutes": 0,
            "seconds": 0,
            "microseconds": 0,
        }
        self.assertEqual(delta_dict, expected_dict)

    def test_relativedelta_to_dict_no_fields(self):
        delta = relativedelta()
        delta_dict = ru.relativedelta_to_dict(delta)
        expected_dict = {
            "years": 0,
            "months": 0,
            "days": 0,
            "hours": 0,
            "minutes": 0,
            "seconds": 0,
            "microseconds": 0,
        }
        self.assertEqual(delta_dict, expected_dict)

class VersionedObject:
    def __init__(self, version: int):
        self.version = version


class NonVersionedObject:
    pass


class TestCheckVersion(TestCase):
    def test_raises_if_client_version_missing(self):
        obj = VersionedObject(version=1)
        with pytest.raises(Conflict, match="version is required"):
            check_version(obj, client_version=None)

    def test_raises_if_client_version_invalid(self):
        obj = VersionedObject(version=1)
        with pytest.raises(Conflict, match="Invalid version value"):
            check_version(obj, client_version="abc")

    def test_raises_if_version_does_not_match(self):
        obj = VersionedObject(version=2)
        with pytest.raises(Conflict, match="has been modified"):
            check_version(obj, client_version=1)

    def test_raises_if_client_version_is_str(self):
        obj = VersionedObject(version=1)
        check_version(obj, client_version="1")

    def test_passes_if_version_matches(self):
        obj = VersionedObject(version=3)
        # should not raise
        check_version(obj, client_version=3)
