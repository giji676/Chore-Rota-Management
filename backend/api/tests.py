from datetime import date
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from api.models import House, HouseMember, Chore, ChoreAssignment, Rota

User = get_user_model()

class RotaDeleteTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house = House.objects.create(
            name="Crescent",
            address= "10A the crescent",
            place_id= "TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")

        self.rota = Rota.objects.create(
            house=self.house,
        )

        self.url = reverse("delete-rota", kwargs={"rota_id": self.rota.id})

    def test_delete_rota(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_rota(self):
        url = reverse("delete-rota", kwargs={"rota_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class RotaCreateTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house = House.objects.create(
            name="Crescent",
            address="address",
            place_id="TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")

        self.rota_data = {
            "house": self.house.id,
            "start_date": date.today(),
        }

        self.url = reverse("create-rota")

    def test_create_rota(self):
        response = self.client.post(self.url, self.rota_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_member(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        self.house.add_member(user=self.guest, role="member")
        response = client.post(self.url, self.rota_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner can perform", response.data["error"].lower())

    def test_create_missing_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing house id", response.data["error"].lower())

    def test_create_invalid_house_id(self):
        response = self.client.post(self.url, {"house": "invalid_id"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("", response.data["error"].lower())

class UpdateChoreTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house = House.objects.create(
            name="Crescent",
            address="10A the crescent",
            place_id="TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes",
        )
        self.url = reverse("update-chore", kwargs={"chore_id": self.chore.id})

    def test_update_chore(self):
        response = self.client.patch(self.url, {"description": "only wash"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["chore"]["description"], "only wash")

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {"description": "only wash"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {"description": "only wash"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_chore(self):
        url = reverse("update-chore", kwargs={"chore_id": 999})
        response = self.client.patch(url, {"description": "only wash"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class DeleteChoreTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house = House.objects.create(
            name="Crescent",
            address= "10A the crescent",
            place_id= "TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes",
        )
        self.url = reverse("delete-chore", kwargs={"chore_id": self.chore.id})

    def test_delete_chore(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_chore(self):
        url = reverse("delete-chore", kwargs={"chore_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class CreateChoreTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password123")
        self.guest = User.objects.create_user(username="guest", password="password123")

        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

        self.house = House.objects.create(
            name="Crescent",
            address= "10A the crescent",
            place_id= "TEST_PLACE_ID",
            max_members=6
        )
        self.house.set_password("housepassword")
        self.house.save()
        self.house.add_member(user=self.owner, role="owner")
        self.url = reverse("create-chore")

        self.chore_data = {
            "house_id": self.house.id,
            "name": "dishes",
            "description": "wash and dry dishes",
        }

    def test_create_chore(self):
        response = self.client.post(self.url, self.chore_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_missing_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing required fields", response.data["error"].lower())

    def test_non_int_house_id(self):
        chore_data = self.chore_data
        chore_data["house_id"] = "str_ID"
        response = self.client.post(self.url, chore_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("must be an int", response.data["error"].lower())

    def test_non_existant_house_id(self):
        chore_data = self.chore_data
        chore_data["house_id"] = -999
        response = self.client.post(self.url, chore_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid house", response.data["error"].lower())

    def test_unauthorised(self):
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.post(self.url, self.chore_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("do not belong", response.data["error"].lower())

class AddressDetailsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("address-details")

    def test_missing_place_id(self):
        response = self.client.get(f"{self.url}?place_id=")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    @patch("api.views.requests.get")
    def test_normal_request(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "result": {
                "formatted_address": "10A The Crescent, Example City",
                "geometry": {
                    "location": {"lat": 51.123, "lng": -0.456}
                },
                "place_id": "TEST_PLACE_ID"
            },
            "status": "OK"
        }
        mock_get.return_value = mock_response

        response = self.client.get(f"{self.url}?place_id=TEST_PLACE_ID")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("result", response.data)
        mock_get.assert_called_once()

class AddressAutocompleteTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("address-autocomplete")

    def test_missing_query(self):
        response = self.client.get(f"{self.url}?q=")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.views.requests.get")
    def test_normal_request(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "predictions": [
                {"description": "10A The Crescent, Test City", "place_id": "PLACE123"}
            ],
            "status": "OK"
        }
        mock_get.return_value = mock_response

        response = self.client.get(f"{self.url}?q=10A the crescent")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("predictions", response.data)
        mock_get.assert_called_once()

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
