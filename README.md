# GTC Post-Training Demo UI

An interactive demonstration of local Nemotron customization and inference on NVIDIA DGX Station.

The experience opens with five domain use cases—cybersecurity, healthcare simulation, multimodal biology, coding, and computer use. Selecting a use case expands it into a focused before-and-after comparison while the remaining demos move into a compact side rail.

## Live demo service boundary

The gallery includes two live inference experiences. This repository contains the
booth UI and the local integration layers, but it does **not** contain model weights
or start the model-serving infrastructure.

| Experience | Included in this repository | Must already be running separately | Booth-facing port | Readiness check |
| --- | --- | --- | --- | --- |
| Healthcare Cached | Recorded narrative and assets | Nothing | `3000` | Open the Healthcare **Cached** view |
| Healthcare Live | Healthcare browser UI, FastAPI/Hermes runtime, sandbox and Compose/tunnel configuration under `ui/` | Reachable OpenAI-compatible baseline/checkpoint model endpoints; the remote checkpoint server must be started before the tunnel | `4193` | `curl -fsS http://127.0.0.1:4193/healthz` |
| Multimodal Biology Live | Booth frontend under `kermt-web-ui/` | KERMT encoder, base worker, post-trained worker, gateway and model artifacts | `5173`; gateway at `8080` | `curl -fsS http://127.0.0.1:5173/api/health` |

`npm run dev` starts only the portal. `npm run dev:all` starts the portal and the
Biology **frontend**, but still does not start Healthcare model endpoints or the
KERMT inference stack. A visible iframe proves that its frontend is available; it
does not prove that a live model request will succeed.

Detailed station provisioning remains in the operator runbooks rather than this
repository because it contains machine-specific addresses, private artifact access,
registry credentials and hardware-specific recovery steps. Do not commit passwords,
tokens, fixed booth IPs or model artifacts here.

## Healthcare inference demo

The standalone inference application is in [`ui/`](ui/README.md), with separate
frontend and backend directories, Docker Compose startup, an optional SSH-tunnel
sidecar for a remote checkpoint model, and an embeddable live view. See its README
for model connections, the tunnel, native development, and team sharing.

