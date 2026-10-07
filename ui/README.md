# Healthcare inference UI

A standalone patient-agent comparison demo: six recorded synthetic cases plus live
baseline/checkpoint conversations, streamed patient replies, visible tool activity,
independent model runs, follow-ups and cancellation. It includes the browser assets,
FastAPI service, qualified Hermes runtime, and healthcare sandbox. Live inference
uses external OpenAI-compatible model servers; this stack does not serve weights.

## Start with Docker Compose

Requires Docker Engine/Desktop with the Compose plugin. No host Python, Node, GPU,
API key, or original evaluation checkout is needed for recorded preview.
From the GTC repository root:

```bash
cd ui
cp .env.example .env
docker compose up --build -d --wait
```

Open <http://127.0.0.1:4193>, select **Recorded preview**, and choose a case.
Blank model IDs intentionally leave live inference unconfigured. `UI_PORT` in `.env`
changes the published owner port. The owner interface binds to localhost.

For a workstation deployment, run this on your laptop:

```bash
ssh -N -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:14193:127.0.0.1:4193 aquraini@tme-workstation
```

Then open <http://127.0.0.1:14193>. Ports 3000/3001 serve separate applications;
4190/4192 belong to the original inference demo. This package uses 4193 by default.

From `ui/`, use `docker compose ps` for readiness, `docker compose logs --tail=80`
for diagnostics, and `docker compose down` to stop. After editing code, run
`docker compose up --build -d --wait` again. Starting Docker and native Python on
the same host port will conflict; stop one or choose a different `UI_PORT`.

## Layout and ownership

| Path | Contents / responsibility |
| --- | --- |
| `frontend/public/index.html` | Browser entry page; no build step |
| `frontend/public/assets/` | JavaScript, CSS, bundled Lucide icons and license |
| `frontend/nginx.conf`, `frontend/Dockerfile` | Static serving and same-origin API/SSE proxy |
| `backend/app/main.py`, `config.py`, `secrets.py` | FastAPI routes, connection settings and mounted-secret support |
| `backend/app/runtime.py`, `worker.py`, `streaming.py` | Isolated Hermes sessions, tools, streaming and cancellation |
| `backend/app/share.py` | Optional capability-link gateway for guests |
| `backend/vendor/hermes_agent_runtime/` | Pinned upstream Hermes source and license |
| `backend/vendor/health_eval_env/` | Healthcare tool/plugin runtime and required modules |
| `backend/requirements.txt`, `requirements.lock` | Direct HTTP dependencies and resolved runtime dependencies |
| `backend/Dockerfile` | Runtime image plus a separate test target |
| `data/cases.json` | Six synthetic held-out cases and baseline/step-25 recordings |
| `tests/` | API, streaming, actual Hermes-worker and sharing checks |
| `compose.yaml` | Frontend and backend services, health checks and runtime volume |
| `compose.secrets.yaml`, `compose.share.yaml` | Optional mounted credentials and guest-sharing overlays |
| `deploy/systemd/`, `run.sh` | Alternative native Python service launch templates |
| `backend/app/prepare_cases.py` | Explicit preparation of a new case bundle |
| `provenance.json`, `provenance.import-r01.json` | Current paths/hashes and preserved original import lineage |

The frontend sends relative `/api/...` requests. In Compose, Nginx serves the page
and forwards API requests and server-sent events to `backend:8000`. Only Nginx has
an owner port on the host; the backend stays inside the Compose network. The proxy
forwards streams without buffering and resolves the backend again after replacement.
The backend starts one worker process per active model lane and holds comparison
state in memory. Keep one API instance; multiple replicas/workers would need a
shared session store and run coordination.

`ui/` is an independent application, not a Next.js route. The root Next.js landing
site, `public/healthcare/r02/` narrative/opening assets, and `healthcare-demo/`
handoff collateral retain their existing layout. Embedding or integrating the
inference view into the landing site is a separate integration step.

## Connect live models

Open **Connections** in the owner UI and set each side's base URL (including `/v1`),
exact serving model ID, and API key if required. Check connections to verify model
discovery; this does not test a full inference request. Each model needs tool calling
and the configured 65,536-token context budget. The inherited protocol uses
32,768 output tokens, temperature 0, top-p 0.9, and reasoning enabled.

Use **Run** for both models or one model; each lane also has its own Run button.
Follow-ups retain that lane's conversation and sandbox state. Stop cancels active
work. A single-model run preserves the other lane. Only one comparison runs at a
time, with at most 20 turns per lane and 20 retained comparisons per process.

