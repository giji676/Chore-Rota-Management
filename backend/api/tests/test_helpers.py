import pytest
from django.test import TestCase

from api.helpers.generic_utils import check_version
from api.exceptions import Conflict


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
