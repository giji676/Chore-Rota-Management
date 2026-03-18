from datetime import date
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import *
from accounts.serializers import UserSerializer

User = get_user_model()

class HouseCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = House
        fields = [
            "name",
            "address",
            "place_id",
            "password",
            "max_members",
        ]
        extra_kwargs = {
            "address": {"required": False, "allow_null": True, "allow_blank": True},
            "place_id": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate(self, data):
        address = data.get("address")
        place_id = data.get("place_id")

        # Normalize empty strings -> None
        if address == "":
            address = None
        if place_id == "":
            place_id = None

        data["address"] = address
        data["place_id"] = place_id

        # Dependency validation
        if address and not place_id:
            raise serializers.ValidationError(
                {"place_id": "place_id is required when address is provided"}
            )

        if place_id and not address:
            raise serializers.ValidationError(
                {"address": "address is required when place_id is provided"}
            )

        return data

    def create(self, validated_data):
        password = validated_data.pop("password")

        house = House(**validated_data)
        house.set_password(password)
        house.save()

        return house

class HouseReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = [
            "id",
            "name",
            "address",
            "place_id",
            "join_code",
            "max_members",
            "version",
        ]

class ChoreCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = [
            "name",
            "description",
            "color",
        ]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value

class ChoreReaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = ["id", "name", "description", "color", "version"]

class ChoreScheduleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChoreSchedule
        fields = [
            "chore",
            "start_date",
            "repeat_unit",
            "repeat_interval",
            "constraints",
            "end_date",
        ]

    def validate_repeat_interval(self, value):
        if value < 1:
            raise serializers.ValidationError("Must be >= 1")
        return value

    def validate_constraints(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object")

        weekdays = value.get("weekdays")
        if weekdays:
            if not isinstance(weekdays, list):
                raise serializers.ValidationError("weekdays must be a list")

            if not all(isinstance(d, int) and 0 <= d <= 6 for d in weekdays):
                raise serializers.ValidationError("weekdays must be integers 0–6")

        return value

    def validate(self, data):
        start = data.get("start_date")
        end = data.get("end_date")

        if end and start and end < start:
            raise serializers.ValidationError(
                "end_date must be after start_date"
            )

        return data

class ChoreScheduleReadSerializer(serializers.ModelSerializer):
    chore = ChoreReaderSerializer(read_only=True)

    class Meta:
        model = ChoreSchedule
        fields = [
            "id",
            "chore",
            "start_date",
            "repeat_unit",
            "repeat_interval",
            "constraints",
            "end_date",
            "version",
        ]
