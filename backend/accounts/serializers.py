import secrets
from rest_framework import serializers
from django.utils import timezone
from .models import User
from .helpers.verify_email import send_verification_email

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.is_verified = False
        token = secrets.token_urlsafe(32)
        user.verification_token = token
        user.verification_sent_at = timezone.now()
        user.set_password(password)
        user.save()
        send_verification_email(user.email, token)
        return user

class GuestSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=255)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "is_guest",
            "device_id",
            "is_active",
            "is_staff",
            "is_verified",
        ]
