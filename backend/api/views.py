import requests
from time import timezone
from datetime import datetime
from django.db import transaction
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

class OccurrenceUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        data = request.data

        # ---- IDs ----
        house_id = data.get("house_id")
        chore_id = data.get("chore_id")
        schedule_id = data.get("schedule_id")
        occurrence_id = data.get("occurrence_id")

        # ---- Chore fields ----
        chore_name = data.get("chore_name")
        chore_description = data.get("chore_description")
        chore_color = data.get("chore_color")

        # ---- Schedule fields ----
        assignee_id = data.get("assignee_id")
        start_date = data.get("start_date")
        repeat_delta = data.get("repeat_delta")

        # ---- Occurrence fields ----
        due_date = data.get("due_date")
        completed = data.get("completed")

        # ---- Load objects (scoped & safe) ----
        house = get_object_or_404(House, id=house_id)
        house_member = get_object_or_404(HouseMember, house=house, user=user)

        chore = get_object_or_404(
            Chore,
            id=chore_id,
            house=house
        )

        schedule = get_object_or_404(
            ChoreSchedule,
            id=schedule_id,
            chore=chore
        )

        occurrence = get_object_or_404(
            ChoreOccurrence,
            id=occurrence_id,
            schedule=schedule
        )

        # ---- Permissions ----
        if schedule.user != user and house_member.role != "owner":
            return Response(
                {"error": "Only owner can edit chores assigned to others"},
                status=status.HTTP_403_FORBIDDEN
            )

        # ======================
        # Update Chore
        # ======================
        if chore_name is not None:
            chore.name = chore_name

        if chore_description is not None:
            chore.description = chore_description

        if chore_color is not None:
            chore.color = chore_color

        chore.save()

        # ======================
        # Update Schedule
        # ======================
        assignee = schedule.user
        if assignee_id:
            assignee_member = get_object_or_404(
                HouseMember,
                house=house,
                user_id=assignee_id
            )
            assignee = assignee_member.user

        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        assignee_changed = assignee != schedule.user

        if assignee_changed:
            # ---- Recreate schedule (identity change) ----
            new_schedule = ChoreSchedule.objects.create(
                chore=chore,
                user=assignee,
                start_date=start_date or schedule.start_date,
                repeat_delta=repeat_delta if repeat_delta is not None else schedule.repeat_delta,
            )

            # move occurrence to new schedule
            occurrence.schedule = new_schedule
            schedule.delete()
            schedule = new_schedule
        else:
            # ---- Update schedule in place ----
            if start_date:
                schedule.start_date = start_date

            if repeat_delta is not None:
                schedule.repeat_delta = repeat_delta

            schedule.save()

        # ======================
        # Update Occurrence
        # ======================
        if due_date:
            occurrence.due_date = due_date

        if completed is not None:
            occurrence.completed = completed

        occurrence.save()

        return Response(
            {
                "chore": ChoreSerializer(chore).data,
                "schedule": ChoreScheduleSerializer(schedule).data,
                "occurrence": ChoreOccurrenceSerializer(occurrence).data,
            },
            status=status.HTTP_200_OK
        )

class SheduleCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        data = request.data

        # ---- Chore fields ----
        house_id = data.get("house_id")
        name = data.get("name")
        description = data.get("description")
        color = data.get("color")

        # ---- Schedule fields ----
        assignee_id = data.get("assignee_id")
        start_date = data.get("start_date")
        repeat_delta = data.get("repeat_delta")

        if not all([house_id, name, assignee_id]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST
            )

        house = get_object_or_404(House, id=house_id)
        house_member = get_object_or_404(HouseMember, house=house, user=user)
        assignee = get_object_or_404(HouseMember, house=house, user_id=assignee_id)

        # Only owner can assign chores to others
        if assignee.user_id != user.id and house_member.role != "owner":
            return Response(
                {"error": "Only owner can assign chores to others"},
                status=status.HTTP_403_FORBIDDEN
            )

        # ---- Create Chore ----
        chore_kwargs = {
            "house": house,
            "name": name,
            "description": description,
        }

        if color:
            chore_kwargs["color"] = color

        chore = Chore.objects.create(**chore_kwargs)

        # ---- Create Schedule ----
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        schedule = ChoreSchedule.objects.create(
            chore=chore,
            user=assignee.user,
            start_date=start_date or timezone.now().date(),
            repeat_delta=repeat_delta or {},
        )

        return Response(
            {
                "chore": ChoreSerializer(chore).data,
                "schedule": ChoreScheduleSerializer(schedule).data,
            },
            status=status.HTTP_201_CREATED,
        )

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
        house_data["occurrences"] = occurrences_data

        schedules = (
            ChoreSchedule.objects
            .filter(chore__house=house)
            .select_related("chore", "user")
        )
        schedules_data = ChoreScheduleSerializer(schedules, many=True).data
        house_data["schedules"] = schedules_data

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

        house = get_object_or_404(House, join_code=join_code)

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

    def patch(self, request, house_id):
        user = request.user
        data = request.data

        member = get_object_or_404(HouseMember, user=user)
        house = get_object_or_404(House, id=house_id)

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
        house = get_object_or_404(House, id=house_id)
        house_member = get_object_or_404(HouseMember, house=house, user=request.user)

        if house_member.role != "owner":
            return Response({"error": "Only the owner can delete this house"}, status=status.HTTP_403_FORBIDDEN)

        house.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ChoreOccurrenceManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data

        schedule_id = data.get("schedule_id")
        due_date = data.get("due_date")

        if not all([schedule_id, due_date]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        schedule = get_object_or_404(ChoreSchedule, id=schedule_id)

        occurrence = ChoreOccurrence.objects.create(
            schedule=schedule,
            due_date=due_date,
        )

        serializer = ChoreOccurrenceSerializer(occurrence)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, occurrence_id):
        user = request.user
        data = request.data

        occurrence = get_object_or_404(ChoreOccurrence, id=occurrence_id)
        house_member = get_object_or_404(
            HouseMember,
            house=occurrence.schedule.chore.house,
            user=user)

        if house_member.role != "owner" and user.id != occurrence.schedule.user.id:
            return Response(
                {"error": "Only the owner can perform this action"},
                status=status.HTTP_403_FORBIDDEN
            )

        allowed_fields = ["due_date", "completed"]

        for field, value in data.items():
            if field in allowed_fields:
                setattr(occurrence, field, value)

        occurrence.save()

        return Response(ChoreOccurrenceSerializer(occurrence).data, status=status.HTTP_200_OK)

    def delete(self, request, occurrence_id):
        user = request.user

        occurrence = get_object_or_404(ChoreOccurrence, id=occurrence_id)
        house_member = get_object_or_404(
            HouseMember,
            house=occurrence.schedule.chore.house,
            user=user)

        if house_member.role != "owner" and user.id != occurrence.schedule.user.id:
            return Response(
                {"error": "Only the owner can perform this action"},
                status=status.HTTP_403_FORBIDDEN
            )

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

        if not all([chore_id, user_id]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chore = get_object_or_404(Chore, id=chore_id)
        house_member = get_object_or_404(HouseMember, house=chore.house, user=user)
        target_house_member  = get_object_or_404(HouseMember, house=chore.house, user=user_id)

        if user.id != int(user_id) and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        schedule_kwargs = {
            "chore": chore,
            "user": target_house_member.user,
            "repeat_delta": repeat_delta,
        }
        if start_date:
            schedule_kwargs["start_date"] = start_date

        schedule = ChoreSchedule.objects.create(**schedule_kwargs)

        serializer = ChoreScheduleSerializer(schedule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, schedule_id):
        user = request.user
        data = request.data

        user_id = data.get("user_id")

        schedule = get_object_or_404(ChoreSchedule, id=schedule_id)
        house_member = get_object_or_404(HouseMember, house=schedule.chore.house, user=user)

        if user_id and user.id != int(user_id) and house_member.role != "owner":
            return Response({"error": "Only the owner can perform this action"}, status=status.HTTP_403_FORBIDDEN)

        for field, value in data.items():
            setattr(schedule, field, value)

        schedule.save()

        return Response(ChoreScheduleSerializer(schedule).data, status=status.HTTP_200_OK)

    def delete(self, request, schedule_id):
        user = request.user
        data = request.data

        user_id = data.get("user_id")

        schedule = get_object_or_404(ChoreSchedule, id=schedule_id)
        house_member = get_object_or_404(HouseMember, house=schedule.chore.house, user=user)

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

        house = get_object_or_404(House, id=house_id)

        if not HouseMember.objects.filter(house=house, user=user).exists():
            return Response({"error": "You do not belong to this house"}, status=status.HTTP_403_FORBIDDEN)

        chore_kwargs = {
            "house": house,
            "name": name,
            "description": description,
        }

        if color:
            chore_kwargs["color"] = color

        chore = Chore.objects.create(**chore_kwargs)

        return Response(ChoreSerializer(chore).data, status=status.HTTP_201_CREATED)

    def patch(self, request, chore_id):
        user = request.user
        data = request.data

        chore = get_object_or_404(Chore, id=chore_id)

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

        chore = get_object_or_404(Chore, id=chore_id)

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
