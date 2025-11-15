from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "password", "email"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email")
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class GuestSerializer(serializers.Serializer):
    device_id = serializers.CharField()