The landing site's Healthcare tile has a **Cached** (pre-recorded) narrative and a **Live demo**
toggle; Live demo embeds this application. Compose defaults to a single live case
with no recordings. The original six recorded cases remain available by setting
`DEMO_CASES_FILE` (see [`ui/README.md`](ui/README.md#case-bundles)).

The Compose tunnel provides connectivity to a remote model endpoint; it does not
start that endpoint. An operator must first start and verify the model server on the
model host. Keep its station-specific startup scripts, host credentials and API keys
outside this repository.

## Run the full demo

Start these in order. Ports: healthcare checkpoint endpoint/tunnel `18045`,
healthcare inference UI `4193`, KERMT encoder `8003`, KERMT workers `8081` and
`8082`, KERMT gateway `8080`, multimodal biology frontend `5173`, and landing site
`3000`. **Port 3000 must be free** before `npm run dev`: if
something else holds it, Next.js silently starts on `3001`, and the healthcare Live
demo frame will be blocked (see the note below).

1. **Healthcare model endpoints.** The Healthcare live comparison needs reachable
   OpenAI-compatible model servers with tool calling and the configured 65,536-token
   context. The booth checkpoint is served as `pab-astra-step25-heldout` on port
   `18045` of its model host. Use the operator runbook to start that remote service,
   then confirm `<endpoint>/v1/models` lists the expected model ID. Configure both
   comparison lanes in `ui/.env`; do not commit that file or its keys. See
   [`ui/README.md`](ui/README.md#connect-live-models).
2. **Healthcare UI and SSH tunnel** (when the endpoint is only reachable over SSH).
   Put the host login in `ui/.secrets/model_host_password` and `MODEL_HOST_ADDRESS` /
   `MODEL_HOST_USER` in `ui/.env`, then start Compose with the tunnel overlay:

   ```bash
   cd ui
   docker compose -f compose.yaml -f compose.tunnel.yaml up --build -d --wait
   ```

   Details, verification and troubleshooting:
   [`ui/README.md`](ui/README.md#reach-a-remote-model-through-an-ssh-tunnel). If the
   model is directly reachable, use `docker compose up --build -d --wait` and set
   `CHECKPOINT_BASE_URL` instead. Verify `http://127.0.0.1:4193/healthz` before using
   the Live toggle. Opening the page alone checks the UI, not model inference.
3. **KERMT inference stack.** Provision the station with the external KERMT runtime,
   container images and model artifacts described in the Biology operator runbook.
   Start and verify these services in order:

   - KERMT encoder on `8003`
   - Base Nemotron worker on `8081`
   - Post-trained KERMT-conditioned worker on `8082`
   - Gateway on `8080`

   The encoder must be healthy before the trained worker starts; warm up the base
   worker before opening the booth. The gateway is the only KERMT service the local
   frontend should call. If it runs on another station, create a local SSH forward
   for `8080`, then verify `curl -fsS http://127.0.0.1:8080/api/health`.
4. **Multimodal Biology frontend.** From this repository's root, point the Vite proxy
   at the local or forwarded gateway and start the embedded frontend:

   ```bash
   KERMT_BACKEND_URL=http://127.0.0.1:8080 npm run dev:bio
   # frontend: http://127.0.0.1:5173
   # end-to-end readiness: http://127.0.0.1:5173/api/health
   ```

5. **Landing site.** From this repository's root:

   ```bash
   npm install
   npm run dev     # http://localhost:3000
   ```

   Choose **Healthcare → Live demo** and **Multimodal Biology**. Both are live-demo
   iframes. A blank frame means its frontend is down; a visible page with a failed
   request means its external model service, gateway, tunnel or credentials are not
   ready.

**Embedding origins.** Compose's Nginx allows the healthcare frame only from
`http://localhost:3000` and `http://127.0.0.1:3000` (`ui/frontend/nginx.conf`). If
Next.js starts on another port, stop whatever holds `3000` (check with
`lsof -iTCP:3000 -sTCP:LISTEN` or `docker ps`) and restart `npm run dev`. Open the landing site on the same
loopback name as the frame URL. `NEXT_PUBLIC_HEALTHCARE_LIVE_URL` changes the
healthcare frame URL (default `http://127.0.0.1:4193`).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Embedded demos

The **multimodal biology** and **healthcare live** views are embedded as iframes; see
[Run the full demo](#run-the-full-demo) for how to start each service.

The **multimodal biology** demo (`kermt-web-ui/`) is embedded as an iframe pointed at `http://127.0.0.1:5173`. Its frontend lives in this repo; the inference backend (model checkpoints, molecule validation, generation endpoints) needs to be set up and run separately.

```bash
npm run dev:bio      # just the biology demo frontend (for testing)
npm run dev:all      # the main app + the biology demo frontend together
```

The frontend expects `/api/health`, `/api/molecule`, and `/api/{base,kermt}/generate` from a backend proxied at `KERMT_BACKEND_URL` (defaults to `http://127.0.0.1:8080`, see [kermt-web-ui/vite.config.js](kermt-web-ui/vite.config.js)). Make sure to update the URL if the backend is running elsewhere.

## Private analytics

The demo can send privacy-conscious aggregate events to PostHog and expose a password-protected dashboard at `/admin/analytics`. The route is not linked from the public interface.

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` for event ingestion
- `NEXT_PUBLIC_DEMO_STATION_ID` to distinguish booth machines
- `ANALYTICS_ADMIN_USER` and `ANALYTICS_ADMIN_PASSWORD` for dashboard access
- `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_API_HOST` for server-side aggregate queries

The PostHog personal API key needs only the `query:read` scope. It must remain server-side and must never use the `NEXT_PUBLIC_` prefix.

Tracked events include demo launches, landing-page and use-case views, per-surface active dwell, use-case selections, evaluation runs, resets, and aggregate session summaries. Active dwell pauses when the page is hidden, the browser loses focus, or the visitor is idle for 60 seconds. Prompt text, form data, screen content, and session recordings are not collected.

The private dashboard reports:

- Views and sessions
- Views, qualified views, quick exits, and active dwell for the landing page and every use case
- Average and median active dwell
- Engaged-session rate
- Evaluation runs
- Use-case popularity
- Rapid-switch sessions, kept separate from genuine engagement

## Technology

- Next.js
- React
- TypeScript
- Framer Motion
- Tailwind CSS
