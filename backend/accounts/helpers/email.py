from django.core.mail import send_mail
from django.conf import settings

# TODO: In production, use a proper email backend and environment variables for sensitive info

def send_verification_email(email, token):
    verify_link = f"http://localhost:8000/api/accounts/verify-email?token={token}"
    send_mail(
        subject="Verify your email",
        message=f"Click this link to verify your email: {verify_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )

def send_password_reset_email(email, token):
    reset_link = f"http://localhost:8000/api/accounts/reset-password?token={token}"
    send_mail(
        subject="Password Reset Request",
        message=f"Click this link to reset your passwrod: {reset_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
