from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import House, HouseMember

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
