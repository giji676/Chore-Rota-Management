from rest_framework import serializers
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
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
            "is_guest",
            "device_id",
            "is_active",
            "is_staff"
        ]
