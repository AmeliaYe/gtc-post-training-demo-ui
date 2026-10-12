"""Manual browser QA only: run real Hermes against the deterministic test model.

Available only in the Docker test target. Never use as a live-model deployment.
"""
import os

from ui.tests.test_demo import model_server
from ui.backend.app.main import create_app


def main():
    import uvicorn
    fixture = model_server.__wrapped__()
    url, _ = next(fixture)
    for side in ('BASELINE', 'CHECKPOINT'):
        os.environ[side + '_BASE_URL'] = url
        os.environ[side + '_MODEL'] = side.lower()
        os.environ[side + '_API_KEY'] = ''
        os.environ.pop(side + '_API_KEY_FILE', None)
    try:
        uvicorn.run(create_app(), host='0.0.0.0', port=8000, access_log=False, proxy_headers=False)
    finally:
        fixture.close()


if __name__ == '__main__':
    main()
