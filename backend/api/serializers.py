from datetime import date
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import *
from accounts.serializers import UserSerializer

User = get_user_model()

class OccurrenceUserReaderSerualizer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "avatar_image"]

class OccurrenceReaderSerializer(serializers.ModelSerializer):
    chore = serializers.SerializerMethodField()
    assigned_user = OccurrenceUserReaderSerualizer(read_only=True)

    class Meta:
        model = ChoreOccurrence
        fields = [
            "id",
            "schedule",
            "chore",
            "original_due_date",
            "due_date",
            "assigned_user",
            "completed_at",
            "skipped_at",
            "notification_sent_at",
            "version",
        ]

    def get_chore(self, obj):
        return ChoreSerializer(obj.schedule.chore).data

class OccurrenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChoreOccurrence
        fields = [
            "id",
            "schedule",
            "original_due_date",
            "due_date",
            "assigned_user",
            "completed_at",
            "skipped_at",
            "notification_sent_at",
            "version",
        ]

class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = ["name", "description", "color"]

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChoreSchedule
        fields = [
            "start_date",
            "end_date",
            "repeat_unit",
            "repeat_interval",
            "constraints"
        ]

class MemberAssignmentRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberAssignmentRule
        fields = ["rule_type", "rotation_offset"]

class RotationMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = RotationMember
        fields = ["user", "position"]

class HouseJoinSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=8)
    password = serializers.CharField(required=False, write_only=True)

class HouseCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
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
        password = data.get("password")
        
        # Normalize empty password to None and check for creation
        if password == "":
            password = None
            data["password"] = None
        
        if not self.instance and not password:
            raise serializers.ValidationError(
                {"password": "Password is required when creating a house"}
            )
        
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
    
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:  # Only update password if it's not None/empty
            instance.set_password(password)
        
        instance.save()
        return instance

class HouseReadSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = House
        fields = [
            "id",
            "name",
            "address",
            "members",
            "place_id",
            "join_code",
            "max_members",
            "version",
        ]

    def get_members(self, obj):
        members = HouseMember.objects.filter(house=obj)
        return HouseMemberReadSerializer(members, many=True).data

class HouseMemberUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=HouseMember.ROLE_CHOICES)

class HouseMemberReadSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = HouseMember
        fields = [
            "id",
            "user",
            "role",
            "joined_at",
        ]

class HouseMemberCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=HouseMember.ROLE_CHOICES)
    class Meta:
        model = HouseMember
        fields = [
            "user",
            "house",
            "role",
        ]

    def validate(self, data):
        user = data["user"]
        house = data["house"]

        if HouseMember.objects.filter(
            user=user,
            house=house,
        ).exists():
            raise serializers.ValidationError(
                "User is already a member of this house"
            )

        return data

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
