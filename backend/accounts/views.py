from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.shortcuts import render, redirect
from .serializers import RegisterSerializer, UserSerializer
from .models import PushToken
from .helpers.verify_email import send_verification_email
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.permissions import IsAuthenticated, AllowAny
import secrets


User = get_user_model()

class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
            if user.is_verified:
                return Response(
                    {"error": "Email already verified. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                token = secrets.token_urlsafe(32)
                user.verification_token = token
                user.verification_sent_at = timezone.now()
                user.save()
                send_verification_email(user.email, token)
                return Response(
                    {"detail": "Verification email sent."},
                    status=status.HTTP_200_OK
                )
        except User.DoesNotExist:
            return Response(
                {"error": "No account associated with this email."},
                status=status.HTTP_404_NOT_FOUND
            )

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.GET.get("token")
        if not token:
            return render(request, "verify_failed.html", {"error": "Token is required"})

        try:
            user = User.objects.get(verification_token=token)
            if timezone.now() - user.verification_sent_at > timezone.timedelta(hours=24):
                return render(request, "verify_failed.html", {"error": "Token has expired"})
            
            user.is_verified = True
            user.verification_token = None
            user.save()
            return render(request, "verify_success.html")
        except User.DoesNotExist:
            return render(request, "verify_failed.html", {"error": "Invalid token"})

class UserView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        serialized = UserSerializer(user)
        return Response(serialized.data, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if not user.is_verified:
            return Response(
                {"error": "Please verify your email before logging in."},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        })

class SavePushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token_value = request.data.get("token")

        if not token_value:
            return Response({"error": "Token missing"}, status=400)

        # Upsert based on (user, token)
        token_obj, created = PushToken.objects.update_or_create(
            user=request.user,
            token=token_value,
        )

        return Response(
            {
                "created": created,
                "token": token_obj.token,
                "created_at": token_obj.created_at,
            },
            status=200,
        )

class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({"error": "refresh_token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            print(refresh)
            return Response({"access_token": str(refresh.access_token)})
        except TokenError as e:
            return Response({"error": "Invalid refresh token", "details": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        try:
            existing_user = User.objects.get(email=email)
            if existing_user.is_verified:
                return Response(
                    {"error": "Email already registered. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # Unverified user -> resend verification email
                token = secrets.token_urlsafe(32)
                existing_user.verification_token = token
                existing_user.verification_sent_at = timezone.now()
                existing_user.save()
                send_verification_email(existing_user.email, token)
                return Response(
                    {"detail": "Account exists but not verified. Verification email resent."},
                    status=status.HTTP_200_OK
                )
        except User.DoesNotExist:
            pass  # New user -> continue with normal registration

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
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
