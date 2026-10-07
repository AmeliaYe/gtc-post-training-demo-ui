"""HTTP boundaries and real-Hermes integration against a deterministic local model API."""
from copy import deepcopy
import json
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
import time
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from ui.backend.app.main import create_app
from ui.backend.app.config import Endpoint, EndpointInput
from ui.backend.app.streaming import VisibleText


@pytest.mark.parametrize('width', [1, 2, 5, 17, 100])
@pytest.mark.parametrize('tag', ['think', 'THINKING', 'reasoning', 'REASONING_SCRATCHPAD'])
def test_stream_hides_reasoning_across_chunk_boundaries(width, tag):
    source = f' \n<{tag}>PRIVATE_REASONING_SENTINEL</{tag}>\n<think>SECOND_SECRET</think> Hello **there**. 2 < 3.'
    text = VisibleText()
    parts = [text.feed(source[i:i + width]) for i in range(0, len(source), width)]
    assert ''.join(parts) == 'Hello **there**. 2 < 3.'
    assert text.complete
    assert all('PRIVATE' not in part and 'SECRET' not in part for part in parts)


@pytest.mark.parametrize('source', ['<think>SECRET', '<thi', '</think>SECRET',
                                   'Visible<think>SECRET</think>', '<think>SECRET</reasoning>'])
def test_stream_rejects_ambiguous_or_unclosed_reasoning(source):
    text = VisibleText()
    output = ''.join(text.feed(char) for char in source)
    assert 'SECRET' not in output
    assert not text.complete


@pytest.fixture
def bundle(tmp_path):
    case = {
        "id": "demo-test", "current_datetime": "2026-09-17T12:00:00+00:00",
        "patient_profile": {"demographics": {"name": "Synthetic Demo Patient"},
                            "preferred_pcp": "Dr. Demo", "preferred_pharmacy": "Original Pharmacy",
                            "medications": [], "conditions": [], "allergies": []},
        "seed": {"task_category": "profile_management", "task_subcategory": "update_pharmacy"},
        "scenario": {"story": "PRIVATE_SCENARIO_SENTINEL", "success_criteria": ["HIDDEN_OBJECTIVE_SENTINEL"]},
    }
    row = dict(id="demo-test", label="Change pharmacy", icon="store", category="profile_management",
               task="update_pharmacy", opening="Please change my pharmacy.", case=case,
               system_prompt="You are a healthcare assistant. Use tools to verify and update patient records.",
               recorded={s: {"trace": [{"role": "patient", "content": "Recorded opening"},
                                      {"role": "assistant", "reply": "Recorded reply", "tool_results": []}]}
                         for s in ("baseline", "checkpoint")})
    path = tmp_path / "cases.json"
    path.write_text(json.dumps(dict(schema="healthcare-demo-v1", cohort_size=1, cases=[row])))
    return path


@pytest.fixture
def app(bundle, tmp_path):
    return create_app(bundle, runtime_root=tmp_path / "runtime")


def settings(base_url, checkpoint_url=None, key=""):
    return {side: dict(base_url=checkpoint_url if side == "checkpoint" and checkpoint_url else base_url,
                       model=side, api_key=key)
            for side in ("baseline", "checkpoint")}


def test_settings_never_return_secrets_and_wrong_origin_cannot_modify(app):
    with TestClient(app, base_url="http://127.0.0.1") as client:
        response = client.put('/api/settings', json=settings('http://127.0.0.1:1/v1', key='SECRET_SENTINEL'))
        assert response.status_code == 200
        assert 'SECRET_SENTINEL' not in response.text
        assert response.json()['endpoints']['baseline']['api_key_configured'] is True
        response = client.put('/api/settings', json=settings('http://127.0.0.1:2/v1'), headers={'Origin': 'http://evil.example'})
        assert response.status_code == 403
        invalid = settings('not-a-url', key='SECRET_SENTINEL')
        response = client.put('/api/settings', json=invalid)
        assert response.status_code == 422 and 'SECRET_SENTINEL' not in response.text
        assert client.get('/api/settings', headers={'Host':'attacker.example'}).status_code == 403
        assert client.post('/api/comparisons', content='a'*70000, headers={'Content-Type':'application/json'}).status_code == 413


