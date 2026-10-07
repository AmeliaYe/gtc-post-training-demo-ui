#!/usr/bin/env bash
set -euo pipefail
DEMO_REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ -n "${DEMO_ENV_FILE:-}" ]]; then
  set -a
  source "$DEMO_ENV_FILE"
  set +a
fi
DEMO_APP_PYTHON=${DEMO_APP_PYTHON:-${DEMO_REPO_ROOT}/ui/.venv/bin/python}
cd "$DEMO_REPO_ROOT"
exec "$DEMO_APP_PYTHON" -m ui.app
