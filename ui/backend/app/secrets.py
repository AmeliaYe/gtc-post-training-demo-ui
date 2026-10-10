"""Read environment values or mounted secrets without exposing their contents."""
import os
from pathlib import Path


def secret_value(name):
    value, filename = os.getenv(name, ""), os.getenv(name + "_FILE", "")
    if value and filename:
        raise ValueError(f"Set only {name} or {name}_FILE")
    return Path(filename).read_text().strip() if filename else value
