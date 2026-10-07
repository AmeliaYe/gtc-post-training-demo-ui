"""Access boundaries for the private network sharing gateway."""
import json

from fastapi.testclient import TestClient
import httpx
import pytest

from ui.share import COOKIE, create_share_app

TOKEN = "test-share-token-" + "x" * 32
ORIGIN = "http://10.1.2.3:4192"
RUN = "a" * 32


@pytest.fixture
def gateway():
    requests = []

    def upstream(request):
        requests.append(request)
        if request.url.path == '/api/settings':
            return httpx.Response(200, json={'endpoints': {}, 'cases_ready': True})
        if request.url.path.endswith('/events'):
            return httpx.Response(200, headers={'content-type':'text/event-stream'},
                                  content=b'id: 2\ndata: {"type":"reply_delta","text":"Hello"}\n\n')
        return httpx.Response(200, json={'ok': True})

    app = create_share_app(token=TOKEN, origin=ORIGIN, transport=httpx.MockTransport(upstream))
    with TestClient(app, base_url=ORIGIN) as client:
        yield client, requests


def unlock(client):
    response = client.get('/share/' + TOKEN, follow_redirects=False)
    assert response.status_code == 307 and response.headers['location'] == '/share/' + TOKEN + '/'
    assert 'set-cookie' not in response.headers
    assert response.headers['referrer-policy'] == 'no-referrer'
    assert not client.cookies
    return '/share/' + TOKEN


def test_share_requires_valid_link_for_every_route(gateway):
    client, requests = gateway
    for path in ('/', '/api/settings', '/api/cases', '/assets/app.js'):
        assert client.get(path).status_code == 403
    assert client.get('/share/incorrect').status_code == 403
    assert not requests
    prefix = unlock(client)
    assert client.get(prefix + '/').status_code == 200
    assert client.get(prefix + '/assets/app.js').status_code == 200
    assert client.get(prefix + '/api/cases').status_code == 200
    assert client.get(prefix + '/api/settings').json()['shared_access'] is True
    assert client.get('/api/cases').status_code == 403
    for request in requests:
        assert COOKIE not in request.headers.get('cookie', '')
        assert TOKEN not in str(request.url)


def test_guests_cannot_change_connections_or_use_other_routes(gateway):
    client, requests = gateway
    prefix = unlock(client)
    for method in ('PUT', 'PATCH', 'DELETE', 'POST'):
        assert client.request(method, prefix + '/api/settings', json={'api_key':'fake-secret'}).status_code == 403
    for path in ('/api/connections/check', '/openapi.json', '/.local/cases.json'):
        assert client.get(prefix + path).status_code == 404
    assert not requests


def test_share_rejects_foreign_hosts_origins_and_invalid_bodies(gateway):
    client, requests = gateway
    assert client.get('/share/' + TOKEN, headers={'Host':'attacker.example'}).status_code == 403
    prefix = unlock(client)
    assert client.post(prefix + '/api/comparisons', json={}, headers={'Origin':'https://attacker.example'}).status_code == 403
    assert client.post(prefix + '/api/comparisons', json={}, headers={'Sec-Fetch-Site':'cross-site'}).status_code == 403
    assert client.post(prefix + '/api/comparisons', content='{}').status_code == 415
    assert client.post(prefix + '/api/comparisons', content='x'*65537, headers={'Content-Type':'application/json'}).status_code == 413
    assert not requests


def test_share_forwards_inference_and_event_replay_without_guest_credentials(gateway):
    client, requests = gateway
    prefix = unlock(client)
    body = {'case_id':'adult-test-0005','prompt':'Hello','target':'baseline'}
    response = client.post(prefix + '/api/comparisons', json=body,
                           headers={'Origin':ORIGIN,'Authorization':'Bearer guest-secret'})
    assert response.status_code == 200
    assert json.loads(requests[-1].content) == body
    assert requests[-1].headers['host'] == '127.0.0.1:4193'
    assert 'authorization' not in requests[-1].headers and 'cookie' not in requests[-1].headers
    for action in ('turns', 'cancel'):
        assert client.post(f'{prefix}/api/comparisons/{RUN}/{action}', json={}).status_code == 200
    response = client.get(f'{prefix}/api/comparisons/{RUN}/events?after=1', headers={'Last-Event-ID':'1'})
    assert response.status_code == 200 and 'reply_delta' in response.text
    assert response.headers['content-type'].startswith('text/event-stream')
    assert requests[-1].headers['last-event-id'] == '1'
    assert requests[-1].url.params['after'] == '1'
    assert TOKEN not in str(requests[-1].url)


def test_existing_cookie_tabs_still_work_and_bare_url_explains_access(gateway):
    client, requests = gateway
    response = client.get('/')
    assert response.status_code == 403
    assert response.headers['content-type'].startswith('text/html')
    assert 'complete demo link' in response.text and TOKEN not in response.text
    client.cookies.set(COOKIE, TOKEN)
    assert client.get('/').status_code == 200
    assert client.get('/api/settings').json()['shared_access'] is True
    assert client.get('/share/wrong/api/settings').status_code == 403
    assert all(TOKEN not in str(r.url) for r in requests)