def test_secret_is_not_reused_for_another_destination():
    previous = Endpoint('https://one.example/v1', 'old', 'secret')
    same = Endpoint.update(EndpointInput(base_url=previous.base_url, model='new'), previous)
    changed = Endpoint.update(EndpointInput(base_url='https://two.example/v1', model='new'), previous)
    cleared = Endpoint.update(EndpointInput(base_url=previous.base_url, model='new', clear_api_key=True), previous)
    assert same.api_key == 'secret' and not changed.api_key and not cleared.api_key


def test_private_case_data_is_not_a_browser_payload(app):
    with TestClient(app, base_url="http://127.0.0.1") as client:
        payload = client.get('/api/cases')
        assert payload.status_code == 200
        assert 'PRIVATE_SCENARIO_SENTINEL' not in payload.text
        assert 'patient_profile' not in payload.text
        assert client.get('/assets/../.local/cases.json').status_code == 404
        assert 'Recorded reply' in client.get('/api/cases/demo-test/recorded').text
        assert client.get('/api/comparisons/missing/events').status_code == 404


@pytest.fixture
def model_server():
    captures = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def answer(self, value):
            content = json.dumps(value).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def do_GET(self):
            self.answer({'data': [{'id': 'baseline'}, {'id': 'checkpoint'}]})

        def streamed_answer(self, request, message, finish, prompt):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()

            def send(delta=None, reason=None, usage=None):
                value = dict(id='chatcmpl-demo', object='chat.completion.chunk', created=0,
                             model=request['model'], choices=[] if usage else [
                                 dict(index=0, delta=delta or {}, finish_reason=reason)])
                if usage:
                    value['usage'] = usage
                self.wfile.write(('data: ' + json.dumps(value) + '\n\n').encode())
                self.wfile.flush()

            try:
                send({'role': 'assistant'})
                send({'reasoning_content': 'PRIVATE_REASONING_SENTINEL'})
                if message.get('tool_calls'):
                    # Early narration must reset when the tool call arrives.
                    send({'content': 'I will check the record.'})
                    call = message['tool_calls'][0]
                    arguments = call['function']['arguments']
                    send({'tool_calls': [dict(index=0, id=call['id'], type='function',
                          function=dict(name=call['function']['name'], arguments=arguments[:2]))]})
                    send({'tool_calls': [dict(index=0, function=dict(arguments=arguments[2:]))]})
                    send({'content': '<think>SUPPRESSED_TOOL_REASONING</think>'})
                else:
                    for part in ['<thi', 'nk>PRIVATE_INLINE_REASONING', '</th', 'ink>']:
                        send({'content': part})
                    reply = message['content']
                    for offset in range(0, len(reply), 5):
                        send({'content': reply[offset:offset + 5]})
                        time.sleep(.12 if 'Slow stream' in prompt else .025)
                if 'Force disconnect' not in prompt:
                    send(reason=finish)
                send(usage=dict(prompt_tokens=100, completion_tokens=25, total_tokens=125))
                self.wfile.write(b'data: [DONE]\n\n')
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass  # Expected when the operator cancels a live stream.

        def do_POST(self):
            request = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            captures.append(request)
            messages = request['messages']
            user_index = max(i for i, m in enumerate(messages) if m['role'] == 'user')
            prompt = messages[user_index]['content']
            tool_messages = [m for m in messages[user_index + 1:] if m['role'] == 'tool']
            followup = 'Which pharmacy' in prompt
            pharmacy = request['model'].title() + ' Demo Pharmacy'
            if not tool_messages:
                name, arguments = 'get_profile', {}
            elif not followup and len(tool_messages) == 1:
                name, arguments = 'update_pharmacy', {'pharmacy_name': pharmacy}
            else:
                name = None
            if name:
                message = {'role': 'assistant', 'content': None,
                           'tool_calls': [{'id': 'call_' + uuid4().hex, 'type': 'function',
                                           'function': {'name': name, 'arguments': json.dumps(arguments)}}]}
                finish = 'tool_calls'
            else:
                if followup:
                    actual = json.loads(tool_messages[-1]['content'])['profile']['preferred_pharmacy']
                    reply = 'Your current pharmacy is ' + actual + '.'
                else:
                    reply = 'Your pharmacy was updated to ' + pharmacy + '.'
                message = {'role':'assistant', 'content': reply, 'reasoning_content': 'PRIVATE_REASONING_SENTINEL'}
                finish = 'stop'
            if 'Force incomplete' in prompt or 'Force disconnect' in prompt:
                message = {'role':'assistant', 'content':'Unfinished output'}
                finish = 'length'
            if request.get('stream'):
                self.streamed_answer(request, message, finish, prompt)
                return
            self.answer(dict(id='chatcmpl-' + uuid4().hex, object='chat.completion', created=0,
                             model=request['model'], choices=[dict(index=0, message=message, finish_reason=finish)],
                             usage=dict(prompt_tokens=100, completion_tokens=25, total_tokens=125)))

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f'http://127.0.0.1:{server.server_port}/v1', captures
    server.shutdown()
    server.server_close()
    thread.join()


