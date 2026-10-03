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

The **Cyber Defense** demo presents recorded security reviews from Depthfirst's Nemotron RL evaluation: Openfire (CVE-2019-18394), set-value (CVE-2019-10747), and OpenC3 COSMOS (CVE-2025-68271). Select a repository and checkpoint to explore its file map, input flow, three connected source excerpts, verifier result, and report. The earlier/final report contrast stays visible above the walkthrough. Playback advances at a fixed 3.5 seconds per step; Previous/Next, phase buttons, and the timeline provide immediate navigation. Reduced-motion users see the report immediately when pressing Play.

The fixture in `src/lib/cyber-fixture.ts` compares steps 5 and 200 on the same source revisions. Step 5 is already RL-trained. Diagrams and findings are condensed explanations; `src/lib/cyber-visuals.ts` includes exact source excerpts linked to the evaluated commits. Playback timing is illustrative, and no inference service or AWS credentials are needed. Counts are from recorded verifier outputs. Unmatched findings were not fully adjudicated, so report consolidation is not a measured precision gain. The dfbench section uses the supplied detection-recall comparison (16.8% → 26.5%) for Fireworks FP4 versus the step-180 RL checkpoint. These benchmark runs are separate from the selected step-5/step-200 trajectories. Benchmark scope statistics describe the full dfbench dataset, not the size of these runs; see [dfbench](https://depthfirst.com/research/dfbench) and [its methodology](https://depthfirst.com/research/dfbench-v1).

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
