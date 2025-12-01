from datetime import date
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import House, Chore, Rota, ChoreAssignment, HouseMember

User = get_user_model()

class HouseMemberSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField(source="user.id")
    username = serializers.ReadOnlyField(source="user.username")
    is_guest = serializers.ReadOnlyField(source="user.is_guest")

    class Meta:
        model = HouseMember
        fields = ["id", "username", "is_guest", "role", "joined_at"]

class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = "__all__"

class ChoreAssignmentSerializer(serializers.ModelSerializer):
    chore = ChoreSerializer(read_only=True)
    person_name = serializers.CharField(source="person.username", read_only=True)

    class Meta:
        model = ChoreAssignment
        fields = ["id", "chore", "person", "person_name", "day", "due_time", "completed"]

class RotaSerializer(serializers.ModelSerializer):
    assignments = ChoreAssignmentSerializer(many=True, read_only=True)
    start_date = serializers.DateField(required=False, default=date.today)
    end_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Rota
        fields = "__all__"

class RotaDetailsSerializer(serializers.ModelSerializer):
    week = serializers.SerializerMethodField()

    class Meta:
        model = Rota
        fields = ["id", "house", "start_date", "end_date", "week"]

    DAY_MAP = {
        "mon": 0,
        "tue": 1,
        "wed": 2,
        "thu": 3,
        "fri": 4,
        "sat": 5,
        "sun": 6,
    }

    def get_week(self, obj):
        # Initialize empty week: 0–6
        week = {str(i): [] for i in range(7)}

        assignments = (
            obj.assignments
            .select_related("chore", "person")
            .all()
        )

        for assignment in assignments:
            day_key = self.DAY_MAP.get(assignment.day)
            if day_key is not None:
                week[str(day_key)].append(
                    ChoreAssignmentSerializer(assignment).data
                )

        return week

class SimpleHouseSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    rota = serializers.SerializerMethodField()

    class Meta:
        model = House
        fields = ["id", "name", "address", "join_code", "max_members", "members", "rota"]

    def get_members(self, obj):
        house_members = obj.housemember_set.select_related("user")
        return HouseMemberSerializer(house_members, many=True).data
    
    def get_rota(self, obj):
        house_rota = obj.rotas.all().order_by("-start_date")
        return RotaDetailsSerializer(house_rota, many=True).data
