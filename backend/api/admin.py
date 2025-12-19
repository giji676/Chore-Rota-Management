from django.contrib import admin
from .models import House, HouseMember, Chore, ChoreSchedule, ChoreOccurrence

@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "address", "join_code", "max_members")
    search_fields = ("name", "address", "join_code")

@admin.register(HouseMember)
class HouseMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "house", "role", "joined_at")
    list_filter = ("role", "house")
    search_fields = ("user__first_name",)

@admin.register(Chore)
class ChoreAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "house", "color")
    list_filter = ("house",)
    search_fields = ("name",)

@admin.register(ChoreSchedule)
class ChoreScheduleAdmin(admin.ModelAdmin):
    list_display = ("id", "chore", "user", "start_date", "repeat_label")
    list_filter = ("chore__house", "user")
    search_fields = ("chore__name", "user__first_name")
    readonly_fields = ("repeat_label",)

@admin.register(ChoreOccurrence)
class ChoreOccurrenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "schedule",
        "due_date",
        "completed",
        "completed_at",
        "notification_sent",
        "notification_sent_at",
    )
    list_filter = ("schedule__chore__house", "schedule__user", "completed", "notification_sent")
    search_fields = ("schedule__chore__name", "schedule__user__first_name")
