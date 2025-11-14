from django.urls import path
from . import views

urlpatterns = [
    # House endpoints
    path("house/create/", views.CreateHouseView.as_view(), name="create-house"),
    path("house/join/<join_code>/", views.JoinHouseView.as_view(), name="join-house"),

    # Address endpoints
    path("address-autocomplete/", views.AddressAutocompleteView.as_view(), name="address-autocomplete"),
    path("address-details/", views.AddressDetailsView.as_view(), name="address-details"),

    # Chore endpoints
    path("chores/create/", views.CreateChoreView.as_view(), name="create-chore"),
    path("chores/delete/<int:chore_id>/", views.DeleteChoreView.as_view(), name="delete-chore"),
    path("chores/assign/", views.AssignChoreView.as_view(), name="assign-chore"),
    path("chores/assignment/<int:assignment_id>/", views.UpdateChoreAssignmentView.as_view(), name="update-chore-assignment"),
    path("chores/assignment/<int:assignment_id>/delete/", views.DeleteChoreAssignmentView.as_view(), name="delete-chore-assignment"),
]
