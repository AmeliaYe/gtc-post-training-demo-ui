# GTC Post-Training Demo UI

An interactive demonstration of local Nemotron customization and inference on NVIDIA DGX Station.

The experience opens with five domain use cases—cybersecurity, healthcare simulation, multimodal biology, coding, and computer use. Selecting a use case expands it into a focused before-and-after comparison while the remaining demos move into a compact side rail.

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
