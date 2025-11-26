from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("guest/", views.GuestView.as_view(), name="guest"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", views.RefreshTokenView.as_view(), name="refresh"),

    path("push-token/", views.SavePushTokenView.as_view(), name="push-token"),
]
