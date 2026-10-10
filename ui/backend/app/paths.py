"""Paths shared by native and container deployments."""
from pathlib import Path

UI_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = UI_ROOT / "backend"
REPO_ROOT = UI_ROOT.parent
FRONTEND_ROOT = UI_ROOT / "frontend/public"
