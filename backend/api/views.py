from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.generics import ListAPIView

from .models import House
from .serializers import *
from .services import HouseService

class HouseJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HouseJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        join_code = serializer.validated_data["join_code"]
        password = serializer.validated_data.get("password")

        service = HouseService()
        try:
            house = service.join_house(request.user, join_code, password)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

class HouseListGenericView(ListAPIView):
    serializer_class = HouseReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only houses the user belongs to
        return House.objects.filter(
            memberships__user=self.request.user,
            memberships__deleted_at__isnull=True
        ).distinct()
