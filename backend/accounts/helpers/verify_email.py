from django.core.mail import send_mail
from django.conf import settings

def send_verification_email(email, token):
    verify_link = f"http://localhost:8000/api/accounts/verify-email?token={token}"
    send_mail(
        subject="Verify your email",
        message=f"Click this link to verify your email: {verify_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
