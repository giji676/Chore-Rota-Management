from PIL import Image, ImageDraw, ImageFont, ImageColor
import hashlib
import os
import secrets
from pathlib import Path
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
    output_dir = Path("media/avatars")
    output_dir.mkdir(parents=True, exist_ok=True)

    if output_path is None:
        output_path = output_dir / _generate_random_filename()
    else:
        output_path = Path(output_path)

    # Background color
    if bg_color is None:
        bg_color = _color_from_string(initials)
    elif isinstance(bg_color, str):
        try:
            bg_color = ImageColor.getcolor(bg_color, "RGB")
        except ValueError:
            raise ValueError("Background color format not recognised")
    elif isinstance(bg_color, tuple):
        if len(bg_color) != 3 or not all(isinstance(c, int) for c in bg_color):
            raise ValueError("Background color tuple must be (R, G, B) integers")
    else:
        raise TypeError("Background color must be None, str, or (R, G, B) tuple")

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
