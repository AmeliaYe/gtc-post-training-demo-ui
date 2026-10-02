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

## Coding agent integration

The Coding Agent view reads the three allowlisted demo issues through the
server-side `GET /api/demo/issues` route. Set
`NEMOTRON_DASHBOARD_GITHUB_API_TOKEN` to a repository-scoped fine-grained PAT
with **Issues: Read** permission to use current GitHub presentation data. The UI
falls back to a visibly labeled bundled snapshot when the token or GitHub is
unavailable; the credential is never sent to the browser.

The current view intentionally keeps model activity, trusted test results, and
the independent judge pending until the authenticated coordinator routes exist.
See [docs/coding-agent-integration.md](docs/coding-agent-integration.md) for the
model topology, trust boundary, and remaining live-run work.

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
