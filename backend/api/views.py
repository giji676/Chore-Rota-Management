import requests
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import House, HouseMember

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

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

        return Response(data)

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

class CreateHouseView(APIView):
    def post(self, request):
        user = request.user
        data = request.data

        name = data.get("name")
        address = data.get("address", None)
        password = data.get("password")
        max_members = data.get("max_members", 6)

        if not password:
            return Response({"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not name:
            return Response({"error": "Name is required"}, status=status.HTTP_400_BAD_REQUEST)

        house = House(
            name=name,
            address=address,
            max_members=max_members,
        )

        house.set_password(password)
        house.save(user=user)

        return Response({
            "message": "House created successfully",
            "house_id": house.id,
            "join_code": house.join_code,
        }, status=status.HTTP_201_CREATED)

class JoinHouseView(APIView):
    def post(self, request, join_code):
        if not join_code:
            return Response({"error": "Join code required"}, status=status.HTTP_400_BAD_REQUEST)
