"""Deployment boundaries exercised independently of model-serving availability."""
import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from ui.backend.app.main import create_app
from ui.backend.app.secrets import secret_value
from ui.backend.app.paths import UI_ROOT


def test_api_only_mode_and_host_origin_boundary(monkeypatch):
    monkeypatch.setenv('DEMO_SERVE_FRONTEND', '0')
    monkeypatch.setenv('DEMO_ALLOWED_HOSTS', 'localhost,frontend')
    with TestClient(create_app(), base_url='http://localhost:8080') as client:
        assert client.get('/').status_code == 404
        assert client.get('/healthz').json() == {'status': 'ready'}
        assert client.get('/api/cases').status_code == 200
        assert client.get('/api/cases', headers={'Host': 'evil.test'}).status_code == 403
        assert client.get('/api/cases', headers={'Origin': 'http://evil.test'}).status_code == 403
        assert client.get('/api/cases', headers={'Origin': 'http://localhost:8080'}).status_code == 200
        assert client.get('/api/cases', headers={'Host': 'frontend:8080'}).status_code == 200


def test_missing_case_bundle_fails_health(tmp_path):
    with TestClient(create_app(data_path=tmp_path/'missing'), base_url='http://localhost') as client:
        assert client.get('/healthz').status_code == 503


def test_native_static_layout(monkeypatch):
    monkeypatch.setenv('DEMO_SERVE_FRONTEND', '1')
    with TestClient(create_app(), base_url='http://localhost') as client:
        assert client.get('/').status_code == 200
        assert client.get('/assets/app.js').status_code == 200
        assert client.get('/assets/unknown').status_code == 404


def test_secret_files_and_conflicts(monkeypatch, tmp_path):
    p = tmp_path/'key'
    p.write_text('test-private-value\n')
    monkeypatch.setenv('TEST_KEY_FILE', str(p))
    assert secret_value('TEST_KEY') == 'test-private-value'
    monkeypatch.setenv('TEST_KEY', 'another-test-value')
    with pytest.raises(ValueError, match='Set only TEST_KEY or TEST_KEY_FILE'):
        secret_value('TEST_KEY')
    monkeypatch.delenv('TEST_KEY_FILE')
    assert secret_value('TEST_KEY') == 'another-test-value'


def test_mounted_keys_never_returned(monkeypatch, tmp_path):
    p = tmp_path/'key'
    p.write_text('test-private-value')
    monkeypatch.setenv('BASELINE_API_KEY', '')
    monkeypatch.setenv('BASELINE_API_KEY_FILE', str(p))
    with TestClient(create_app(), base_url='http://localhost') as client:
        response = client.get('/api/settings')
        assert response.json()['endpoints']['baseline']['api_key_configured']
        assert 'test-private-value' not in response.text
