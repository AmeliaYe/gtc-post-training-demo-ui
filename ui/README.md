# Healthcare inference UI

A standalone patient-agent comparison demo: six recorded synthetic cases plus live
baseline/checkpoint conversations, streamed patient replies, visible tool activity,
independent model runs, follow-ups and cancellation. It includes the browser assets,
FastAPI service, qualified Hermes runtime, and healthcare sandbox. Live inference
uses external OpenAI-compatible model servers; this stack does not serve weights.

## Start with Docker Compose

Requires Docker Engine/Desktop with the Compose plugin. No host Python, Node, GPU,
API key, or original evaluation checkout is needed to start it; live runs need model
endpoints (and recorded preview needs the six-case bundle).
From the GTC repository root:

```bash
cd ui
cp .env.example .env
docker compose up --build -d --wait
```

Open <http://127.0.0.1:4193>. The default bundle is one live case without recordings,
so there is no Recorded preview; to browse the six recorded cases, set
`DEMO_CASES_FILE=/opt/demo/ui/data/cases.json` in `ui/.env` and recreate the backend.
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
| `compose.tunnel.yaml`, `tunnel/` | Optional SSH-tunnel sidecar to a remote model host |
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
inference view is described under
[Embed in the landing site](#embed-in-the-landing-site).

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

## Case bundles

Compose defaults to `data/cases.live-demo.json`: one case (`adult-validation-0076`,
a 72-year-old with heart failure who needs to move a September 20th appointment)
and no recordings, so the Recorded preview toggle is hidden. The chart and starting
appointments were reconstructed from a checkpoint rollout (its `get_profile` result
and turn-0 runtime context); the original case record was unavailable and the opening
prompt was supplied by the demo owner. `data/cases.json` still holds the six recorded
step-25 cases. Select a bundle with `DEMO_CASES_FILE` (Compose:
`/opt/demo/ui/data/cases.json`; native default is `data/cases.json`).

## Reach a remote model through an SSH tunnel

Use this when the checkpoint model is served on a remote machine that is only
reachable over SSH. Under Compose, `127.0.0.1` inside the backend container is the
container itself, so a tunnel on your laptop's loopback is invisible to it. The
`model-tunnel` sidecar opens the tunnel inside the Compose network instead, so every
user of the stack gets the same checkpoint endpoint without a personal tunnel.

1. **Start the model server** on the remote machine (SSH in and confirm the container
   serving the checkpoint is up). The sidecar cannot do this for you. The server must
   listen on the remote host's loopback or network port you set below (default 18045).
2. **Store the SSH password** in an ignored secret file. From `ui/`:

   ```bash
   mkdir -p .secrets
   chmod 700 .secrets
   printf '%s' 'REMOTE_PASSWORD' > .secrets/model_host_password
   chmod 644 .secrets/model_host_password
   ```

3. **Set the host in `ui/.env`** (the checkpoint URL is set by the overlay, so any
   `CHECKPOINT_BASE_URL` in `.env` is overridden; keep `CHECKPOINT_MODEL`):

   ```dotenv
   MODEL_HOST_ADDRESS=10.110.16.185
   MODEL_HOST_USER=nvidia
   # MODEL_TUNNEL_PORT=18045   # default; remote and local port
   CHECKPOINT_MODEL=pab-astra-step25-heldout
   ```

4. **Start with both Compose files** (use the same pair for every later command):

   ```bash
   docker compose -f compose.yaml -f compose.tunnel.yaml up --build -d --wait
   ```

5. **Verify the tunnel from the backend:**

   ```bash
   docker compose -f compose.yaml -f compose.tunnel.yaml exec -T backend python -c \
     "import urllib.request as u;print(u.urlopen('http://model-tunnel:18045/v1/models',timeout=8).read()[:120])"
   ```

   You should see the checkpoint's model ID. This verifies model discovery only; run
   one case in the UI to test full inference. A personal laptop tunnel on the same port
   does not conflict, because the sidecar's port is not published to the host.

The sidecar reconnects every 5 seconds if SSH drops and trusts the host key on first
connect, then pins it in the `tunnel-ssh` volume. If the remote host is reinstalled
or its key changes, run `docker compose -f compose.yaml -f compose.tunnel.yaml down -v`
(this also removes session data) or remove the `tunnel-ssh` volume. The tunnel is
reachable only from inside the Compose network. Treat `.secrets/` as sensitive, since
it holds a login for the model host; prefer a dedicated key or restricted account if
your environment allows it. To share with guests, add
`-f compose.share.yaml --profile share` to the same command.

## Embed in the landing site

The Healthcare tile in the Next.js site has a **Cached / Live demo** toggle.
Live demo iframes this UI, which is `http://127.0.0.1:4193` by default; set
`NEXT_PUBLIC_HEALTHCARE_LIVE_URL` in the landing site's `.env.local` to change it.

- The embed loads the UI with `?embed=1`, which hides the NVIDIA header bar and the
  patient follow-up panel and applies the recorded demo's dark styling. Opening the
  UI directly (without `embed=1`) keeps the standalone look and follow-ups.
- **Compose:** the Nginx frontend allows embedding from `http://localhost:3000` and
  `http://127.0.0.1:3000` (`frame-ancestors` in `frontend/nginx.conf`). Add other
  landing-site origins there and rebuild the frontend image.
- **Native:** set `DEMO_FRAME_ANCESTORS` in the env file to space-separated exact
  origins, for example `DEMO_FRAME_ANCESTORS=http://localhost:3000 http://127.0.0.1:3000`.
  The default is `'none'`. Restart after changing it.
- Open the landing site on the same loopback name as the frame (`127.0.0.1:3000` for
  `127.0.0.1:4193`); mixing `localhost` and `127.0.0.1` is blocked by the native
  cross-site check.
- The guest-sharing gateway still forbids embedding.

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
| Checkpoint fails only under Compose | `127.0.0.1` is the container; use the [SSH tunnel sidecar](#reach-a-remote-model-through-an-ssh-tunnel) or a reachable host |
| Live demo iframe is blank | Check the frame-ancestors setting under [Embed in the landing site](#embed-in-the-landing-site) |
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
