FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
ENV DEMO_BIND_HOST=0.0.0.0 DEMO_PORT=8000 DEMO_SERVE_FRONTEND=0 DEMO_RUNTIME_DIR=/var/lib/healthcare-ui
WORKDIR /opt/demo
COPY backend/requirements.lock /tmp/requirements.lock
RUN pip install -r /tmp/requirements.lock
COPY __init__.py ui/__init__.py
COPY backend/__init__.py ui/backend/__init__.py
COPY backend/vendor ui/backend/vendor
RUN pip install --no-deps ./ui/backend/vendor/hermes_agent_runtime \
    && useradd --uid 10001 --create-home demo \
    && mkdir -p /var/lib/healthcare-ui \
    && chown demo:demo /var/lib/healthcare-ui
COPY backend/app ui/backend/app
COPY data ui/data
USER demo
EXPOSE 8000
CMD ["python", "-m", "ui.backend.app.main"]

FROM runtime AS test
USER root
COPY backend/requirements-dev.txt /tmp/requirements-dev.txt
RUN pip install -r /tmp/requirements-dev.txt
COPY tests ui/tests
COPY frontend/public ui/frontend/public
USER demo
ENV DEMO_TEST_HERMES_PYTHON=/usr/local/bin/python
CMD ["python", "-m", "pytest", "ui/tests", "-q", "-p", "no:cacheprovider"]
