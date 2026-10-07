# Healthcare inference UI

This is the UI from **Build Inference UI for PAB**, imported from
`healthcare-agent-evals-grpo-clean-release/demo/` on October 7, 2026.
It runs two independent Hermes healthcare agents against configurable baseline
and checkpoint endpoints. Patient-facing replies stream as they arrive, with
tool activity, independent model runs, follow-ups, cancellation and recorded preview.

The frontend, backend, six synthetic held-out cases and their recorded comparisons,
Lucide assets/license, pinned Hermes runtime, and required healthcare sandbox
modules are included here. No original evaluation checkout is needed to run it.
Model serving endpoints must be supplied separately for live inference.

## Contents

| Path | Purpose |
| --- | --- |
| `static/index.html` | UI entry page, served by the Python app |
| `static/app.js`, `static/styles.css`, `static/icons.js` | Browser logic, styling, bundled Lucide icons |
| `app.py`, `config.py` | Local HTTP/API service and model connections |
| `runtime.py`, `worker.py`, `streaming.py` | Independent Hermes runs, tool events, streamed replies |
| `data/cases.json` | Six source cases and baseline/step-25 recorded comparisons |
| `vendor/hermes_agent_runtime/` | Qualified Hermes source and upstream license |
| `vendor/health_eval_env/` | Healthcare tool/plugin runtime and its import dependencies |
| `share.py`, `systemd/` | Optional network sharing gateway and service templates |
| `test_demo.py`, `test_share.py` | Backend, streaming, worker and sharing checks |
| `prepare_cases.py`, `provenance.json` | Explicit artifact preparation and source/file SHA-256 records |

`ui/` is a source directory, not a Next.js page route. Run it as the Python service
below. The GTC Press narrative and robot-opening pages retain their existing routes.

## Install and run

From the **GTC repository root**, using Python 3.12+ and `uv`:

```bash
uv venv ui/.venv --python 3.12
uv pip install --python ui/.venv/bin/python -r ui/requirements.txt
# Required for live Hermes runs; recorded preview needs only the command above.
uv pip install --python ui/.venv/bin/python -e ui/vendor/hermes_agent_runtime
bash ui/run.sh
```

Open <http://127.0.0.1:4193>. The server binds to loopback. Select **Recorded preview**
to browse the included comparisons before configuring an endpoint.

When running on the workstation, forward its port to your laptop:

```bash
ssh -N -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:14193:127.0.0.1:4193 aquraini@tme-workstation
```

Then open <http://127.0.0.1:14193>. These default ports are separate from the source
demo's services on 4190 and 4192. No existing service is installed or restarted by
copying this package.

## Configure live models

Open **Connections** and provide an OpenAI-compatible base URL, serving model ID
and optional API key for each side. **Run** selects both, baseline, or checkpoint;
each panel also has an independent Run button. Follow-ups retain that model's
own tool state and conversation history. A single-model run preserves the other
panel's results. Stop cancels the currently active request.

Alternatively, set the `BASELINE_*` and `CHECKPOINT_*` variables shown in
`.env.example`. `DEMO_PORT` changes the app port. `DEMO_HERMES_PYTHON` optionally
selects another interpreter with the bundled runtime's dependencies installed.
The worker always imports this package's vendor sources and healthcare tools.
`DEMO_ENV_FILE` can explicitly load a trusted shell environment file at launch.

Connections entered in the browser remain in server memory until restart. API
keys are not returned to the browser, saved in browser storage, or included in
this package. Worker sessions are isolated under ignored `.local/runtime/`.
The loopback app rejects foreign origins/hosts. It is a single-operator service;
the included gateway is the intended optional sharing path.

For persistence, review the paths in `systemd/gtc-healthcare-ui.service`, copy it
into your user systemd directory, and enable it explicitly. It may load a private
`~/.config/gtc-healthcare-ui.env` file. The separate sharing service uses
`~/.config/gtc-healthcare-ui-share.env` with `DEMO_SHARE_HOST` (a specific private
network IP), `DEMO_SHARE_PORT=4195`, and a newly generated `DEMO_SHARE_TOKEN`.
Share the complete `http://HOST:4195/share/TOKEN/` address. The gateway uses the
app on loopback port 4193, hides connection controls, and supports streaming
without requiring cookies. Review `share.py` if changing the upstream app port.
Existing deployed share links and credentials were not copied.

## Evidence and behavior

- Recorded mode preserves original baseline and **GRPO step 25** conversations.
  Archived patient openings differ and remain labeled separately. This differs
  from the step-75 evidence in the GTC Press narrative.
- Live runs send the same opening and system prompt to separate model sessions.
  Tool effects remain isolated. A failed side can be rerun without clearing the other.
- The healthcare sandbox exposes 15 tools. The backend does not start GPU servers,
  load model weights, or run training. No judge/simulated-patient endpoint is required.
- The inherited protocol uses temperature 0, top-p 0.9, a 32,768 output-token budget,
  65,536 context budget, reasoning enabled, and up to 20 turns per model. A model
  endpoint must support the corresponding context budget and tool calling.
- Reasoning stays private; patient-facing deltas stream, provisional pre-tool text
  resets appropriately, and interrupted replies are marked incomplete.
- These six synthetic cases are held-out diagnostic reuse, not new benchmark
  evidence or a clinical-quality certification. Source artifact hashes are retained
  in `data/cases.json`; source paths are provenance, not runtime dependencies.

To prepare another set, run `python -m ui.prepare_cases --help` and provide explicit
sealed-case, baseline-run and checkpoint-run paths. It writes a new ignored bundle
under `.local/` by default and refuses to overwrite it. Set `DEMO_CASES_FILE` to use
that bundle. Do not relabel the packaged recordings as another checkpoint.

## Verify

```bash
uv pip install --python ui/.venv/bin/python -r ui/requirements-dev.txt
DEMO_TEST_HERMES_PYTHON="$PWD/ui/.venv/bin/python" \
  ui/.venv/bin/python -m pytest ui/test_demo.py ui/test_share.py -q
node --check ui/static/app.js
```

The Hermes integration checks run against a local deterministic test endpoint;
they do not invoke production models. Without `DEMO_TEST_HERMES_PYTHON`, those
integration checks are skipped. `provenance.json` identifies the upstream source
commit and per-file hashes because the source UI itself was uncommitted at import.
