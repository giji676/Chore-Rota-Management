from django.urls import path
from . import views

urlpatterns = [
    path("house/create/", views.HouseView.as_view(), name="house-create"),
    path("house/join/", views.HouseJoinView.as_view(), name="house-join"),
    path("house/generic/", views.HouseListGenericView.as_view(), name="house-list-generic"),
    path("house/<int:id>/details/", views.HouseDetailView.as_view(), name="house-details"),
    path("house/<int:id>/update/", views.HouseView.as_view(), name="house-update"),
    path("house/<int:id>/delete/", views.HouseView.as_view(), name="house-delete"),
    path("house/<int:house_id>/member/<int:member_id>/update/", views.HouseMemberView.as_view(), name="house-member-update"),

    path("chore/create/<int:house_id>/", views.CreateChoreView.as_view(), name="chore-create"),

    path("chore/occurrences/<int:house_id>/", views.GetOccurrencesView.as_view(), name="chore-occurrences"),
    path("chore/occurrence/<int:house_id>/update/", views.OccurrenceUpdateView.as_view(), name="occurrence-update"),
]
