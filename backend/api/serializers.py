from datetime import date
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import House, Chore, HouseMember, ChoreOccurrence, ChoreSchedule
from accounts.serializers import UserSerializer

User = get_user_model()

class HouseMemberSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField(source="user.id")
    email = serializers.ReadOnlyField(source="user.email")
    first_name = serializers.ReadOnlyField(source="user.first_name")
    last_name = serializers.ReadOnlyField(source="user.last_name")
    is_guest = serializers.ReadOnlyField(source="user.is_guest")
    label = serializers.SerializerMethodField()

    class Meta:
        model = HouseMember
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_guest",
            "role",
            "joined_at",
            "label",
            "version",
        ]

    def get_label(self, obj):
        first = obj.user.first_name or ""
        last_initial = obj.user.last_name[0].upper() if obj.user.last_name else ""
        return f"{first}{'.' + last_initial if last_initial else ''}"

class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = "__all__"

class ChoreScheduleSerializer(serializers.ModelSerializer):
    chore_name = serializers.CharField(source="chore.name", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)
    repeat_label = serializers.CharField(read_only=True)

    class Meta:
        model = ChoreSchedule
        fields = [
            "id",
            "chore",
            "chore_name",
            "user",
            "user_name",
            "start_date",
            "repeat_delta",
            "repeat_label",
            "version",
        ]

class ChoreOccurrenceSerializer(serializers.ModelSerializer):
    chore = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    user_label = serializers.SerializerMethodField()
    repeat_label = serializers.CharField(source="schedule.repeat_label", read_only=True)

    class Meta:
        model = ChoreOccurrence
        fields = [
            "id",
            "schedule",
            "chore",
            "user",
            "user_label",
            "repeat_label",
            "due_date",
            "completed",
            "completed_at",
            "notification_sent",
            "notification_sent_at",
            "version",
        ]

    def get_chore(self, obj):
        chore = obj.schedule.chore
        return ChoreSerializer(chore).data
    
    def get_user(self, obj):
        user = obj.schedule.user
        return UserSerializer(user).data

    def get_user_label(self, obj):
        user = obj.schedule.user
        first = user.first_name or ""
        last_initial = user.last_name[0].upper() if user.last_name else ""
        return f"{first}{'.' + last_initial if last_initial else ''}"

class HouseSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    chores = serializers.SerializerMethodField()
    schedules = serializers.SerializerMethodField()

    class Meta:
        model = House
        fields = [
            "id",
            "name",
            "address",
            "join_code",
            "max_members",
            "members",
            "chores",
            "schedules",
            "version",
        ]

    def get_members(self, obj):
        house_members = (
            obj.housemember_set
            .select_related("user")
            .filter(deleted_at__isnull=True)
        )
        return HouseMemberSerializer(house_members, many=True).data

    def get_chores(self, obj):
        chores = (obj.chores.filter(deleted_at__isnull=True))
        return ChoreSerializer(chores, many=True).data

    def get_schedules(self, obj):
        schedules = (
            ChoreSchedule.objects
            .filter(chore__house=obj, deleted_at__isnull=True)
            .select_related("chore", "user")
        )
        return ChoreScheduleSerializer(schedules, many=True).data
