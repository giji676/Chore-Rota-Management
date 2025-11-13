from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from api.models import House, HouseMember

User = get_user_model()

class ManageHouseTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="OwnerUsername", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house_data = {
            "name": "1 Street",
            "password": "housepassword",
            "max_members": 6
        }

        self.url = reverse("create-house")

    def test_create_house(self):
        response = self.client.post(self.url, self.house_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        house = House.objects.get(name=self.house_data["name"])
        self.assertEqual(house.max_members, self.house_data["max_members"])
        self.assertIsNotNone(house.join_code)
        # Make sure password isn's getting saved as plain password
        self.assertNotEqual(house.password, self.house_data["password"])

        house_member = HouseMember.objects.get(house=house, user=self.owner)
        self.assertEqual(house_member.role, "owner")

    def test_create_house_no_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_house_no_password(self):
        response = self.client.post(self.url, {"name": "1 Street"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password is required", response.data["error"].lower())

    def test_create_house_no_name(self):
        response = self.client.post(self.url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name is required", response.data["error"].lower())
