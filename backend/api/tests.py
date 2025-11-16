from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from api.models import House, HouseMember

User = get_user_model()

class JoinHouseTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.guest)

        self.house = House.objects.create(
            name="Crescent",
            address= "10A the crescent",
            place_id= "TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")
        self.url = reverse("join-house", kwargs={"join_code": self.house.join_code})

    def test_max_users(self):
        self.house.max_members = 1
        self.house.save()
        response = self.client.post(self.url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("house is full", response.data["error"].lower())

    def test_already_in_room(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)
        response = client.post(self.url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already in", response.data["error"].lower())

    def test_wrong_passwoord(self):
        response = self.client.post(self.url, {"password": "invalid_password"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("wrong password", response.data["error"].lower())

    def test_invalid_join_code(self):
        url = reverse("join-house", kwargs={"join_code": "INVALID_CODE"})
        response = self.client.post(url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid join code", response.data["error"].lower())

    def test_no_password(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password required", response.data["error"].lower())

    def test_join_success(self):
        response = self.client.post(self.url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(HouseMember.objects.filter(house=self.house, user=self.guest).exists())

class HouseFlowTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.url = reverse("create-house")

        self.address = "10A the crescent"
        self.place_id = "TEST_PLACE_ID"
        self.house_data = {
            "name": "Crescent",
            "address": self.address,
            "place_id": self.place_id,
            "password": "housepassword",
            "max_members": 6
        }

    def test_anonymous_user(self):
        client = APIClient()
        response = client.post(self.url, self.house_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_house(self):
        response = self.client.post(self.url, self.house_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Validate house created correctly
        house = House.objects.get(place_id=self.place_id)
        self.assertNotEqual(house.password, self.house_data["password"])  # password should be hashed
        self.assertEqual(HouseMember.objects.filter(house=house).count(), 1)

        # Validate owner assigned
        member = HouseMember.objects.get(house=house, user=self.user)
        self.assertEqual(member.role, "owner")

    def test_missing_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing required fields", response.data["error"].lower())
