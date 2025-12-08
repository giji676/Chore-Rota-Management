import requests
from datetime import datetime
from django.conf import settings
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    House,
    HouseMember,
    Chore,
    ChoreSchedule,
    ChoreOccurrence,
)
from .serializers import (
    HouseSerializer,
    HouseMemberSerializer,
    ChoreSerializer,
    ChoreScheduleSerializer,
    ChoreOccurrenceSerializer,
)
from accounts.models import PushToken

User = get_user_model()

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# TODO: Add patch to HouseMember for changing role
# TODO: HouseManagementView.patch should get house_id as input and update only that house
# TODO: Valudate all inputs and input types to all patch methods

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

class HouseDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, house_id):
        user = request.user

        house = get_object_or_404(House, id=house_id)

        if not house.housemember_set.filter(user=user).exists():
            return Response(
                {"error": "You are not part of this house"},
                status=status.HTTP_403_FORBIDDEN
            )

        house_data = HouseSerializer(house).data

        occurrences = (
            ChoreOccurrence.objects
            .filter(schedule__chore__house=house)
            .select_related("schedule", "schedule__chore", "schedule__user")
        )

        occurrences_data = ChoreOccurrenceSerializer(occurrences, many=True).data

        # Add occurrences to the output
        house_data["occurrences"] = occurrences_data

        return Response(house_data, status=status.HTTP_200_OK)

class UsersHousesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = HouseMember.objects.filter(user=user).select_related("house")
        houses = [m.house for m in memberships]

        serializer = HouseSerializer(houses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

        serializer = HouseSerializer(house)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        user = request.user
        data = request.data

        # User must belong to exactly one house to update it
        try:
            member = HouseMember.objects.get(user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You do not belong to any house"}, status=403)

        house = member.house

        if member.role != "owner":
            return Response({"error": "Only the owner can update the house"}, status=403)

        allowed_fields = ["name", "address", "place_id", "max_members"]

        for field in allowed_fields:
            if field in data:
                setattr(house, field, data[field])

        if "password" in data and data["password"]:
            house.set_password(data["password"])

        house.save()

        serializer = HouseSerializer(house)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, house_id):
        try:
            house = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return Response({"error": "House not found"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            house_member = HouseMember.objects.get(house=house, user=request.user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if house_member.role != "owner":
            return Response({"error": "Only the owner can delete this house"}, status=status.HTTP_403_FORBIDDEN)

        house.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ChoreOccurrenceManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        schedule_id = data.get("schedule_id")
        due_date = data.get("due_date")

        if not all([schedule_id, due_date]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            schedule = ChoreSchedule.objects.get(id=schedule_id)
        except ChoreSchedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        occurrence = ChoreOccurrence.objects.create(
            schedule=schedule,
            due_date=due_date,
        )

        serializer = ChoreOccurrenceSerializer(occurrence)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, occurrence_id):
        user = request.user
        data = request.data

        try:
            occurrence = ChoreOccurrence.objects.get(id=occurrence_id)
        except ChoreSchedule.DoesNotExist:
            return Response({"error": "Occurrence not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            house_member = HouseMember.objects.get(house=occurrence.schedule.chore.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if user.id != house_member.user.id and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = ["due_date", "completed"]

        for field, value in data.items():
            if field in allowed_fields:
                setattr(occurrence, field, value)

        occurrence.save()

        return Response(ChoreOccurrenceSerializer(occurrence).data, status=status.HTTP_200_OK)

    def delete(self, request, occurrence_id):
        user = request.user
        data = request.data

        try:
            occurrence = ChoreOccurrence.objects.get(id=occurrence_id)
        except ChoreSchedule.DoesNotExist:
            return Response({"error": "Occurrence not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=occurrence.schedule.chore.house, user=user).exists():
            return Response({"error": "You are not a part of this house"},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            house_member = HouseMember.objects.get(house=occurrence.schedule.chore.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if user.id != house_member.user.id and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        occurrence.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class ChoreScheduleManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        chore_id = data.get("chore_id")
        user_id = data.get("user_id")
        start_date = data.get("start_date")
        repeat_delta = data.get("repeat_delta")

        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        if not all([chore_id, user_id]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            chore = Chore.objects.get(id=chore_id)
        except Chore.DoesNotExist:
            return Response({"error": "Chore not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            house_member = HouseMember.objects.get(house=chore.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if user.id != int(user_id) and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_house_member = HouseMember.objects.get(house=chore.house, user=user_id)
        except HouseMember.DoesNotExist:
            return Response({"error": "Assigned user not part of this house"}, status=status.HTTP_403_FORBIDDEN)

        schedule = ChoreSchedule.objects.create(
            chore=chore,
            user=target_house_member.user,
            start_date=start_date,
            repeat_delta=repeat_delta,
        )

        serializer = ChoreScheduleSerializer(schedule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, schedule_id):
        user = request.user
        data = request.data

        user_id = data.get("user_id")

        try:
            schedule = ChoreSchedule.objects.get(id=schedule_id)
        except ChoreSchedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        if not HouseMember.objects.filter(house=schedule.chore.house, user=user).exists():
            return Response({"error": "You are not a part of this house"},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            house_member = HouseMember.objects.get(house=chore.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if user.id != int(user_id) and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        for field, value in data.items():
            setattr(schedule, field, value)

        schedule.save()

        return Response(ChoreScheduleSerializer(schedule).data, status=status.HTTP_200_OK)

    def delete(self, request, schedule_id):
        user = request.user
        data = request.data

        user_id = data.get("user_id")

        try:
            schedule = ChoreSchedule.objects.get(id=schedule_id)
        except ChoreSchedule.DoesNotExist:
            return Response({"error": "Schedule not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            house_member = HouseMember.objects.get(house=schedule.chore.house, user=user)
        except HouseMember.DoesNotExist:
            return Response({"error": "You are not a part of this house"}, status=status.HTTP_403_FORBIDDEN)

        if user.id != int(user_id) and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        schedule.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class ChoreManagementView(APIView):
    permission_classes = [IsAuthenticated]

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

        chore.delete()

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
