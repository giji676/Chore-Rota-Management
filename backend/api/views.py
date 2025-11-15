import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import House, HouseMember, Chore, ChoreAssignment
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication

User = get_user_model()

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

# TODO: add role checks for everything

class DeleteChoreAssignmentView(APIView):
    def delete(self, request, assignment_id):
        try:
            assignment = ChoreAssignment.objects.get(id=assignment_id)
        except ChoreAssignment.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)

        assignment.delete()
        return Response({"message": "Assignment deleted successfully"}, status=status.HTTP_200_OK)

class UpdateChoreAssignmentView(APIView):
    def patch(self, request, assignment_id):
        data = request.data

        try:
            assignment = ChoreAssignment.objects.get(id=assignment_id)
        except ChoreAssignment.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)

        person_id = data.get("person")
        if person_id:
            if not HouseMember.objects.filter(house=assignment.rota.house, user__id=person_id).exists():
                return Response({"error": "Person not part of this house"}, status=status.HTTP_400_BAD_REQUEST)
            assignment.person = HouseMember.objects.get(house=assignment.rota.house, user__id=person_id).user

        day = data.get("day")
        if day:
            assignment.day = day

        try:
            assignment.save()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Assignment updated successfully",
            "assignment": {
                "id": assignment.id,
                "chore": assignment.chore.name,
                "person": assignment.person.username if assignment.person else None,
                "day": assignment.day
            }
        }, status=status.HTTP_200_OK)

class AssignChoreView(APIView):
    def post(self, request):
        user = request.user
        data = request.data

        rota_id = data.get("rota")
        chore_id = data.get("chore")
        person_id = data.get("person")
        day = data.get("day")

        if not all([rota_id, chore_id, day]):
            return Response(
                {"error": "Missing required fields: rota, chore, day"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rota = Rota.objects.get(id=rota_id)
        except Rota.DoesNotExist:
            return Response({"error": "Rota not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            chore = Chore.objects.get(id=chore_id, house=rota.house)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found in this house"}, status=status.HTTP_404_NOT_FOUND)

        person = None
        if person_id:
            if not HouseMember.objects.filter(house=rota.house, user__id=person_id).exists():
                return Response({"error": "Person not part of this house"}, status=status.HTTP_400_BAD_REQUEST)
            person = HouseMember.objects.get(house=rota.house, user__id=person_id).user

        try:
            assignment, created = ChoreAssignment.objects.update_or_create(
                rota=rota,
                chore=chore,
                day=day,
                defaults={"person": person}
            )
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Chore assigned successfully",
            "assignment": {
                "id": assignment.id,
                "chore": chore.name,
                "person": person.username if person else None,
                "day": day,
                "created": created
            }
        }, status=status.HTTP_200_OK)

class UpdateChoreView(APIView):
    def patch(self, request, chore_id):
        user = request.user
        data = request.data

        try:
            chore = Chore.objects.get(id=chore_id)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_fields = ["name", "description"]

        for field, value in data.items():
            if field in allowed_fields:
                setattr(chore, field, value)

        chore.save()

        return Response({
            "message": "Chore updated successfully",
            "chore": {
                "id": chore.id,
                "name": chore.name,
                "description": chore.description,
                "house": chore.house_id if hasattr(chore, "house_id") else chore.house,
            }
        }, status=status.HTTP_200_OK)

class DeleteChoreView(APIView):
    def delete(self, request, chore_id):
        user = request.user

        try:
            chore = Chore.objects.get(id=chore_id)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=chore.house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        chore.delete()

        return Response({"message": "Chore deleted"}, status=status.HTTP_200_OK)

class CreateChoreView(APIView):
    def post(self, request):
        user = request.user
        data = request.data

        house = data.get("house")
        name = data.get("name")
        description = data.get("description")

        if not all([name, house, description]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house_obj = House.objects.get(id=house)
        except House.DoesNotExist:
            return Response({"error": "Invalid house"}, status=status.HTTP_400_BAD_REQUEST)

        chore = Chore(
            house=house_obj,
            name=name,
            description=description,
        ).save()

        return Response({
            "message": "Successfully create the chore",
            "chore_id": chore.id
        }, status=status.HTTP_201_CREATED)

class JoinHouseView(APIView):
    permission_classes  = [IsAuthenticated]

    def post(self, request, join_code):
        user = request.user
        data = request.data
        password = data.get("password")

        if not join_code:
            return Response({"error": "Join code required"}, status=status.HTTP_400_BAD_REQUEST)

        if not password:
            return Response({"error": "Password required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house = House.objects.get(join_code=join_code)
        except House.DoesNotExist:
            return Response({"error": "Invalid join code"}, status=status.HTTP_400_BAD_REQUEST)

        if not house.check_password(password):
            return Response({"error": "Wrong password"}, status=status.HTTP_403_FORBIDDEN)

        try:
            house.add_member(user)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"error": "Something went wrong"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Joined successfully"}, status=status.HTTP_200_OK)

class CreateHouseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        if (user.is_anonymous):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

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

