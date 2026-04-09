from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404

from .models import House, ChoreOccurrence
from .serializers import *
from .services import HouseService, ChoreService, OccurrenceService

class OccurrenceUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, house_id):
        house = get_object_or_404(House.objects, id=house_id)
        data = request.data
        occ_id = data.get("id")
        is_temp = data.get("is_temp", False)
        completed = data.pop("completed", None)
        if not is_temp and occ_id:
            occurrence = ChoreOccurrence.objects.get(id=occ_id)
        else:
            schedule_id = data.get("schedule")
            schedule = get_object_or_404(ChoreSchedule.objects, id=schedule_id)
            assigned_user_id = data.get("assigned_user")
            assigned_user = get_object_or_404(User, id=assigned_user_id)

            occurrence = ChoreOccurrence.objects.create(
                schedule=schedule,
                due_date=data["due_date"],
                original_due_date=data.get("original_due_date", data["due_date"]),
                assigned_user=assigned_user,
            )

        if completed is not None:
            occurrence.set_completed(bool(completed))

        serializer = OccurrenceSerializer(occurrence, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


class GetOccurrencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, house_id):
        house = get_object_or_404(House.objects, id=house_id)
        from_date = request.GET.get("from")
        to_date = request.GET.get("to")
        service = OccurrenceService()
        occurrences = service.get_occurrences(house=house, from_date=from_date, to_date=to_date)
        occurrence_serializer = OccurrenceSerializer(occurrences, many=True)
        return Response(occurrence_serializer.data, status=status.HTTP_200_OK)

class CreateChoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, house_id):
        house = get_object_or_404(House.objects, id=house_id)
        service = ChoreService()
        chore = service.create_chore(
            house=house,
            data=request.data,
            user=request.user
        )
        response_serializer = ChoreSerializer(chore)
        # TEMP: Update response with generated occurences?
        return Response({"chore": "created"}, status=status.HTTP_201_CREATED)

class HouseMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, house_id, member_id):
        house = get_object_or_404(House.objects, id=house_id)

        serializer = HouseMemberUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = HouseService()
        updated_member = service.update_member(
            house=house,
            member_id=member_id,
            role=serializer.validated_data["role"],
            user=request.user
        )
        response_serializer = HouseMemberReadSerializer(updated_member)

        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, house_id, member_id):
        house = get_object_or_404(House, id=house_id)
        service = HouseService()
        service.remove_member(house, member_id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

class HouseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        house = get_object_or_404(House, id=id)

        serializer = HouseReadSerializer(house)
        return Response(serializer.data)

class HouseJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HouseJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        join_code = serializer.validated_data["join_code"]
        password = serializer.validated_data.get("password")

        service = HouseService()
        house = service.join_house(request.user, join_code, password)

        response_serializer = HouseReadSerializer(house)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

class HouseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HouseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = HouseService()
        house = service.create_house(
            data=serializer.validated_data,
            user=request.user
        )

        response_serializer = HouseReadSerializer(house)

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request, id):
        house = get_object_or_404(House, id=id)
        serializer = HouseCreateSerializer(house, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        service = HouseService()
        updated_house = service.update_house(house, request.user, serializer.validated_data)

        response_serializer = HouseReadSerializer(updated_house)
        return Response(response_serializer.data)

    def delete(self, request, id):
        house = get_object_or_404(House, id=id)

        service = HouseService()
        service.delete_house(house, request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)

class HouseListGenericView(ListAPIView):
    serializer_class = HouseReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only houses the user belongs to
        return House.objects.filter(
            memberships__user=self.request.user,
            memberships__deleted_at__isnull=True
        ).distinct()
