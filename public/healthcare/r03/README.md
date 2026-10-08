# Demo team handoff: Introduction R09

The latest robot opening is [introduction/index.html](introduction/index.html).
Copy the **entire introduction/ directory**, including assets/, when incorporating
it into the landing page. It is a standalone HTML/WebGL experience with bundled
dependencies and licenses, with no CDN requirement.

## Preview and integration

From the repository root, run:

```sh
python3 -m http.server 3005 --bind 127.0.0.1 --directory public
```

Open [Introduction R09](http://localhost:3005/healthcare/r03/introduction/index.html).
The same path is served by the existing Next.js app. For the workstation checkout,
use [the team preview](http://tme-workstation.nvidia.com:3001/healthcare/r03/introduction/index.html).
Serve over HTTP; opening index.html directly with file:// prevents module loading.

The “See the NVIDIA workflow” link opens the current four-page Healthcare experience
at ../../r02/healthcare/index.html#how-it-learns. When copying Introduction elsewhere,
update that link to the deployed Healthcare URL. The animation itself is self-contained.
The Healthcare tile remains on r02; placing this opening on the landing page is the
Demo team's composition step.

## What's included

| Path | Purpose |
| --- | --- |
| introduction/index.html | Standalone entry point |
| introduction/assets/opening-r09.js | Playback, controls, feedback and scene orchestration |
| introduction/assets/circuit-r09/ | Approved robot renderer and smoothly sculpted abdominal contours |
| introduction/assets/circuit-r08/ | Active 73-second timeline and cumulative growth logic |
| introduction/assets/circuit-r06/equipment.js | Articulated exercise equipment |
| introduction/assets/gym-opening-r02/ | Original motion clips and gym/coaches backdrop |
| introduction/assets/coffee-lab-r01/vendor/ | Bundled Three.js runtime and license |
| introduction/assets/ | Shared framing, styles, NIM artwork and controls |
| booth-walkthrough.md | Presenter cues |
| provenance.json | Source revision, per-file SHA-256 and sizes |

The robot completes two controlled practice reps before each gain. Brief green
halos highlight stronger shoulders, arms and core; abdominal definition is blended
into the white torso. Gains happen around 17, 35 and 54 seconds, with three final
controlled reps and a hold completing the 73-second loop. Replay resets all gains;
See the change jumps to the final reps. Reduced-motion mode starts paused.

## Versioning and validation

This delivery folder is r03; its approved animation source is **gym R09**.
[The previous r02 Introduction](../r02/introduction/index.html) remains unchanged
for rollback. Historical Press/Developer tracks and the inference UI are unchanged.
Only reachable runtime dependencies and required licenses are packaged; older names
inside assets/ identify active dependencies, not unused experiments.

Source revision: outputs/press-gym-journeys-r09 in the healthcare evaluation workspace.
The source passed 159 browser checks across seven viewports. Packaging preserves
every runtime asset's bytes; the HTML only removes authoring links/footer, sets its
delivery title/revision and makes the Healthcare link portable. The delivered route
is checked separately before commit.

Three dependencies exceed 500 KB: the existing gym background (2.12 MB), Three.js
core (1.40 MB) and Three.js module (0.60 MB). They match already-tracked r02 assets;
this revision introduces no new large binary or library content.

[Press narrative on Google Sheets](https://docs.google.com/spreadsheets/d/1pjaX6vpL347YV7OJYNWN2Y_mqANTSRL7Lvir0JCUrgk/edit#gid=1409351755)
remains the existing cloud talk track. The visual is a scripted capability metaphor,
not live model training or a change to model size.