def get_events(client, ident, after=0):
    response = client.get(f'/api/comparisons/{ident}/events?after={after}')
    assert response.status_code == 200
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]


def test_connection_discovery_and_no_model_inference(app, model_server):
    url, captures = model_server
    with TestClient(app, base_url="http://127.0.0.1") as client:
        client.put('/api/settings', json=settings(url))
        result = client.post('/api/connections/check', json={}).json()
        assert result['baseline']['ok'] and result['checkpoint']['ok']
        assert not captures


def test_real_hermes_paired_tools_history_and_failure(bundle, tmp_path, model_server):
    python = os.getenv('DEMO_TEST_HERMES_PYTHON')
    if not python:
        pytest.skip('Set DEMO_TEST_HERMES_PYTHON for real Hermes integration')
    url, captures = model_server
    app = create_app(bundle, python=python, runtime_root=tmp_path / 'runtime')
    with TestClient(app, base_url="http://127.0.0.1") as client:
        assert client.put('/api/settings', json=settings(url, key='LOCAL_FAKE_KEY')).status_code == 200
        start = client.post('/api/comparisons', json={'case_id':'demo-test', 'prompt':'Please change my pharmacy.'})
        assert start.status_code == 200
        ident = start.json()['id']
        assert client.put('/api/settings', json=settings(url)).status_code == 409
        first = get_events(client, ident)
        assert first[-1]['type'] == 'turn_complete'
        assert first[-1]['statuses'] == {'baseline':'complete', 'checkpoint':'complete'}, first
        for side in ('baseline','checkpoint'):
            final = next(e for e in first if e['type']=='complete' and e['side']==side)
            assert side.title() + ' Demo Pharmacy' in final['reply']
            assert [t['tool_call']['name'] for t in final['tools']] == ['get_profile','update_pharmacy']
            assert final['tools'][0]['result']['profile']['preferred_pharmacy'] == 'Original Pharmacy'
            events = [e for e in first if e.get('side') == side]
            last_reset = max(i for i, e in enumerate(events) if e['type'] == 'reply_reset')
            deltas = [e for e in events[last_reset + 1:] if e['type'] == 'reply_delta']
            assert len(deltas) > 1
            assert ''.join(e['text'] for e in deltas).strip() == final['reply']
            assert deltas[-1]['id'] < final['id']
        public = json.dumps(first)
        assert 'PRIVATE_REASONING_SENTINEL' not in public and 'LOCAL_FAKE_KEY' not in public and '_history' not in public
        assert 'PRIVATE_INLINE_REASONING' not in public and 'SUPPRESSED_TOOL_REASONING' not in public
        assert all('PRIVATE_SCENARIO_SENTINEL' not in json.dumps(c) for c in captures)
        assert all('HIDDEN_OBJECTIVE_SENTINEL' not in json.dumps(c) for c in captures)
        assert all(len(c['tools']) == 15 for c in captures)
        assert all(c.get('stream') is True for c in captures)
        assert get_events(client, ident, first[5]['id']) == first[6:]
        first_calls=[c for c in captures if c['messages'][-1]['role']=='user']
        import difflib
        assert first_calls[0]['messages'] == first_calls[1]['messages'], '\n'.join(difflib.unified_diff(
            json.dumps(first_calls[0]['messages'],indent=2).splitlines(),
            json.dumps(first_calls[1]['messages'],indent=2).splitlines()))
        first_count=len(captures)
        response=client.post(f'/api/comparisons/{ident}/turns', json={'prompt':'Which pharmacy is recorded now?'})
        assert response.status_code == 200
        second=get_events(client, ident, first[-1]['id'])
        assert second[-1]['statuses'] == {'baseline':'complete','checkpoint':'complete'}, second
        for side in ('baseline','checkpoint'):
            final=next(e for e in second if e['type']=='complete' and e['side']==side)
            assert side.title() + ' Demo Pharmacy' in final['reply']
        assert any('Your pharmacy was updated' in json.dumps(c['messages']) for c in captures[first_count:])
        failed=client.post('/api/comparisons', json={'case_id':'demo-test','prompt':'Force incomplete'}).json()['id']
        third=get_events(client, failed)
        assert third[-1]['statuses'] == {'baseline':'error','checkpoint':'error'}
        assert not any(e['type']=='complete' for e in third)
        assert client.post(f'/api/comparisons/{failed}/turns', json={'prompt':'retry'}).status_code == 409
        dropped = client.post('/api/comparisons', json={'case_id':'demo-test','prompt':'Force disconnect'}).json()['id']
        fourth = get_events(client, dropped)
        assert any(e['type'] == 'reply_delta' for e in fourth)
        assert fourth[-1]['statuses'] == {'baseline':'error','checkpoint':'error'}
        assert not any(e['type'] == 'complete' for e in fourth)


