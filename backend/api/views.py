import json
import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import House, HouseMember, Chore, ChoreAssignment, Rota
from .serializers import (
    SimpleHouseSerializer,
    ChoreAssignmentSerializer,
    RotaSerializer,
    RotaDetailsSerializer,
    ChoreSerializer,
    HouseMemberSerializer,
)

User = get_user_model()

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


from accounts.models import PushToken

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def send_push_notification(user, title, body):
    tokens = PushToken.objects.filter(user=user).values_list('token', flat=True)

    messages = []
    for token in tokens:
        messages.append({
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": {"extraData": "Optional data"},
        })

    # Expo API supports sending multiple messages at once
    response = requests.post(EXPO_PUSH_URL, json=messages, headers={
        "Accept": "application/json",
        "Content-Type": "application/json"
    })

    print(response.json())

class UsersHousesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = HouseMember.objects.filter(user=user).select_related("house")
        houses = [m.house for m in memberships]

        serializer = SimpleHouseSerializer(houses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DeleteChoreAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, assignment_id):
        user = request.user

        try:
            assignment = ChoreAssignment.objects.get(id=assignment_id)
        except ChoreAssignment.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=assignment.rota.house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        house_member = HouseMember.objects.get(house=assignment.rota.house, user=user)
        if house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"},
                            status=status.HTTP_403_FORBIDDEN)

        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class UpdateChoreAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, assignment_id):
        try:
            assignment = ChoreAssignment.objects.get(id=assignment_id)
        except ChoreAssignment.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not HouseMember.objects.filter(house=assignment.rota.house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()

        if "person" in data:
            person_id = data.get("person")

            if person_id is not None:
                try:
                    house_member = HouseMember.objects.get(
                        house=assignment.rota.house, 
                        user__id=person_id
                    )
                except HouseMember.DoesNotExist:
                    return Response(
                        {"error": "Person is not a member of this house"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                data["person"] = house_member.user.id
            else:
                data["person"] = None

        serializer = ChoreAssignmentSerializer(assignment, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        send_push_notification(user, "Chore updated!", "yayayayayayayayaa")

        return Response(serializer.data, status=status.HTTP_200_OK)

class AssignChoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        rota_id = data.get("rota_id")
        chore_id = data.get("chore_id")
        person_id = data.get("person_id")
        day = data.get("day")

        if not all([rota_id, chore_id, day]):
            return Response(
                {"error": "Missing required fields: rota_id, chore_id, day"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rota = Rota.objects.get(id=int(rota_id))
        except (ValueError, Rota.DoesNotExist):
            return Response({"error": "Invalid rota"}, status=status.HTTP_404_NOT_FOUND)

        try:
            house_member = HouseMember.objects.get(house=rota.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You do not belong to this house"}, status=status.HTTP_403_FORBIDDEN)

        if house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        try:
            chore = Chore.objects.get(id=chore_id, house=rota.house)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        person = None
        if person_id:
            try:
                member = HouseMember.objects.get(house=rota.house, user__id=person_id)
                person = member.user
            except HouseMember.DoesNotExist:
                return Response({"error": "Person not part of this house"}, status=status.HTTP_400_BAD_REQUEST)

        assignment, created = ChoreAssignment.objects.update_or_create(
            rota=rota,
            chore=chore,
            day=day,
            defaults={"person": person}
        )

        serializer = ChoreAssignmentSerializer(assignment)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class HouseRotaListView(APIView):
    def get(self, request, house_id):
        user = request.user

        try:
            rota = Rota.objects.get(id=rota_id)
        except Rota.DoesNotExist:
            return None, Response({"error": "Rota not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = HouseMember.objects.get(house=rota.house, user=user)
        except HouseMember.DoesNotExist:
            return None, Response({"error": "You do not belong to this house"},
                                  status=status.HTTP_403_FORBIDDEN)
        rotas = Rota.objects.filter(house_id=house_id)
        serializer = RotaSerializer(rotas, many=True)
        return Response(serializer.data, status=200)

class RotaManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, rota_id):
        user = request.user

        rota = get_object_or_404(Rota, id=rota_id)

        try:
            member = HouseMember.objects.get(house=rota.house, user=user)
        except HouseMember.DoesNotExist:
            return None, Response({"error": "You do not belong to this house"},
                                  status=status.HTTP_403_FORBIDDEN)

        serializer = RotaDetailsSerializer(rota)
        return Response(serializer.data, status=200)

    def post(self, request):
        user = request.user
        data = request.data

        house_id = data.get("house")
        if not house_id:
            return Response({"error": "Missing house id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house = House.objects.get(id=int(house_id))
        except (ValueError, House.DoesNotExist):
            return Response({"error": "Invalid house"}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = HouseMember.objects.get(house=house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        if member.role != "owner":
            return Response({"error": "Only the owner can perform this action"},
                            status=status.HTTP_403_FORBIDDEN)

        serializer_data = {
            "house": house.id,
        }

        if data.get("start_date"):
            serializer_data["start_date"] = data.get("start_date")

        if data.get("end_date"):
            serializer_data["end_date"] = data.get("end_date")

        serializer = RotaSerializer(data=serializer_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _get_rota_and_check_permissions(self, rota_id, user):
        """
        Shared helper: 
        - fetch rota
        - ensure user belongs to house
        - ensure user is owner
        """
        try:
            rota = Rota.objects.get(id=rota_id)
        except Rota.DoesNotExist:
            return None, Response({"error": "Rota not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = HouseMember.objects.get(house=rota.house, user=user)
        except HouseMember.DoesNotExist:
            return None, Response({"error": "You do not belong to this house"},
                                  status=status.HTTP_403_FORBIDDEN)

        if member.role != "owner":
            return None, Response({"error": "Only the owner can perform this action"},
                                  status=status.HTTP_403_FORBIDDEN)

        return rota, None

    def delete(self, request, rota_id):
        rota, error = self._get_rota_and_check_permissions(rota_id, request.user)
        if error:
            return error

        rota.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, rota_id):
        rota, error = self._get_rota_and_check_permissions(rota_id, request.user)
        if error:
            return error

        allowed_fields = {"start_date", "end_date"}

        update_data = {}
        for field, value in request.data.items():
            if field in allowed_fields:
                update_data[field] = value

        serializer = RotaSerializer(rota, data=update_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

class ChoreManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, chore_id):
        user = request.user
        data = request.data

        try:
            chore = Chore.objects.get(id=chore_id)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=chore.house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        house_member = HouseMember.objects.get(house=chore.house, user=user)
        if house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"},
                            status=status.HTTP_403_FORBIDDEN)

        allowed_fields = ["name", "description", "color"]

        for field, value in data.items():
            if field in allowed_fields:
                setattr(chore, field, value)

        chore.save()

        return Response(ChoreSerializer(chore).data, status=status.HTTP_200_OK)

    def delete(self, request, chore_id):
        user = request.user

        try:
            chore = Chore.objects.get(id=chore_id)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=chore.house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        house_member = HouseMember.objects.get(house=chore.house, user=user)
        if house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"},
                            status=status.HTTP_403_FORBIDDEN)

        chore.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def post(self, request):
        user = request.user
        data = request.data

        house_id = data.get("house_id")
        name = data.get("name")
        description = data.get("description")
        color = data.get("color")

        if not all([name, house_id, description]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house_id = int(house_id)
        except ValueError:
            return Response({"error": "House id must be an int"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return Response({"error": "Invalid house"}, status=status.HTTP_400_BAD_REQUEST)

        if not HouseMember.objects.filter(house=house, user=user).exists():
            return Response({"error": "You do not belong to this house"}, status=status.HTTP_403_FORBIDDEN)

        chore = Chore.objects.create(
            house=house,
            name=name,
            description=description,
            color=color if color else None
        )

        return Response(ChoreSerializer(chore).data, status=status.HTTP_201_CREATED)

class JoinHouseView(APIView):
    permission_classes  = [IsAuthenticated]

    def post(self, request, join_code):
        user = request.user
        data = request.data
        password = data.get("password")

        if not password:
            return Response({"error": "Password required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house = House.objects.get(join_code=join_code)
        except House.DoesNotExist:
            return Response({"error": "Invalid join code"}, status=status.HTTP_400_BAD_REQUEST)

        if not house.check_password(password):
            return Response({"error": "Wrong password"}, status=status.HTTP_403_FORBIDDEN)

        try:
            member = house.add_member(user)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        member_data = HouseMemberSerializer(member).data
        return Response(member_data, status=status.HTTP_200_OK)

class HouseManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        name = data.get("name")
        address = data.get("address")
        place_id = data.get("place_id")
        password = data.get("password")
        max_members = data.get("max_members")

        if not all([name, address, place_id, password]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        house = House(
            name=name,
            address=address,
            place_id=place_id,
            max_members=int(max_members),
        )
        house.set_password(password)
        house.save()
        house.add_member(user=user, role="owner")

        house_data = SimpleHouseSerializer(house).data

        return Response(house_data, status=status.HTTP_201_CREATED)

    def get(self, request, house_id):
        try:
            house = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return Response({"error": "No house found with this ID"}, status=status.HTTP_404_NOT_FOUND)

        house_data = SimpleHouseSerializer(house).data

        return Response(house_data, status=status.HTTP_200_OK)
    
    def delete(self, request, house_id):
        try:
            house = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return Response({"error": "Invalid house"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house_member = HouseMember.objects.get(house=house, user=request.user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a member of this house"}, status=status.HTTP_403_FORBIDDEN)

        if house_member.role != "owner":
            return Response({"error": "Only the owner can delete this house"}, status=status.HTTP_403_FORBIDDEN)

        house.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AddressAutocompleteView(APIView):
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
