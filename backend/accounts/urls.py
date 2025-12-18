from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("guest/", views.GuestView.as_view(), name="guest"),
    path("refresh/", views.RefreshTokenView.as_view(), name="refresh"),
    path("push-token/", views.SavePushTokenView.as_view(), name="push-token"),
]
