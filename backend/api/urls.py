from django.urls import path
from . import views

urlpatterns = [
    path("house/create/", views.CreateHouseView.as_view(), name="create-house"),
    path("house/join/<join_code>/", views.JoinHouseView.as_view(), name="join-house"),
]
