"""Explicit process-local clock for reproducible evaluation and training."""
from datetime import datetime
import os


def install():
    value = os.environ.get("PAB_GRPO_FIXED_TIME")
    if value is None:
        return
    fixed = datetime.fromisoformat(value)
    if fixed.tzinfo is None:
        raise ValueError("Fixed clock must include its timezone")
    import hermes_time
    hermes_time.now = lambda: fixed
