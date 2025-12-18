from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.models import House, HouseMember, Chore, ChoreSchedule, ChoreOccurrence

User = get_user_model()

class DeleteChoreScheduleTest(APITestCase):
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
        self.house.add_member(user=self.guest, role="member")

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes"
        )

        self.schedule = ChoreSchedule.objects.create(
            chore=self.chore,
            user=self.guest,
            start_date="2025-12-20",
            repeat_delta={"days": 1},
        )

        self.url = reverse("delete-schedule", kwargs={"schedule_id": self.schedule.id})

    def test_delete_schedule(self):
        response = self.client.delete(self.url, {"user_id": self.guest.id})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ChoreSchedule.objects.filter(id=self.schedule.id).exists())

    def test_non_owner_cannot_delete(self):
        client = APIClient()
        client.force_authenticate(self.guest)
        # authed as guest (member), tries to delete someone elses (owners)
        response = client.delete(self.url, {"user_id": self.owner.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_schedule(self):
        url = reverse("delete-schedule", kwargs={"schedule_id": 999})
        response = self.client.delete(url, {"user_id": self.guest.id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class UpdateChoreScheduleTest(APITestCase):
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
        self.house.add_member(user=self.guest, role="member")

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes"
        )

        self.schedule = ChoreSchedule.objects.create(
            chore=self.chore,
            user=self.guest,
            start_date="2025-12-20",
            repeat_delta={"days": 1},
        )

        self.url = reverse("update-schedule", kwargs={"schedule_id": self.schedule.id})

    def test_update_schedule(self):
        data = {"repeat_delta": {"days": 2}}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["repeat_delta"], {"days": 2})

    def test_non_owner_cannot_update_other(self):
        client = APIClient()
        client.force_authenticate(self.guest)
        data = {"repeat_delta": {"days": 3}, "user_id": self.owner.id}
        response = client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_schedule(self):
        url = reverse("update-schedule", kwargs={"schedule_id": 999})
        response = self.client.patch(url, {"repeat_delta": {"days": 2}}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_not_in_house(self):
        outsider = User.objects.create_user(username="outsider", password="123")
        client = APIClient()
        client.force_authenticate(outsider)
        data = {"repeat_delta": {"days": 5}}
        response = client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class CreateChoreScheduleTest(APITestCase):
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
        self.house.add_member(user=self.guest, role="member")

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes"
        )

        self.url = reverse("create-schedule")

    def test_create_schedule(self):
        data = {
            "chore_id": self.chore.id,
            "user_id": self.guest.id,
            "start_date": "2025-12-20",
            "repeat_delta": {"days": 1},
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["chore"], self.chore.id)
        self.assertEqual(response.data["user"], self.guest.id)

    def test_missing_fields(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing required fields", response.data["error"].lower())

    def test_non_owner_assign_other(self):
        # guest trying to assign schedule to owner
        client = APIClient()
        client.force_authenticate(user=self.guest)
        data = {
            "chore_id": self.chore.id,
            "user_id": self.owner.id,
            "start_date": "2025-12-20",
            "repeat_delta": {"days": 1},
        }
        response = client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_chore(self):
        data = {
            "chore_id": 999,
            "user_id": self.guest.id,
            "start_date": "2025-12-20",
            "repeat_delta": {"days": 1},
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_not_in_house(self):
        outsider = User.objects.create_user(username="outsider", password="123")
        data = {
            "chore_id": self.chore.id,
            "user_id": outsider.id,
            "start_date": "2025-12-20",
            "repeat_delta": {"days": 1},
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class DeleteChoreOccurrenceTest(APITestCase):
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
            description="wash dishes",
        )

        self.schedule = ChoreSchedule.objects.create(
            chore=self.chore,
            user=self.owner,
            repeat_delta={}
        )

        self.occurrence = ChoreOccurrence.objects.create(
            schedule=self.schedule,
            due_date=timezone.now()
        )

        self.url = reverse("delete-occurrence", kwargs={
            "occurrence_id": self.occurrence.id
        })

    def test_delete_occurrence(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            ChoreOccurrence.objects.filter(id=self.occurrence.id).exists()
        )

    def test_not_part_of_house(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_occurrence(self):
        url = reverse("delete-occurrence", kwargs={"occurrence_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_as_member(self):
        self.house.add_member(user=self.guest, role="guest")
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class UpdateChoreOccurrenceTest(APITestCase):
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
            description="wash dishes",
        )

        self.schedule = ChoreSchedule.objects.create(
            chore=self.chore,
            user=self.owner,
            repeat_delta={}
        )

        self.occurrence = ChoreOccurrence.objects.create(
            schedule=self.schedule,
            due_date=timezone.now()
        )

        self.url = reverse("update-occurrence", kwargs={
            "occurrence_id": self.occurrence.id
        })

    def test_update_occurrence(self):
        response = self.client.patch(self.url, {"completed": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["completed"])

    def test_not_part_of_house(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {"completed": True})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_occurrence(self):
        url = reverse("update-occurrence", kwargs={"occurrence_id": 999})
        response = self.client.patch(url, {"completed": True})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_as_member(self):
        self.house.add_member(user=self.guest, role="guest")
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.patch(self.url, {"completed": True})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class CreateChoreOccurrenceTest(APITestCase):
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
            description="wash dishes",
        )

        self.schedule = ChoreSchedule.objects.create(
            chore=self.chore,
            user=self.owner,
            repeat_delta={}
        )

        self.url = reverse("create-occurrence")

    def test_create_occurrence(self):
        response = self.client.post(self.url, {
            "schedule_id": self.schedule.id,
            "due_date": timezone.now()
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_missing_fields(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing required fields", response.data["error"].lower())

    def test_invalid_schedule(self):
        response = self.client.post(self.url, {
            "schedule_id": 999,
            "due_date": timezone.now()
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class UpdateHouseTest(APITestCase):
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

        self.url = reverse("update-house", kwargs={"house_id": self.house.id})

    def test_update_house(self):
        response = self.client.patch(self.url, {"max_members": 8, "password": "new_password_123"})
        self.house.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["max_members"], 8)
        self.assertTrue(self.house.check_password("new_password_123"))

    def test_invalid_house(self):
        url = reverse("update-house", kwargs={"house_id": 999})
        response = self.client.patch(url, {"max_members": 8})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_as_member(self):
        self.house.add_member(user=self.guest, role="guest")
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.patch(self.url, {"max_members": 8})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_part_of_house(self):
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.patch(self.url, {"max_members": 8})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class UsersHousesTest(APITestCase):
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

        self.url = reverse("user-houses")

    def test_get_houses(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_dont_return_wrong_house_data(self):
        other_house = House.objects.create(
            name="Other",
            address="Other St",
            place_id="PID2",
            max_members=4
        )
        other_house.set_password("abc")
        other_house.save()

        response = self.client.get(self.url)

        ids = [h["id"] for h in response.data]
        self.assertIn(self.house.id, ids)
        self.assertNotIn(other_house.id, ids)

    def test_members_structure(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

        house = response.data[0]
        members = house["members"]

        self.assertEqual(len(members), 1)

        member = members[0]
        self.assertEqual(
            set(member.keys()),
            {"id", "username", "is_guest", "role", "joined_at"}
        )
        self.assertEqual(member["id"], self.owner.id)
        self.assertEqual(member["role"], "owner")

class HouseGetTest(APITestCase):
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

        self.url = reverse("house-details", kwargs={"house_id": self.house.id})

    def test_get_house(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.house.name);

    def test_invalid_house(self):
        url = reverse("house-details", kwargs={"house_id": 999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # 404 from get_object_or_404 shortcut

    def test_not_part_of_house(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class HouseDeleteTest(APITestCase):
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

        self.url = reverse("delete-house", kwargs={"house_id": self.house.id})

    def test_delete_house(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(House.objects.filter(id=self.house.id).exists())

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_house(self):
        url = reverse("delete-house", kwargs={"house_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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
        self.assertEqual(response.data["description"], "only wash")

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {"description": "only wash"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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
            "color": "#ff0000",
        }

    def test_create_chore(self):
        response = self.client.post(self.url, self.chore_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_missing_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_existant_house_id(self):
        chore_data = self.chore_data
        chore_data["house_id"] = -999
        response = self.client.post(self.url, chore_data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthorised(self):
        client = APIClient()
        client.force_authenticate(self.guest)
        response = client.post(self.url, self.chore_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

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

    def test_already_in_room(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)
        response = client.post(self.url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_passwoord(self):
        response = self.client.post(self.url, {"password": "invalid_password"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("wrong password", response.data["error"].lower())

    def test_invalid_join_code(self):
        url = reverse("join-house", kwargs={"join_code": "INVALID_CODE"})
        response = self.client.post(url, {"password": "housepassword"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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
