from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import House, HouseMember, Chore, ChoreSchedule, ChoreOccurrence

class DeletedListFilter(admin.SimpleListFilter):
    title = _("deleted")
    parameter_name = "show_deleted"

    def lookups(self, request, model_admin):
        return (
            ("no", _("Active")),
            ("yes", _("Deleted")),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            # use all_objects to include deleted
            return queryset.model.all_objects.all()
        elif self.value() == "no":
            # default queryset: only active
            return queryset
        return queryset.model.all_objects.all()

@admin.register(House)
class HouseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "address",
        "join_code",
        "deleted_at_display",
        "max_members",
    )
    search_fields = ("name", "address", "join_code")
    list_filter = (
        DeletedListFilter,
    )

    def deleted_at_display(self, obj):
        return obj.deleted_at is not None
    deleted_at_display.boolean = True
    deleted_at_display.short_description = "Deleted?"

    def get_queryset(self, request):
        # start from default manager
        qs = super().get_queryset(request)
        return qs

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
    list_display = (
        "id",
        "chore",
        "user",
        "deleted_at_display",
        "start_date",
        "repeat_label")
    list_filter = (
        DeletedListFilter,
        "chore__house",
        "user"
    )
    search_fields = ("chore__name", "user__first_name")
    readonly_fields = ("repeat_label",)


    def deleted_at_display(self, obj):
        return obj.deleted_at is not None
    deleted_at_display.boolean = True
    deleted_at_display.short_description = "Deleted?"

    def get_queryset(self, request):
        # start from default manager
        qs = super().get_queryset(request)
        return qs

@admin.register(ChoreOccurrence)
class ChoreOccurrenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "schedule",
        "due_date",
        "deleted_at_display",
        "completed_at",
        "notification_sent_at",
    )
    list_filter = (
        DeletedListFilter,
        "schedule__chore__house",
        "schedule__user",
        "completed",
        "notification_sent",
    )

    def deleted_at_display(self, obj):
        return obj.deleted_at is not None
    deleted_at_display.boolean = True
    deleted_at_display.short_description = "Deleted?"

    def get_queryset(self, request):
        # start from default manager
        qs = super().get_queryset(request)
        return qs
