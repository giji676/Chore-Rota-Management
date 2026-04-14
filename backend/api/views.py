from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404

from .models import House, ChoreOccurrence
from .serializers import *
from .services import HouseService, ChoreService, OccurrenceService

class OccurrenceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, house_id):
        get_object_or_404(House, id=house_id)

        service = OccurrenceService()

        occ_id = request.data.get("occurrence_id")
        mode = request.data.get("edit_mode")

        if not occ_id:
            return Response(
                {"error": "occurrence_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        occ = service.resolve_occurrence(occ_id)
        occ = service.materialize_occurrence(occ)

        if mode == "single":
            occ.set_skipped(True)
            occ.save(update_fields=["skipped_at"])

        elif mode == "future":
            schedule: ChoreSchedule = occ.schedule
            schedule.end_date = occ.original_due_date
            schedule.save(update_fields=["end_date"])

        return Response(
            {"detail": "Occurrence(s) deleted"},
            status=status.HTTP_200_OK
        )

class OccurrenceUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, house_id):
        get_object_or_404(House, id=house_id)

        service = OccurrenceService()

        occ_id = request.data.get("occurrence_id")
        mode = request.data.get("edit_mode")
        changes = request.data.get("changes", {})
        completed = request.data.get("completed")
        skipped = request.data.get("skipped")

        if not occ_id:
            return Response(
                {"error": "occurrence_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        occ: ChoreOccurrence
        if completed is not None:
            occ = service.resolve_occurrence(occ_id)
            occ = service.materialize_occurrence(occ)
            occ.set_completed(bool(completed))
            occ.save(update_fields=["completed_at"])

        elif skipped is not None:
            occ = service.resolve_occurrence(occ_id)
            occ = service.materialize_occurrence(occ)
            occ.set_skipped(bool(skipped))
            occ.save(update_fields=["skipped_at"])

        elif mode == "single":
            occ = service.edit_single(occ_id, changes)

        elif mode == "future":
            print(occ_id, changes)
            schedule = service.edit_future(occ_id, changes)

            # NOTE:
            # this returns schedule, not occurrence
            return Response(
                {"detail": "Future occurrences updated"},
                status=status.HTTP_200_OK
            )

        else:
            return Response(
                {"error": "Invalid request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serialized = OccurrenceSerializer(occ)
        return Response(
            serialized.data,
            status=status.HTTP_200_OK
        )

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
