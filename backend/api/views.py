import json
import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from .models import House, HouseMember, Chore, ChoreAssignment, Rota
from .serializers import (
    SimpleHouseSerializer,
    ChoreAssignmentSerializer,
    RotaSerializer,
    ChoreSerializer,
    HouseMemberSerializer,
)

User = get_user_model()

GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

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
        return Response({"message": "Assignment deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

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

        person_id = data.get("person")
        if person_id:
            try:
                house_member = HouseMember.objects.get(house=assignment.rota.house, user__id=person_id)
            except HouseMember.DoesNotExist:
                return Response({"error": "Person is not a member of this house"},
                                status=status.HTTP_400_BAD_REQUEST)
            data["person"] = house_member.user.id
        else:
            data["person"] = None

        serializer = ChoreAssignmentSerializer(assignment, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": "Assignment updated successfully",
            "assignment": serializer.data
        }, status=status.HTTP_200_OK)

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

        return Response({
            "message": "Chore assigned successfully",
            "created": created,
            "assignment": serializer.data
        }, status=status.HTTP_201_CREATED)

class RotaManagementView(APIView):
    permission_classes = [IsAuthenticated]

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
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
        }

        serializer = RotaSerializer(data=serializer_data)
        serializer.is_valid(raise_exception=True)

        rota = serializer.save()

        return Response({
            "message": "Successfully created the rota",
            "rota": serializer.data
        }, status=status.HTTP_201_CREATED)

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
        return Response({"message": "Rota deleted"}, status=status.HTTP_204_NO_CONTENT)

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

        return Response({
            "message": "Rota updated successfully",
            "rota": serializer.data
        }, status=status.HTTP_200_OK)

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

        allowed_fields = ["name", "description"]

        for field, value in data.items():
            if field in allowed_fields:
                setattr(chore, field, value)

        chore.save()

        return Response({
            "message": "Chore updated successfully",
            "chore": ChoreSerializer(chore).data
        }, status=status.HTTP_200_OK)

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

        return Response({"message": "Chore deleted"}, status=status.HTTP_204_NO_CONTENT)

    def post(self, request):
        user = request.user
        data = request.data

        house_id = data.get("house_id")
        name = data.get("name")
        description = data.get("description")

        if not all([name, house_id, description]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            try:
                house_id = int(house_id)
            except:
                return Response({"error": "House id must be an int"}, status=status.HTTP_400_BAD_REQUEST)
            house = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return Response({"error": "Invalid house"}, status=status.HTTP_400_BAD_REQUEST)

        if not HouseMember.objects.filter(house=house, user=user).exists():
            return Response({"error": "You do not belong to this house"},
                            status=status.HTTP_403_FORBIDDEN)

        chore = Chore.objects.create(
            house=house,
            name=name,
            description=description,
        )

        return Response({
            "message": "Successfully created the chore",
            "chore": ChoreSerializer(chore).data
        }, status=status.HTTP_201_CREATED)

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
        return Response({"message": "Joined successfully", "member": member_data}, status=status.HTTP_200_OK)

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
        return Response({"success": "House deleted"}, status=status.HTTP_204_NO_CONTENT)

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
