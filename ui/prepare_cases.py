"""Build a local demo bundle from explicitly matched held-out evaluation artifacts."""
import argparse
import hashlib
import json
from pathlib import Path

SELECTION = [
    ("adult-test-0005", "Refill a prescription", "pill"),
    ("adult-test-0013", "Book an appointment", "calendar-plus"),
    ("adult-test-0017", "Move an appointment", "calendar-clock"),
    ("adult-test-0020", "Change my pharmacy", "store"),
    ("adult-test-0007", "Change my doctor", "user-round"),
    ("adult-test-0015", "Medication side effects", "heart-pulse"),
]


def read_rows(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def load_run(directory):
    directory = Path(directory)
    inputs = {(r["_ng_task_index"], r["_ng_rollout_index"]): r
              for r in read_rows(directory / "output_materialized_inputs.jsonl")}
    results = {}
    for r in read_rows(directory / "output.jsonl"):
        source = inputs[(r["_ng_task_index"], r["_ng_rollout_index"])]
        ident = source["case"]["id"]
        if ident in results:
            raise ValueError("Duplicate case in recorded run: " + ident)
        results[ident] = (source, r)
    return results


def build(cases, baseline, checkpoint):
    sealed = {r["case"]["id"]: r for r in read_rows(cases)}
    runs = {"baseline": load_run(baseline), "checkpoint": load_run(checkpoint)}
    items = []
    for ident, label, icon in SELECTION:
        source = sealed[ident]
        recordings = {}
        for side, run in runs.items():
            original, output = run[ident]
            if original["case"] != source["case"]:
                raise ValueError("Recorded case differs from sealed source: " + ident)
            recordings[side] = {"trace": output["health_trace"], "model": (
                "Nemotron 3.5 Lightning · Hosted baseline" if side == "baseline"
                else "GRPO step 25 · Local BF16")}
        items.append(dict(id=ident, label=label, icon=icon,
                          category=source["task_category"], task=source["task_subcategory"],
                          opening=recordings["baseline"]["trace"][0]["content"],
                          case=source["case"],
                          system_prompt="\n\n".join(m["content"] for m in source["responses_create_params"]["input"]
                                                     if m["role"] == "system"),
                          recorded=recordings))
    paths = [Path(cases)] + [Path(d) / name for d in (baseline, checkpoint)
                            for name in ("output.jsonl", "output_materialized_inputs.jsonl")]
    return dict(schema="healthcare-demo-v1", cohort_size=len(sealed), cases=items,
                source_hashes={str(p.resolve()): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
                note="Held-out diagnostic reuse for demonstration; not a new benchmark or training input.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", required=True, type=Path)
    parser.add_argument("--baseline-run", required=True, type=Path)
    parser.add_argument("--checkpoint-run", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / ".local/cases.json")
    args = parser.parse_args()
    result = build(args.cases, args.baseline_run, args.checkpoint_run)
    args.output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with args.output.open("x") as stream:
        args.output.chmod(0o600)
        json.dump(result, stream, ensure_ascii=False)
    print(f"Prepared {len(result['cases'])} cases in {args.output}")


if __name__ == "__main__":
    main()
