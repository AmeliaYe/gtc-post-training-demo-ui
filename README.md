# GTC Post-Training Demo UI

An interactive demonstration of local Nemotron customization and inference on NVIDIA DGX Station.

The experience opens with five domain use cases—cybersecurity, healthcare simulation, multimodal biology, coding, and computer use. Selecting a use case expands it into a focused before-and-after comparison while the remaining demos move into a compact side rail.

## Healthcare inference demo

The standalone inference application is in [`ui/`](ui/README.md), with separate
frontend and backend directories, Docker Compose startup, an optional SSH-tunnel
sidecar for a remote checkpoint model, and an embeddable live view. See its README
for model connections, the tunnel, native development, and team sharing.

The landing site's Healthcare tile has a **Cached** (pre-recorded) narrative and a **Live demo**
toggle; Live demo embeds this application. Compose defaults to a single live case
with no recordings. The original six recorded cases remain available by setting
`DEMO_CASES_FILE` (see [`ui/README.md`](ui/README.md#case-bundles)).

## Run the full demo

Start these in order. Ports: healthcare inference UI `4193`, multimodal biology
`5173`, landing site `3000`. **Port 3000 must be free** before `npm run dev`: if
something else holds it, Next.js silently starts on `3001`, and the healthcare Live
demo frame will be blocked (see the note below).

1. **Checkpoint model endpoint.** The healthcare **After** lane needs an
   OpenAI-compatible server with tool calling and a 65,536-token context serving the
   checkpoint (model ID `pab-astra-step25-heldout`, port `18045` on the model host).
   Confirm it is up from wherever you run the stack: `curl <endpoint>/v1/models`
   should list that model ID. Set the **Before** lane's endpoint and key in
   `ui/.env` (see [`ui/README.md`](ui/README.md#connect-live-models)).
2. **SSH tunnel to the model host** (if it is only reachable over SSH). Put the host
   login in `ui/.secrets/model_host_password` and `MODEL_HOST_ADDRESS` /
   `MODEL_HOST_USER` in `ui/.env`, then start Compose with the tunnel overlay:

   ```bash
   cd ui
   docker compose -f compose.yaml -f compose.tunnel.yaml up --build -d --wait
   ```

   Details, verification and troubleshooting:
   [`ui/README.md`](ui/README.md#reach-a-remote-model-through-an-ssh-tunnel). If the
   model is directly reachable, use `docker compose up --build -d --wait` and set
   `CHECKPOINT_BASE_URL` instead. Open <http://127.0.0.1:4193> to check the UI alone.
3. **Multimodal biology** (separate repository). Clone
   [nemotron-stitch-demos](https://github.com/NVIDIA-dev/nemotron-stitch-demos), run
   and serve its model checkpoints as described there, then:

   ```bash
   cd nemotron-stitch-demos/nemotron-kermt/demo/web
   npm ci
   npm run dev     # http://127.0.0.1:5173
   ```

4. **Landing site.** From this repository's root:

   ```bash
   npm install
   npm run dev     # http://localhost:3000
   ```

   Choose **Healthcare → Live demo** and **Multimodal Biology**. Both are iframes;
   a blank frame means the corresponding service above is not running.

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

Tracked events include demo views, active dwell heartbeats, use-case selections, evaluation runs, resets, and aggregate session summaries. Active dwell pauses when the page is hidden or idle. Prompt text, form data, screen content, and session recordings are not collected.

The private dashboard reports:

- Views and sessions
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
