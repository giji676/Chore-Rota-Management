from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from api.models import House, HouseMember

User = get_user_model()

class HouseFlowTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.autocomplete_url = reverse("address-autocomplete")
        self.create_house_url = reverse("create-house")
        self.test_query = "10A the crescent"

    @patch("api.views.requests.get")  # patch requests.get for the autocomplete endpoint
    def test_create_house_using_autocomplete(self, mock_get):
        # Mock Google Places Autocomplete response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "predictions": [
                {
                    "description": "10A The Crescent, Egham, UK",
                    "place_id": "ChIJIeOIwFJ3dkgRIJgiM7k5a9g",
                    "structured_formatting": {
                        "main_text": "10A The Crescent",
                        "secondary_text": "Egham, UK"
                    },
                    "types": ["geocode", "premise"]
                },
                {
                    "description": "10A The Crescent, Ripon, UK",
                    "place_id": "ChIJofJZ_EmsfkgR26BlLeBkKWg",
                    "structured_formatting": {
                        "main_text": "10A The Crescent",
                        "secondary_text": "Ripon, UK"
                    },
                    "types": ["geocode", "street_address"]
                }
            ],
            "status": "OK"
        }

        # Call the autocomplete endpoint
        response = self.client.get(f"{self.autocomplete_url}?q={self.test_query}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        predictions = response.json().get("predictions")
        self.assertTrue(predictions)

        # pick the first suggestion
        selected_place = predictions[0]
        place_id = selected_place["place_id"]
        address = selected_place["description"]

        # Call create-house using the place_id from autocomplete
        house_data = {
            "name": "Crescent",
            "address": address,
            "place_id": place_id,
            "password": "housepassword",
            "max_members": 6
        }
        create_response = self.client.post(self.create_house_url, house_data)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        # Validate house created correctly
        house = House.objects.get(place_id=place_id)
        self.assertEqual(house.name, "Crescent")
        self.assertEqual(house.address, address)
        self.assertNotEqual(house.password, house_data["password"])  # password should be hashed

        # Validate owner assigned
        member = HouseMember.objects.get(house=house, user=self.user)
        self.assertEqual(member.role, "owner")
