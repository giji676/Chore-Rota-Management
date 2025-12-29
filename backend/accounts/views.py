from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, authenticate
from .serializers import RegisterSerializer, GuestSerializer
from .models import PushToken
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.permissions import IsAuthenticated, AllowAny

User = get_user_model()

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        })

class SavePushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "Token missing"}, status=400)

        PushToken.objects.update_or_create(user=request.user, defaults={"token": token})
        return Response(status=status.HTTP_200_OK)

class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({"error": "refresh_token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            return Response({"access_token": str(refresh.access_token)})
        except TokenError as e:
            return Response({"error": "Invalid refresh token", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()  # save() should handle first_name, last_name, email, password
            refresh = RefreshToken.for_user(user)
            return Response({
                "access_token": str(refresh.access_token),
                "refresh_token": str(refresh)
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GuestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        device_id = data.get("device_id")

        # Try to find an existing user with this device_id
        try:
            user = User.objects.get(device_id=device_id)
        except User.DoesNotExist:
            # Only create a new guest if name is provided
            first_name = data.get("first_name")
            last_name = data.get("last_name")
            if first_name and last_name:
                user = User.objects.create(
                    device_id=device_id,
                    email=f"guest_{device_id[:8]}@example.com",
                    first_name=first_name,
                    last_name=last_name,
                    is_guest=True,
                )
            else:
                return Response(
                    {"detail": "User not found and name not provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        refresh = RefreshToken.for_user(user)
        return Response({
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh)
        })
