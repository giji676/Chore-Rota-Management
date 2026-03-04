from django.test import TestCase
from accounts.helpers.validate_password import validate_password


class ValidatePasswordTests(TestCase):

    def test_acceptable_password(self):
        """A valid password should not raise an error"""
        try:
            validate_password("Abc123@")
        except ValueError:
            self.fail("validate_password() raised ValueError unexpectedly!")

    def test_too_short(self):
        with self.assertRaises(ValueError) as cm:
            validate_password("Ab3@")
        self.assertIn("at least 6 characters", str(cm.exception))

    def test_too_long(self):
        long_password = "A" * 129 + "a1@"  # over 128 chars
        with self.assertRaises(ValueError) as cm:
            validate_password(long_password)
        self.assertIn("cannot be longer than 128 characters", str(cm.exception))

    def test_missing_lowercase(self):
        with self.assertRaises(ValueError) as cm:
            validate_password("ABC123@")
        self.assertIn("at least one lowercase", str(cm.exception))

    def test_missing_uppercase(self):
        with self.assertRaises(ValueError) as cm:
            validate_password("abc123@")
        self.assertIn("uppercase", str(cm.exception))

    def test_missing_number(self):
        with self.assertRaises(ValueError) as cm:
            validate_password("Abcdef@")
        self.assertIn("at least one number", str(cm.exception))

    def test_missing_special_char(self):
        with self.assertRaises(ValueError) as cm:
            validate_password("Abc1234")
        self.assertIn("special character", str(cm.exception))
