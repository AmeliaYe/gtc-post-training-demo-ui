# Demo team handoff — Introduction and Healthcare

Two independent HTML experiences, packaged October 6, 2026. Serve this directory
over HTTP; keep each HTML beside its `assets/` directory. JavaScript modules and
WebGL require a browser with those capabilities. The animation has no CDN dependency.

| Deliverable | Entry point | Content |
| --- | --- | --- |
| Introduction | `introduction/index.html` | Larger NeMo Gym robot scene from gym r06; 58-second practice circuit, three exercise stations, feedback, model updates and three final controlled reps. |
| Post-training for healthcare | `healthcare/index.html` | How It Learns → Before & After → Results → Getting Started. Opens on How It Learns. No Introduction page, robot runtime or gym backdrop. |

The Introduction's “See the NVIDIA workflow” link opens the adjacent Healthcare
experience. Each package can otherwise run independently. When moving Introduction
alone, update that link to the deployed Healthcare URL.

## Preview

```sh
python3 -m http.server 8775 --bind 127.0.0.1
```

- [Introduction](http://localhost:8775/introduction/index.html)
- [Post-training for healthcare](http://localhost:8775/healthcare/index.html)

## GTC integration

This directory is copied to `public/healthcare/r02/` in the GTC UI repository.
The Healthcare tile loads `/healthcare/r02/healthcare/index.html?embed=1#how-it-learns`.
`?embed=1` hides the duplicate brand masthead and enables the same-origin
`healthcare-demo:resize` message used by `HealthcareDemo.tsx`.

The Introduction at `/healthcare/r02/introduction/index.html` is the canonical
robot landing-page source for the GTC UI. The main shell loads it first with
`?embed=1`; while embedded, “See the NVIDIA workflow” advances to the shell's
general workflow page. When opened standalone, that link continues to the
adjacent Healthcare experience. Apply future robot-feedback updates here rather
than to the earlier `public/healthcare/r01/landing.html` implementation.

## Source and narrative

- Introduction source: `outputs/press-gym-journeys-r06/index.html`.
- Healthcare source: `outputs/press-narrative-r08/nemotron-post-training-press.html`.
- [Google Sheet: Press narrative](https://docs.google.com/spreadsheets/d/1pjaX6vpL347YV7OJYNWN2Y_mqANTSRL7Lvir0JCUrgk/edit#gid=1409351755).
  This remains the existing five-page talk track; its Introduction is now a
  separate deliverable. The workbook was not edited for this packaging change.
- The full historical Press and Developer tracks remain in the GTC repository's
  `healthcare-demo/press/` and `healthcare-demo/developer/` directories.

The Healthcare workflow uses r08's combined “LLM Judge / Verifier” visual. The
recorded conversations, step-75 Results, source evidence and resource links are
unchanged. This is an illustrative training animation with recorded evaluation
evidence, not a live model-training run.

`provenance.json` records every runtime file's SHA-256, size and original source
where copied unchanged. Only reachable runtime dependencies and required
licenses are included. Historical source revisions remain untouched.

The package has three files above 500 KB: the gym background (2.12 MB), Three.js
core (1.40 MB), and Three.js module (0.60 MB). They are active dependencies of
Introduction; Healthcare loads none of them. All other runtime files are below
500 KB. The full runtime package is approximately 4.75 MB before compression.

This split handoff is included in the GTC UI repository on the `healthcare-demo` branch.
