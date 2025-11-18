from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import House, Chore, Rota, ChoreAssignment, HouseMember

User = get_user_model()

class HouseMemberSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField(source="user.id")
    username = serializers.ReadOnlyField(source="user.username")
    is_guest = serializers.ReadOnlyField(source="user.is_guest")
    device_id = serializers.ReadOnlyField(source="user.device_id")

    class Meta:
        model = HouseMember
        fields = ["id", "username", "is_guest", "device_id", "role", "joined_at"]

class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = "__all__"

class ChoreAssignmentSerializer(serializers.ModelSerializer):
    person = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    completed_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ChoreAssignment
        fields = "__all__"

class RotaSerializer(serializers.ModelSerializer):
    assignments = ChoreAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Rota
        fields = "__all__"

class SimpleHouseSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = House
        fields = ["id", "name", "address", "join_code", "max_members", "members"]

    def get_members(self, obj):
        house_members = obj.housemember_set.select_related("user")
        return HouseMemberSerializer(house_members, many=True).data
