from django.urls import path
from . import views

urlpatterns = [
    # House endpoints
    path("house/create/", views.CreateHouseView.as_view(), name="create-house"),
    path("house/join/<str:join_code>/", views.JoinHouseView.as_view(), name="join-house"),
    path("house/<int:house_id>/", views.HouseView.as_view(), name="get-house"),
    path("houses/user/", views.UserHousesView.as_view(), name="get-houses"),

    # Address endpoints
    path("address-autocomplete/", views.AddressAutocompleteView.as_view(), name="address-autocomplete"),
    path("address-details/", views.AddressDetailsView.as_view(), name="address-details"),

    # Rota endpoints
    path("rota/create/", views.RotaManagementView.as_view(), name="create-rota"),
    path("rota/delete/<int:rota_id>/", views.RotaManagementView.as_view(), name="delete-rota"),

    # Chore endpoints
    path("chores/create/", views.CreateChoreView.as_view(), name="create-chore"),
    path("chores/delete/<int:chore_id>/", views.DeleteChoreView.as_view(), name="delete-chore"),
    path("chores/update/<int:chore_id>/", views.UpdateChoreView.as_view(), name="update-chore"),
    path("chores/assign/", views.AssignChoreView.as_view(), name="assign-chore"),
    path("chores/assignment/<int:assignment_id>/", views.UpdateChoreAssignmentView.as_view(), name="update-chore-assignment"),
    path("chores/assignment/<int:assignment_id>/delete/", views.DeleteChoreAssignmentView.as_view(), name="delete-chore-assignment"),
]
