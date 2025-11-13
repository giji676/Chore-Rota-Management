from django.urls import path
from . import views

urlpatterns = [
    path("", views.Welcome.as_view(), name="welcome"),
    path("welcome/", views.Welcome.as_view(), name="welcome"),
]
