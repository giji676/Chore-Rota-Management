from django.core.exceptions import ValidationError

def validate_password(password):
    errors = []

    if len(password) < 6:
        errors.append("Password must be at least 6 characters long")

    if len(password) > 128:
        errors.append("Password cannot be longer than 128 characters")

    if not any(char.islower() for char in password):
        errors.append("Password must contain at least one lowercase letter")

    if not any(char.isupper() for char in password):
        errors.append("Password must contain at least one uppercase letter")

    if not any(char.isdigit() for char in password):
        errors.append("Password must contain at least one number")

    if not any(not char.isalnum() for char in password):
        errors.append("Password must contain at least one special character")

    if errors:
        raise ValidationError(errors)