Connections entered in the UI last until the backend restarts. For repeatable
startup, set `BASELINE_BASE_URL`, `BASELINE_MODEL`, `CHECKPOINT_BASE_URL`, and
`CHECKPOINT_MODEL` in `ui/.env`. Compose reads that file; native Python uses the
explicit `DEMO_ENV_FILE` shown below. Keys are never returned by the settings API
or saved in browser storage.

For deployed API keys, prefer mounted files. From `ui/`:

```bash
mkdir -p .secrets
chmod 700 .secrets
touch .secrets/baseline_api_key .secrets/checkpoint_api_key
chmod 644 .secrets/baseline_api_key .secrets/checkpoint_api_key
# Edit each file privately; leave empty for a keyless endpoint.
docker compose -f compose.yaml -f compose.secrets.yaml up --build -d --wait
```

The containing directory restricts host access; the file modes allow the non-root
container user to read the bind-mounted secrets. `.secrets/` and `.env` are ignored
by Git and excluded from the build context. The app supports `NAME_FILE` for each
API key and rejects simultaneous nonempty `NAME` and `NAME_FILE` values. The
secrets overlay clears direct key variables. Recreate the backend after rotating
files. Use the same overlay list for subsequent Compose commands.

Inside a container, `127.0.0.1` refers to that container. For a model on the Docker
host, use `http://host.docker.internal:PORT/v1`; the Linux host-gateway mapping is
included. A host service bound only to loopback is **not** reachable through the
Linux bridge: provide a reachable, appropriately restricted host interface or
forwarder. Remote model servers can use their reachable DNS name/IP. No model
server, port forwarding, or GPU configuration is changed by Compose.

## Optional sharing with the demo team

The owner UI has connection controls. The optional gateway hides these controls,
rejects settings writes, and requires the complete capability link for the page,
assets, API calls, and streams. Guests use the same single-operator demo state;
this is not a multi-user session service. Anyone with the link can run inference
against the configured endpoints. Keep it on a trusted private network, or add
an authenticated TLS edge for access beyond that network.

