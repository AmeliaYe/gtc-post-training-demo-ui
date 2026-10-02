# GTC Healthcare integration r01

Adapted from Press r33 / `outputs/press-narrative-r06` on October 1, 2026.
The source revision remains unchanged. This integration includes only How It
Learns, Before & After, Results, and Get Started. It starts on How It Learns.

The workflow animation, exact recorded conversations, evidence hashes, five-axis
Results chart, full-rubric aggregate, evaluation context, and resource links are
preserved. Introduction and its unused three.js dependencies are excluded.
The GTC shell supplies branding; the embedded document retains its four-page
navigation and sends same-origin height updates to its React host.

## Workstation application

- Repository: `/home/aquraini/gtc-post-training-demo-ui`
- Branch: `healthcare-demo`, based on `b34d734`; prepared for commit; no commit or push.
- Bundle destination: `public/healthcare/r01/`
- React host: `src/app/components/HealthcareDemo.tsx`
- Existing source edits: `src/app/page.tsx`, `src/app/globals.css`, `eslint.config.mjs`
- The component, static collateral, and source edits are included in commit
  preparation following the user’s explicit authorization.
- Application port: 3001. Port 3000 is a different application (Clinical AIQ).
- Verified laptop tunnel: `http://localhost:13001`; open Healthcare in the gallery.
- Direct narrative: `http://localhost:13001/healthcare/r01/index.html#how-it-learns`.

The dev server's existing hostname-origin restriction still applies. If the
laptop tunnel stops, run:

```sh
ssh -N -L 127.0.0.1:13001:127.0.0.1:3001 aquraini@tme-workstation
```

Use `localhost` in the browser, not `127.0.0.1`.

## Verification and preservation

82 browser checks cover four pages at 1440, 1280, 768 and 390 px, both recorded
cases and full-trace dialogs, result values, resource links, host navigation,
asset loading and horizontal layout. Lint and TypeScript pass.

QA: `scripts/qa_gtc_healthcare_r01.cjs`. Source snapshots, hashes, app integration
copies and verification records: `work/press-gtc-healthcare-r01/`. Screenshots:
`output/playwright/gtc-healthcare-r01/`. These assets are also mirrored to the
golden healthcare checkout using the standing scoped asset-sync workflow.

Future changes should create a new bundle revision and preserve r01.
