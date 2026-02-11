from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("guest/", views.GuestView.as_view(), name="guest"),
    path("refresh/", views.RefreshTokenView.as_view(), name="refresh"),
    path("push-token/", views.SavePushTokenView.as_view(), name="push-token"),
    path("user/", views.UserView.as_view(), name="user"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationEmailView.as_view(), name="resend-verification"),
    path("change-email/", views.ChangeEmailView.as_view(), name="change-email"),
]
