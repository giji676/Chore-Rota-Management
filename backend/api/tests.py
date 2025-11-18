from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.models import House, HouseMember, Chore, ChoreAssignment, Rota

User = get_user_model()

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

        self.url = reverse("get-houses")

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
            {"id", "username", "is_guest", "role", "joined_at", "device_id"}
        )
        self.assertEqual(member["id"], self.owner.id)
        self.assertEqual(member["role"], "owner")

class DeleteChoreAssignmentTest(APITestCase):
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

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes",
        )

        self.chore_assignment = ChoreAssignment.objects.create(
            rota=self.rota,
            chore=self.chore,
            day="mon",
        )

        self.url = reverse("delete-chore-assignment", kwargs={"assignment_id": self.chore_assignment.id})

    def test_delete_assignment(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ChoreAssignment.objects.filter(rota=self.rota, chore=self.chore).exists())

    def test_invalid_assignment(self):
        url = reverse("delete-chore-assignment", kwargs={"assignment_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("not found", response.data["error"].lower())

    def test_unauthorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("do not belong", response.data["error"].lower())

    def test_as_a_member(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        self.house.add_member(self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

class UpdateChoreAssignmentTest(APITestCase):
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

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes",
        )

        self.chore_assignment = ChoreAssignment.objects.create(
            rota=self.rota,
            chore=self.chore,
            day="mon",
        )

        self.url = reverse("update-chore-assignment", kwargs={"assignment_id": self.chore_assignment.id})

    def test_update_assignment(self):
        self.house.add_member(user=self.guest, role="member")
        response = self.client.patch(self.url, {"day": "tue", "person": self.guest.id, "completed": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual("tue", response.data["assignment"]["day"])
        ca = ChoreAssignment.objects.get(rota=self.rota, chore=self.chore)
        self.assertEqual("tue", ca.day)
        self.assertEqual(True, ca.completed)
        self.assertIsNotNone(ca.completed_at)
        now = timezone.now()
        self.assertTrue((now - ca.completed_at).total_seconds() < 2)  # allow 2-second tolerance

    def test_invalid_assigment(self):
        url = reverse("update-chore-assignment", kwargs={"assignment_id": 999})
        response = self.client.patch(url, {"day": "tue"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("not found", response.data["error"].lower())

    def test_person_not_a_member(self):
        response = self.client.patch(self.url, {"person": 999})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not a member", response.data["error"].lower())

class ChoreAssignTest(APITestCase):
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

        self.chore = Chore.objects.create(
            house=self.house,
            name="dishes",
            description="wash and dry dishes",
        )

        self.url = reverse("assign-chore")

    def test_assign_chore(self):
        self.house.add_member(user=self.guest, role="guest")
        response = self.client.post(self.url, {
            "rota_id": self.rota.id,
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_missing_data(self):
        self.house.add_member(user=self.guest, role="guest")
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing required fields", response.data["error"].lower())

    def test_str_rota_id(self):
        self.house.add_member(user=self.guest, role="guest")
        response = self.client.post(self.url, {
            "rota_id": "str_id",
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("invalid rota", response.data["error"].lower())

    def test_invalid_rota_id(self):
        self.house.add_member(user=self.guest, role="guest")
        response = self.client.post(self.url, {
            "rota_id": 999,
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("invalid rota", response.data["error"].lower())

    def test_unauthorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.post(self.url, {
            "rota_id": self.rota.id,
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("you do not belong", response.data["error"].lower())

    def test_as_a_member(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        self.house.add_member(user=self.guest, role="guest")
        response = client.post(self.url, {
            "rota_id": self.rota.id,
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_chore_id(self):
        self.house.add_member(user=self.guest, role="guest")
        response = self.client.post(self.url, {
            "rota_id": self.rota.id,
            "chore_id": 999,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("chore not found", response.data["error"].lower())

    def test_invalid_person_id(self):
        response = self.client.post(self.url, {
            "rota_id": self.rota.id,
            "chore_id": self.chore.id,
            "person_id": self.guest.id,
            "day": "mon",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not part of this house", response.data["error"].lower())

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

        self.url = reverse("get-house", kwargs={"house_id": self.house.id})

    def test_get_house(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.house.name);

    def test_invalid_house(self):
        url = reverse("get-house", kwargs={"house_id": 999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("no house found", response.data["error"].lower())

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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_house(self):
        url = reverse("delete-house", kwargs={"house_id": 999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class UpdateRotaTest(APITestCase):
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

        self.rota = Rota.objects.create(
            house=self.house,
        )

        self.url = reverse("update-rota", kwargs={"rota_id": self.rota.id})

    def test_update_rota(self):
        start = date.today() + timedelta(days=2)
        end = date.today() + timedelta(days=3)
        response = self.client.patch(self.url, {
            "start_date": start,
            "end_date": end, 
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rota"]["start_date"], start.isoformat())
        self.assertEqual(response.data["rota"]["end_date"], end.isoformat())

    def test_not_authorised(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {
            "start_date": date.today() + timedelta(days=2),
            "end_date": date.today() + timedelta(days=3)
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_owner(self):
        self.house.add_member(user=self.guest, role="member")
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.patch(self.url, {
            "start_date": date.today() + timedelta(days=2),
            "end_date": date.today() + timedelta(days=3)
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("only the owner", response.data["error"].lower())

    def test_invalid_rota(self):
        url = reverse("update-rota", kwargs={"rota_id": 999})
        response = self.client.patch(url, {
            "start_date": date.today() + timedelta(days=2),
            "end_date": date.today() + timedelta(days=3)
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

    def test_create_as_not_a_member(self):
        client = APIClient()
        client.force_authenticate(user=self.guest)
        response = client.post(self.url, self.rota_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("you do not belong", response.data["error"].lower())

    def test_create_missing_data(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("missing house id", response.data["error"].lower())

    def test_create_invalid_house_id(self):
        response = self.client.post(self.url, {"house": "invalid_id"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("invalid house", response.data["error"].lower())

    def test_create_invalid_house_id_2(self):
        response = self.client.post(self.url, {"house": 999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("invalid house", response.data["error"].lower())

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
