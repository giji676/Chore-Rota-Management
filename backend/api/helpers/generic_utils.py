from typing import Protocol
from api.exceptions import Conflict


class VersionedModel(Protocol):
    version: int

def check_version(
    obj: VersionedModel,
    client_version: int | str | None,
    name: str | None = None,
) -> None:
    """
    Raises Conflict if:
      1. client_version is not provided
      2. client_version does not match obj.version
    """
    name = name or obj.__class__.__name__

    if client_version is None:
        raise Conflict(f"{name} version is required for concurrency check.")

    try:
        client_version = int(client_version)
    except (ValueError, TypeError):
        raise Conflict("Invalid version value.")

    if obj.version != client_version:
        raise Conflict(f"{name} has been modified.")
