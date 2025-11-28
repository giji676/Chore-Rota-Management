from django.contrib import admin
from .models import User, PushToken

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "device_id", "is_guest")
    search_fields = ("name", "device_id", "is_guest")

@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "token", "created_at")
    list_filter = ("user", "token")
    search_fields = ("user__username",)
