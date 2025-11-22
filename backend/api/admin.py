from django.contrib import admin
from .models import House, HouseMember, Chore, Rota, ChoreAssignment

@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "address", "join_code", "max_members")
    search_fields = ("name", "address", "join_code")

@admin.register(HouseMember)
class HouseMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "house", "role", "joined_at")
    list_filter = ("role", "house")
    search_fields = ("user__username",)

@admin.register(Chore)
class ChoreAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "house")
    list_filter = ("house",)
    search_fields = ("name",)

@admin.register(Rota)
class RotaAdmin(admin.ModelAdmin):
    list_display = ("id", "house", "start_date", "end_date", "created_at")
    list_filter = ("house", "start_date")

@admin.register(ChoreAssignment)
class ChoreAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "rota", "chore", "person", "day", "completed")
    list_filter = ("rota", "day", "completed")
    search_fields = ("chore__name", "person__username")
