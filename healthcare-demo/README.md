# Current Demo team handoff — October 7, 2026

- **Introduction R09:** [HTML entry point](../public/healthcare/r03/introduction/index.html) and [integration instructions](../public/healthcare/r03/README.md). The larger gym animation now shows completed reps before muscle growth, local halos and smooth abdominal contours. Copy the entire introduction/ directory with its assets/ folder.
- **Post-training for healthcare:** [Four-page HTML](../public/healthcare/r02/healthcare/index.html). How It Learns → Before & After → Results → Getting Started; no repeated Introduction.
- **Previous Introduction:** [r02 / gym R06](../public/healthcare/r02/introduction/index.html), preserved for rollback.

The Healthcare tile uses the existing r02 healthcare bundle. Introduction R09 is
ready for the Demo team to compose into the landing page. Delivery r03 includes a
README, presenter cues and SHA-256 provenance. The approved animation source is
gym R09; older dependency names inside assets/ remain active runtime modules.
The healthcare-demo branch contains this handoff.

---

# Healthcare demo — standalone reference tracks

Complete standalone copies of the Press and Developer experiences, packaged on
October 1, 2026 for reference alongside the GTC Healthcare integration.
Package r03 includes the Press r07 animation fix; r02 removed unused assets from earlier experiments.
Each track includes its own HTML, JavaScript, CSS, imagery, recorded evidence,
and bundled library licenses. Keep each HTML file with its `assets/` directory.

## Contents

| Folder | Entry point | Revision and contents |
| --- | --- | --- |
| `press/` | [Full Press HTML](press/nemotron-post-training-press-r07.html) | Press r34 / narrative r07: Introduction, How It Learns, Before & After, Results, Get Started. |
| `developer/` | [Full Developer HTML](developer/nemotron-post-training-developer.html) | Developer r30 **draft** / executive-feedback r04: Introduction, The Refill Case, Why Post-Train, How to Post-Train, Case Trace, Benchmarks, Get Started. |
| `provenance.json` | [Source and checksum manifest](provenance.json) | Original source directories, revisions, and SHA-256 checksums for every copied file. |

These copies are independent of the Next.js shell and preserve their source files
byte-for-byte. The GTC Healthcare tile continues to use its four-page bundle in
`public/healthcare/r02/healthcare/`; this reference folder does not change that integration.

## Google Sheets narratives

- **Current Press narrative:** [Narrative – Press](https://docs.google.com/spreadsheets/d/1pjaX6vpL347YV7OJYNWN2Y_mqANTSRL7Lvir0JCUrgk/edit#gid=1409351755).
  This is the five-page Press talk track. Its Introduction screenshot/cue predates
  the r06 removal of the bottom component row and footer; the packaged HTML
  includes that cleanup and the r07 interaction-trace animation fix.
- **Developer narrative:** [Executive-feedback r04 talk-track workbook](https://docs.google.com/spreadsheets/d/1RZNnjdWhNnd_yTpBEuxI0nuSJAFIIHCz0V--I57Df1w/edit).
  Select **Refill – Developer** for the seven-page Developer route. This workbook
  also retains the earlier Press route.

The Google Sheets remain live cloud assets; this folder contains links, not
offline spreadsheet copies. No Sheet was edited while packaging these tracks.

## Preview either standalone track

Use a local HTTP server because the pages load JavaScript modules; opening the
HTML directly with `file://` can prevent those modules from loading.

From this folder:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Then open:

- [Press](http://localhost:8766/press/nemotron-post-training-press-r07.html)
- [Developer](http://localhost:8766/developer/nemotron-post-training-developer.html)

To view a server running on the workstation from a laptop, forward its port:

```sh
ssh -N -L 8766:127.0.0.1:8766 aquraini@tme-workstation
```

The tracks carry their own assets and recorded evidence. External NVIDIA,
Hugging Face, GitHub, documentation and Google Sheet links still need network
access. The workflow animation illustrates training; the before/after examples
and benchmark panels use the recorded evidence and qualifications in each track.
The Press Results use step 75; Developer aggregate benchmarks retain selected
step 25. They are separate presentations, not identical checkpoint comparisons.

## Location and preservation

- Workstation repo folder: `/home/aquraini/gtc-post-training-demo-ui/healthcare-demo/`
- Local source package: `outputs/healthcare-demo-r03/` in the healthcare evaluation repo.
- Golden mirrored copy: `/home/aquraini/healthcare-agent-evals/outputs/healthcare-demo-r03/`
- Git branch: `healthcare-demo`, containing the r06/r07 reference tracks and the current split handoff.

Preserve this snapshot when refreshing the package: archive the current version
or add a versioned folder rather than overwriting earlier revisions.

## Asset pruning

Removed 74 unused files (14.38 MB): coffee-lab application experiments,
keep-my-place and whole-request prototypes, old narration and film imagery,
and superseded rendering modules. The original full package remains archived
outside the GTC repo in the healthcare evaluation workspace.

Older revision names that remain are active dependencies, not alternate demos.
For example, the latest gym opener imports `gym-opening-r02/scene.js`, which
uses Three.js from `coffee-lab-r01/vendor/`; current styles import earlier CSS
layers, and the current story uses r01 scoring helpers. Their original bytes
and license notices are preserved. The provenance manifest lists retained
checksums and every removed file.

## Animation update — Press r07

The latest Press entry point is `press/nemotron-post-training-press-r07.html`.
It adds connector-following trace motion, verifier/judge receipt effects, and
scored feedback returning to NeMo RL. The previous Press HTML and its assets
remain available at `press/nemotron-post-training-press.html`. Developer is unchanged.
