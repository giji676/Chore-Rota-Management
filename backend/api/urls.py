from django.urls import path
from . import views

urlpatterns = [
    # House endpoints
    path("houses/create/", views.HouseManagementView.as_view(), name="create-house"),
    path("houses/<int:house_id>/update/", views.HouseManagementView.as_view(), name="update-house"),
    path("houses/<int:house_id>/delete/", views.HouseManagementView.as_view(), name="delete-house"),
    path("houses/<int:house_id>/details/", views.HouseDetailsView.as_view(), name="house-details"),

    path("houses/join/<str:join_code>/", views.JoinHouseView.as_view(), name="join-house"),
    path("houses/user/", views.UsersHousesView.as_view(), name="user-houses"),

    # Address endpoints
    path("address-autocomplete/", views.AddressAutocompleteView.as_view(), name="address-autocomplete"),
    path("address-details/", views.AddressDetailsView.as_view(), name="address-details"),

    # Chore endpoints
    path("chores/create/", views.ChoreManagementView.as_view(), name="create-chore"),
    path("chores/<int:chore_id>/update/", views.ChoreManagementView.as_view(), name="update-chore"),
    path("chores/<int:chore_id>/delete/", views.ChoreManagementView.as_view(), name="delete-chore"),

    # Chore Schedule endpoints
    path("schedules/create/", views.ChoreScheduleManagementView.as_view(), name="create-schedule"),
    path("schedules/<int:schedule_id>/update/", views.ChoreScheduleManagementView.as_view(), name="update-schedule"),
    path("schedules/<int:schedule_id>/delete/", views.ChoreScheduleManagementView.as_view(), name="delete-schedule"),

    # Chore Occurrence endpoints
    path("occurrences/create/", views.ChoreOccurranceManagementView.as_view(), name="create-occurrence"),
    path("occurrences/<int:occurrence_id>/update/", views.ChoreOccurranceManagementView.as_view(), name="update-occurrence"),
    path("occurrences/<int:occurrence_id>/delete/", views.ChoreOccurranceManagementView.as_view(), name="delete-occurrence"),
]
