# Coding agent integration

This document records the integration boundary between this multi-demo UI and the
Nemotron coding comparison maintained in `jdebski-nvidia/agentic-gtc-demo`.

## What this foundation adds

- Replaces the Coding Agent card's hard-coded issue presentation with a strict,
  allowlisted catalog contract for GitHub issues 16–18.
- Adds `GET /api/demo/issues`, a same-origin Next.js route that reads GitHub with
  the server-only `NEMOTRON_DASHBOARD_GITHUB_API_TOKEN`.
- Treats GitHub as read-only presentation provenance. Issue content cannot select
  repository paths, commands, prompts, tests, model routes, or runner policy.
- Bounds GitHub responses to 256 KiB, rejects redirects, applies a 2.5-second
  timeout, and validates every returned issue against an immutable fixture binding.
- Falls back to the checked-in issue snapshot when a token is unavailable or the
  GitHub response is unavailable/invalid. The response identifies that state as
  `source.kind: "bundled-snapshot"` and includes a `fallbackReason`; the UI must
  keep that provenance visible.

The route performs no GitHub writes. The token should be a fine-grained PAT scoped
only to `jdebski-nvidia/agentic-gtc-demo` with **Issues: Read** permission. It is
read only from the named server environment variable; ambient CLI or GitHub tokens
are deliberately ignored.

## Fixed execution bindings

| GitHub issue | Demo fixture | Coordinator scenario |
| --- | --- | --- |
| `#16` | `DEMO-1842` | `asyncio-gather-cancel-v1` |
| `#17` | `DEMO-1911` | `oauth-proxy-callback-v1` |
| `#18` | `DEMO-2048` | `cuda-capability-dedupe-v1` |

The synthetic repository, fixture files, symbol, and scenario remain bundled and
immutable. Live GitHub data may update only the title, problem, acceptance
criteria, and display metadata after strict validation.

## Intended model topology

The final live view should present this topology:

| Role | Lane A | Lane B |
| --- | --- | --- |
| Router | Nemotron Super | Codex |
| Coder | Shared Nemotron Super binding | Shared Nemotron Super binding |
| Trusted verification | Isolated sandbox runner | Isolated sandbox runner |
| Judge | Independent Codex invocation after both lanes finish | Independent Codex invocation after both lanes finish |

These names describe the intended deployment, not a client-side source of truth.
The production UI must derive provider/model identities, binding fingerprints, and
availability from authenticated coordinator readiness and retained run evidence.
It must not hard-code a model as active or call the judge a reused router binding.

## Required production work

### 1. Add a Next.js backend-for-frontend for live runs

Implement same-origin Route Handlers that proxy only the allowlisted coordinator
operations:

| Browser route | Coordinator operation |
| --- | --- |
| `POST /api/live/coding-comparison/runs/readiness` | `GET /v3/health/coding-comparison` |
| `POST /api/live/coding-comparison/runs` | `POST /v3/examples/coding-comparison/{scenarioId}/runs` |
| `GET /api/live/coding-comparison/runs/{runId}` | Fetch the matching retained snapshot |
| `GET /api/live/coding-comparison/runs/{runId}/events` | Stream the matching retained SSE feed |

The last route must proxy Server-Sent Events without buffering and preserve event
IDs for replay. Browser code must never receive coordinator or model-provider
credentials.

### 2. Establish coordinator connectivity and release parity

The hosted UI cannot use a laptop-local private forward. Provide an authenticated,
TLS-reachable private path from the deployed Next server to the coordinator. Add
these server-only values (the final platform secret names may be mapped at deploy
time):

- `NEMOTRON_DASHBOARD_COORDINATOR_BASE_URL`
- `NEMOTRON_DASHBOARD_COORDINATOR_API_TOKEN`
- `NEMOTRON_DASHBOARD_CODING_RUN_API_TOKEN`
- `NEMOTRON_DASHBOARD_EXPECTED_COORDINATOR_RELEASE_REVISION`

Fail readiness when the expected exact 40-character release revision, protocol
compatibility value (`coding-comparison-v3.2`), scenario registry, model
fingerprints, or runner identity does not match. Do not infer downstream readiness
after a bridge timeout.

### 3. Implement run recovery

Persist only the opaque run ID and replay cursor in browser `sessionStorage`.
After refresh or stream interruption, fetch the retained snapshot, validate it,
then reconnect with the last observed event ID. Enforce monotonic event ordering,
bounded event frames, bounded snapshots, and explicit retention-expired behavior.

### 4. Render only trusted evidence

Illuminate a model node only while a retained coordinator model call reports
`running`. Render stages only after the coordinator creates them. Test pass/fail
counts must come exclusively from the trusted sandbox runner. The judge is a
separate qualitative comparison and must wait for both terminal lane outcomes;
it cannot override runner results. Directional before/after claims require attached
evidence, otherwise display an unavailable or pending state.

### 5. Secure the public deployment

Before enabling run creation on the hosted demo, add viewer authentication,
durable per-user and global rate limits, request/audit correlation, run concurrency
limits, and safe error redaction. Keep all GitHub, coordinator, and provider tokens
server-side. Continue failing closed when any required boundary is unverified.

### 6. Add verification

At minimum, add automated coverage for:

- strict issue-catalog validation, fallback provenance, response limits, timeout,
  redirects, allowlisted issue numbers, and same-origin enforcement;
- readiness compatibility and exact release-revision checks;
- start, snapshot, SSE parsing, replay, duplicate/out-of-order events, disconnects,
  expiry, and cancellation;
- truthful activity highlighting, fingerprint mismatch behavior, trusted test
  evidence, judge gating, and unavailable metric states;
- `next build`, lint, TypeScript checking, and a browser smoke test against a
  controlled coordinator fixture.

## Ownership boundary

Keep prompts, model calls, orchestration, retained run state, judge execution,
sandbox implementation, trusted tests, and deployment profiles in
`agentic-gtc-demo`. This repository should own the larger-demo presentation, the
strict browser contracts, and the narrow authenticated BFF. Do not copy the source
dashboard wholesale or introduce a second browser-side orchestration engine.