@pytest.mark.parametrize('target', ['both', 'baseline', 'checkpoint'])
def test_cancel_terminates_workers_and_blocks_followup(bundle, tmp_path, target):
    # A tiny interpreter stand-in sleeps before producing any events.
    sleeper=tmp_path/'sleep-worker'
    sleeper.write_text('#!/usr/bin/env python3\nimport time\ntime.sleep(60)\n')
    sleeper.chmod(0o700)
    app=create_app(bundle, python=str(sleeper), runtime_root=tmp_path/'runtime')
    with TestClient(app, base_url="http://127.0.0.1") as client:
        client.put('/api/settings', json=settings('http://127.0.0.1:1/v1'))
        ident=client.post('/api/comparisons',json={'case_id':'demo-test','prompt':'hello','target':target}).json()['id']
        run=app.state.runs[ident]
        selected = [lane for side, lane in run.lanes.items() if target == 'both' or side == target]
        deadline=time.monotonic()+5
        while any(l.process is None for l in selected) and time.monotonic()<deadline:
            time.sleep(.01)
        assert all(l.process is not None for l in selected)
        processes=[l.process for l in selected]
        result=client.post(f'/api/comparisons/{ident}/cancel',json={})
        assert result.status_code==200
        run=app.state.runs[ident]
        assert not run.busy and all(l.process is None for l in run.lanes.values())
        assert all(p.returncode is not None for p in processes)
        assert client.post(f'/api/comparisons/{ident}/turns',json={'prompt':'again'}).status_code==409
        for side, lane in run.lanes.items():
            if target != 'both' and side != target:
                assert lane.status == 'ready' and lane.turn == 0 and not lane.history
                assert not (run.directory / side).exists()


