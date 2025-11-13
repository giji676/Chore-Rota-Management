import requests
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import House, HouseMember

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

class JoinHouseView(APIView):
    def post(self, request, join_code):
        if not join_code:
            return Response({"error": "Join code required"}, status=status.HTTP_400_BAD_REQUEST)

class CreateHouseView(APIView):
    def post(self, request):
        user = request.user
        data = request.data

        name = data.get("name")
        address = data.get("address")
        place_id = data.get("place_id")
        password = data.get("password")
        max_members = data.get("max_members", 6)

        if not all([name, address, place_id, password]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate houses with same Google place
        if House.objects.filter(place_id=place_id).exists():
            return Response({"error": "House already exists for this address"}, status=status.HTTP_400_BAD_REQUEST)

        house = House(
            name=name,
            address=address,
            place_id=place_id,
            max_members=max_members,
        )
        house.set_password(password)
        house.save(user=user)

        return Response({
            "message": "House created successfully",
            "house_id": house.id,
            "join_code": house.join_code,
        }, status=status.HTTP_201_CREATED)

class AddressAutocompleteView(APIView):
    def get(self, request):
        input_text = request.query_params.get("q")
        if not input_text:
            return Response({"error": "Missing ?q= parameter"}, status=status.HTTP_400_BAD_REQUEST)

        params = {
            "input": input_text,
            "types": "address",
            "key": settings.GOOGLE_PLACES_KEY,
        }

        r = requests.get(GOOGLE_PLACES_URL, params=params)
        data = r.json()

        return Response(data, status=status.HTTP_200_OK)

class AddressDetailsView(APIView):
    def get(self, request):
        place_id = request.query_params.get("place_id")
        if not place_id:
            return Response({"error": "Missing ?place_id="}, status=status.HTTP_400_BAD_REQUEST)

        params = {
            "place_id": place_id,
            "key": settings.GOOGLE_PLACES_KEY,
        }

        r = requests.get(GOOGLE_DETAILS_URL, params=params)
        data = r.json()

        return Response(data)

