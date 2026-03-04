def validate_password(password):
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")

    if len(password) > 128:
        raise ValueError("Password cannot be longer than 128 characters")

    if not any(char.islower() for char in password):
        raise ValueError("Password must contain at least one lowercase letter")

    if not any(char.isupper() for char in password):
        raise ValueError("Password must contain at least one uppercase letter")

    if not any(char.isdigit() for char in password):
        raise ValueError("Password must contain at least one number")

    if not any(not char.isalnum() for char in password):
        raise ValueError("Password must contain at least one special character")
