from PIL import Image, ImageDraw, ImageFont
import hashlib
import os
import secrets
from typing import Optional, Tuple

# Path to default Inter font in your project
DEFAULT_FONT_PATH = "fonts/Inter/static/Inter_28pt-Bold.ttf"

def _color_from_string(text: str) -> Tuple[int, int, int]:
    """Generate consistent RGB color from string."""
    hash_hex = hashlib.md5(text.encode("utf-8")).hexdigest()
    return (
        int(hash_hex[:2], 16),
        int(hash_hex[2:4], 16),
        int(hash_hex[4:6], 16),
    )

def _generate_random_filename() -> str:
    return f"avatar_{secrets.token_hex(8)}.png"

def generate_avatar(
    initials: str,
    size: int = 256,
    bg_color: Optional[Tuple[int, int, int]] = None,
    text_color: Tuple[int, int, int] = (255, 255, 255),
    font_path: Optional[str] = None,
    output_path: Optional[str] = None,
    circular: bool = True,
) -> str:
    """
    Generate avatar with:
    - Solid background (custom or hashed)
    - Centered initials
    - Optional circular mask
    - Auto-random filename if output_path not provided
    """
    initials = initials.strip().upper()
    if not initials:
        raise ValueError("Initials cannot be empty")

    # Generate filename if not provided
    if output_path is None:
        os.makedirs("media/avatars", exist_ok=True)
        output_path = os.path.join("media/avatars", _generate_random_filename())

    # Background color
    if bg_color is None:
        bg_color = _color_from_string(initials)

    # Create image
    mode = "RGBA" if circular else "RGB"
    img = Image.new(mode, (size, size), (0, 0, 0, 0) if circular else bg_color)
    draw = ImageDraw.Draw(img)

    # Draw background
    if circular:
        draw.ellipse((0, 0, size, size), fill=bg_color)
    else:
        draw.rectangle((0, 0, size, size), fill=bg_color)

    # Load font: use provided font_path, or default Inter Bold
    font_file = font_path if font_path and os.path.exists(font_path) else DEFAULT_FONT_PATH
    if not os.path.exists(font_file):
        raise FileNotFoundError(f"Font file not found: {font_file}")

    font_size = int(size * 0.5)
    font = ImageFont.truetype(font_file, font_size)

    ascent, descent = font.getmetrics()
    bbox = font.getbbox(initials)
    text_width = bbox[2] - bbox[0]
    text_height = ascent + descent  # total height including descent

    x = (size - text_width) / 2
    y = (size - text_height) / 2

    draw.text((x, y), initials, fill=text_color, font=font)

    img.save(output_path)
    return output_path
