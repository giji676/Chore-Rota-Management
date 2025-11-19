from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, GuestSerializer
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.permissions import IsAuthenticated, AllowAny

User = get_user_model()

class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({"error": "refresh_token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            new_access = str(refresh.access_token)
            return Response({"access_token": new_access})
        except TokenError as e:
            return Response({"error": "Invalid refresh token", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({"refresh": str(refresh), "access": str(refresh.access_token)})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GuestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GuestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        device_id = serializer.validated_data["device_id"]

        user, created = User.objects.get_or_create(
            device_id=device_id,
            defaults={
                "username": f"guest_{device_id[:6]}",
                "is_guest": True,
            }
        )

        if not created and not user.is_guest:
            user.is_guest = True
            user.save()
        refresh = RefreshToken.for_user(user)

        return Response({
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh)
        })