@pytest.mark.parametrize('target', ['baseline', 'checkpoint'])
def test_single_endpoint_does_not_require_or_call_the_other(bundle, tmp_path, model_server, target):
    python = os.getenv('DEMO_TEST_HERMES_PYTHON')
    if not python:
        pytest.skip('Set DEMO_TEST_HERMES_PYTHON for real Hermes integration')
    url, captures = model_server
    other = 'checkpoint' if target == 'baseline' else 'baseline'
    config = settings(url)
    config[other]['model'] = ''
    app = create_app(bundle, python=python, runtime_root=tmp_path / 'runtime')
    with TestClient(app, base_url='http://127.0.0.1') as client:
        assert client.put('/api/settings', json=config).status_code == 200
        assert client.post('/api/comparisons', json={'case_id':'demo-test','prompt':'hello','target':'invalid'}).status_code == 422
        assert client.post('/api/comparisons', json={'case_id':'demo-test','prompt':'hello'}).status_code == 409
        start = client.post('/api/comparisons', json={'case_id':'demo-test','prompt':'Change my pharmacy','target':target})
        assert start.status_code == 200
        ident = start.json()['id']
        events = get_events(client, ident)
        assert events[-1]['statuses'] == {target:'complete',other:'ready'}
        assert events[0]['sides'] == [target]
        assert captures and all(c['model'] == target for c in captures)
        assert not (app.state.runs[ident].directory / other).exists()
        assert client.post(f'/api/comparisons/{ident}/turns', json={'prompt':'Which pharmacy?','target':other}).status_code == 409


def test_separate_runs_preserve_other_history_and_restart_only_selected_sandbox(bundle, tmp_path, model_server):
    python = os.getenv('DEMO_TEST_HERMES_PYTHON')
    if not python:
        pytest.skip('Set DEMO_TEST_HERMES_PYTHON for real Hermes integration')
    url, captures = model_server
    app = create_app(bundle, python=python, runtime_root=tmp_path / 'runtime')
    with TestClient(app, base_url='http://127.0.0.1') as client:
        client.put('/api/settings', json=settings(url))
        ident = client.post('/api/comparisons', json={
            'case_id':'demo-test','prompt':'Change my pharmacy','target':'baseline'}).json()['id']
        events = get_events(client, ident)
        cursor = events[-1]['id']
        run = app.state.runs[ident]

        def turn(target, prompt='Which pharmacy is recorded now?', restart=False):
            nonlocal cursor
            response = client.post(f'/api/comparisons/{ident}/turns', json={
                'prompt':prompt,'target':target,'restart':restart})
            assert response.status_code == 200
            result = get_events(client, ident, cursor)
            cursor = result[-1]['id']
            return result

        assert client.post(f'/api/comparisons/{ident}/turns', json={'prompt':'hello','target':'checkpoint'}).status_code == 409
        turn('baseline')
        baseline_history = deepcopy(run.lanes['baseline'].history)
        assert run.lanes['baseline'].turn == 2
        checkpoint_start = turn('checkpoint', 'Change my pharmacy', restart=True)
        assert run.lanes['checkpoint'].turn == 1
        assert run.lanes['baseline'].history == baseline_history
        final = next(e for e in checkpoint_start if e['type']=='complete')
        assert final['tools'][0]['result']['profile']['preferred_pharmacy'] == 'Original Pharmacy'
        assert all('Baseline Demo Pharmacy' not in json.dumps(c['messages']) for c in captures if c['model']=='checkpoint')
        paired = turn('both')
        assert paired[-1]['statuses'] == {'baseline':'complete','checkpoint':'complete'}
        assert [run.lanes[s].turn for s in ('baseline','checkpoint')] == [3,2]
        checkpoint_history = deepcopy(run.lanes['checkpoint'].history)
        fresh = turn('baseline', restart=True)
        assert 'Original Pharmacy' in next(e['reply'] for e in fresh if e['type']=='complete')
        assert run.lanes['baseline'].turn == 1 and run.lanes['checkpoint'].turn == 2
        assert run.lanes['checkpoint'].history == checkpoint_history
        failed = turn('baseline', 'Force disconnect', restart=True)
        assert failed[-1]['statuses'] == {'baseline':'error','checkpoint':'complete'}
        assert run.lanes['checkpoint'].history == checkpoint_history
        healthy = turn('checkpoint')
        assert healthy[-1]['statuses']['checkpoint'] == 'complete'
        assert client.post(f'/api/comparisons/{ident}/turns', json={'prompt':'retry','target':'baseline'}).status_code == 409
