import factory
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import PushToken

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "password123")

class TestPushToken(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.user_2 = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_push_token_creation(self):
        url = reverse("push-token")
        response = self.client.post(url, {"token": "token_123"})
        self.assertEqual(response.status_code, 200)

    def test_push_token_duplicate_on_diff_users(self):
        """
        Test that the same token can be registered to different users.
        """
        url = reverse("push-token")
        response = self.client.post(url, {"token": "token_123"})
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(user=self.user_2)
        response = self.client.post(url, {"token": "token_123"})
        self.assertEqual(response.status_code, 200)

    def test_push_token_missing_token_0(self):
        url = reverse("push-token")
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)

    def test_push_token_missing_token_1(self):
        url = reverse("push-token")
        response = self.client.post(url, {"token": ""})
        self.assertEqual(response.status_code, 400)

    def test_push_token_unauthed(self):
        url = reverse("push-token")
        self.client.force_authenticate(user=None)
        response = self.client.post(url, {"token": "token_123"})
        self.assertEqual(response.status_code, 401)

    def test_user_multiple_tokens(self):
        url = reverse("push-token")
        response1 = self.client.post(url, {"token": "token_123"})
        response2 = self.client.post(url, {"token": "token_456"})
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        # Both tokens exist in DB
        self.assertEqual(PushToken.objects.filter(user=self.user).count(), 2)

    def test_idempotent_token_creation(self):
        url = reverse("push-token")
        response1 = self.client.post(url, {"token": "token_123"})
        response2 = self.client.post(url, {"token": "token_123"})
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)

        self.assertEqual(PushToken.objects.filter(user=self.user, token="token_123").count(), 1)

    def test_tokens_linked_to_correct_users(self):
        url = reverse("push-token")
        self.client.post(url, {"token": "token_123"})
        self.client.force_authenticate(user=self.user_2)
        self.client.post(url, {"token": "token_123"})

        self.assertTrue(PushToken.objects.filter(user=self.user, token="token_123").exists())
        self.assertTrue(PushToken.objects.filter(user=self.user_2, token="token_123").exists())

    def test_non_string_token(self):
        url = reverse("push-token")
        response = self.client.post(url, {"token": 12345})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PushToken.objects.filter(user=self.user, token="12345").count(), 1)
