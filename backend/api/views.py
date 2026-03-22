from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404

from .models import House
from .serializers import *
from .services import HouseService

class HouseMemberView(APIView):
    permission_classes = [IsAuthenticated]
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
        print("serializing")
        serializer = HouseJoinSerializer(data=request.data)
        print("validating")
        serializer.is_valid(raise_exception=True)

        print("validated")
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
