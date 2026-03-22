from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from .models import House
from .serializers import *
from .services import HouseService

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
        try:
            house = service.join_house(request.user, join_code, password)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        try:
            updated_house = service.update_house(house, request.user, serializer.validated_data)
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)

        response_serializer = HouseReadSerializer(updated_house)
        return Response(response_serializer.data)

    def delete(self, request, id):
        house = get_object_or_404(House, id=id)

        service = HouseService()
        try:
            service.delete_house(house, request.user)
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)

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
