# GTC Post-Training Demo UI

An interactive demonstration of local Nemotron customization and inference on NVIDIA DGX Station.

The experience opens with five domain use cases—cybersecurity, healthcare simulation, multimodal biology, coding, and computer use. Selecting a use case expands it into a focused before-and-after comparison while the remaining demos move into a compact side rail.

## Healthcare inference demo

The standalone inference application is in [`ui/`](ui/README.md), with separate
frontend and backend directories, bundled synthetic recordings, and Docker Compose
startup. See its README for model connections, native development, and team sharing.

```bash
cd ui
docker compose up --build -d --wait
```

Open <http://127.0.0.1:4193> and choose **Recorded preview**. Live inference requires
external model endpoints. This runs independently of the Next.js landing site below.

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

The **multimodal biology** demo is embedded as an iframe. First clone the [nemotron-stitch-demos repo](https://github.com/NVIDIA-dev/nemotron-stitch-demos) and run and serve the model checkpoints. Then start the demo UI using:

```bash
cd nemotron-stitch-demos/nemotron-kermt/demo/web
npm ci
npm run dev
```

It should start at <http://127.0.0.1:5173>.
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