From `ui/`, generate a new token (do not reuse the original demo's token):

```bash
mkdir -p .secrets
chmod 700 .secrets
# Python is inside the image; no host Python required.
docker compose run --rm --no-deps backend python -c \
  'import secrets; print(secrets.token_urlsafe(32))' > .secrets/share_token
chmod 644 .secrets/share_token
```

Set these values in `ui/.env`, replacing the example IP with the host's specific
private IP and using the exact origin guests will open (no trailing slash):

```dotenv
SHARE_BIND_IP=10.1.2.3
SHARE_PORT=4195
DEMO_SHARE_ORIGIN=http://10.1.2.3:4195
```

```bash
docker compose -f compose.yaml -f compose.share.yaml --profile share up --build -d --wait
```

Share `http://10.1.2.3:4195/share/TOKEN/`, replacing `TOKEN` with the new file's
contents. The full link works without cookies. Bare host access is deliberately
rejected. If also using mounted API keys, include `-f compose.secrets.yaml` before
`-f compose.share.yaml`. The owner endpoint stays on localhost:4193. Stop sharing
with the same Compose options plus `stop share`; rotate the token and recreate
the share container to invalidate an old link.

## Native development alternative

From the repository root, with Python 3.12+ and `uv` installed:

```bash
uv venv ui/.venv --python 3.12
uv pip install --python ui/.venv/bin/python -r ui/backend/requirements.lock
uv pip install --python ui/.venv/bin/python --no-deps -e ui/backend/vendor/hermes_agent_runtime
bash ui/run.sh
```

Native mode serves `frontend/public/` through FastAPI at <http://127.0.0.1:4193>,
so Nginx is unnecessary for development. To load a trusted shell environment file:

```bash
DEMO_ENV_FILE=ui/.env bash ui/run.sh
```

Use ordinary host/loopback model URLs in native mode. `DEMO_PORT` sets the native
port; `DEMO_HERMES_PYTHON` can select another interpreter with runtime dependencies.
`DEMO_CASES_FILE` chooses a case bundle, and `DEMO_RUNTIME_DIR` chooses writable
session storage. The defaults are `ui/data/cases.json` and `ui/.local/runtime/`.
`DEMO_ALLOWED_HOSTS` is an explicit comma-separated hostname allowlist; same-origin
checks still apply. The native bind defaults to loopback. Use the sharing gateway
for guests instead of exposing the owner service.

For native user services, review the paths in `deploy/systemd/` before installing
the templates. The owner may load `~/.config/gtc-healthcare-ui.env`; the share
service loads `~/.config/gtc-healthcare-ui-share.env`. Native sharing accepts
`DEMO_SHARE_HOST` (specific private IP), `DEMO_SHARE_PORT`, `DEMO_SHARE_TOKEN_FILE`,
and optional `DEMO_SHARE_UPSTREAM` (default `http://127.0.0.1:4193`).
No service units are installed by these setup commands.

## Sessions, recordings and provenance

Container sessions live in the named `runtime` volume; native sessions live in
ignored `ui/.local/runtime/`. They contain synthetic tool state and agent artifacts.
Restarting loses in-memory comparisons and UI-entered connections; retained files
are not restored as active conversations. `docker compose down` preserves the
volume. `docker compose down -v` permanently removes its session data.

Recordings preserve the imported **GRPO step 25** comparisons and their original,
different patient openings. They are separate from the step-75 Press narrative.
Live runs use the same opening for independent baseline and checkpoint sessions.
The included sandbox exposes 15 healthcare tools. No judge or simulated-patient
endpoint is required. Private reasoning is filtered from patient-visible streams;
interrupted responses are marked incomplete. These synthetic diagnostic cases are
demo evidence, not a new benchmark result or clinical certification.

The original source was `healthcare-agent-evals-grpo-clean-release/demo/` from
**Build Inference UI for PAB**, imported October 7, 2026. The upstream UI was
uncommitted, so the import records source file hashes alongside the evaluation
repository commit. This refactor preserves frontend, recordings, vendor sources
and licenses byte-for-byte. Historical source paths are provenance, not runtime
dependencies. `provenance.json` maps them to the current layout.

To prepare another bundle, run `python -m ui.backend.app.prepare_cases --help`
from the repository root with the native environment active, providing explicit
sealed-case, baseline-run and checkpoint-run paths. It writes a new ignored bundle
under `ui/.local/` and refuses to overwrite it. Keep recording labels accurate.

## Verify and troubleshoot

Run the full backend suite, including actual Hermes with a deterministic local
model fixture (no production model calls), from `ui/`:

```bash
docker build -f backend/Dockerfile --target test -t gtc-healthcare-test .
docker run --rm --read-only --tmpfs /tmp:exec gtc-healthcare-test
```

The test-only `/tmp:exec` mount lets the cancellation fixture launch its temporary
worker script. The runtime services do not require this.

Native equivalent, from the repository root:

```bash
uv pip install --python ui/.venv/bin/python -r ui/backend/requirements-dev.txt
DEMO_TEST_HERMES_PYTHON="$PWD/ui/.venv/bin/python" \
  ui/.venv/bin/python -m pytest ui/tests -q
node --check ui/frontend/public/assets/app.js
```

Without `DEMO_TEST_HERMES_PYTHON`, real-worker tests are skipped. Frontend review
should cover all six recordings, narrow screens, independent runs, streamed
follow-ups and cancellation through the Nginx proxy.

| Symptom | Check |
| --- | --- |
| Address already in use | Stop a previous native/Compose instance or change `UI_PORT` |
| Backend unhealthy | Check logs and `/healthz`; it verifies loaded cases, not remote models |
| Live run asks for configuration | Set the selected lane's exact model ID in Connections or `.env` |
| Model discovery fails | Check URL, credentials and network reachability from the backend container |
| Model discovery works but run fails | Check tool-call/context compatibility and the full inference endpoint |
| 403 from owner API | Use localhost/SSH forwarding; Host and Origin must agree |
| Sharing returns 403 | Use the full new token URL and match `DEMO_SHARE_ORIGIN` exactly |
| Replies arrive only at the end | Disable buffering in any additional reverse proxy; preserve SSE |
| UI settings disappear after restart | Expected; configure environment/mounted keys for repeatable startup |

The runtime lock is generated with `uv pip compile backend/requirements.txt
backend/vendor/hermes_agent_runtime/pyproject.toml --python-version 3.12 -o
backend/requirements.lock` from `ui/`. Refresh deliberately and rerun tests.
Container base images use maintained tags; record resolved digests when promoting
an image to a deployment registry.

Deployment references: [Compose readiness](https://docs.docker.com/compose/how-tos/startup-order/),
[mounted secrets](https://docs.docker.com/compose/how-tos/use-secrets/), and
[Nginx streaming proxy behavior](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering).
