"""Validate native Hermes completion before converting it to a policy response."""
import json
from pathlib import Path
from uuid import uuid4


def track_iteration_exhaustion(agent):
    """Track the summary branch without patching the installed Hermes package."""
    context = {"max_iterations": agent.max_iterations, "summary_requested": False}
    original = agent._handle_max_iterations

    def summarize(*args, **kwargs):
        context["summary_requested"] = True
        return original(*args, **kwargs)

    agent._handle_max_iterations = summarize
    return context


def natural_completion_at_boundary(result, observations, context):
    if not context or context.get("summary_requested") is not False:
        return False
    limit = context.get("max_iterations")
    if not isinstance(limit, int) or limit <= 0 or result.get("api_calls") != limit:
        return False
    if result.get("completed") is not False or any(result.get(k) for k in ("partial", "failed", "error", "interrupted")):
        return False
    if not observations or observations.get("gaps"):
        return False
    records = observations.get("records") or []
    if len(records) != limit or not records[-1].get("conversation"):
        return False
    captured = records[-1]["conversation"][-1]
    messages = result.get("messages") or []
    last = messages[-1] if messages else {}
    final = result.get("final_response")
    if not isinstance(final, str) or not final.strip():
        return False
    for message in (captured, last):
        if message.get("role") != "assistant" or message.get("finish_reason") != "stop" or message.get("tool_calls"):
            return False
        if not isinstance(message.get("content"), str) or message["content"].strip() != final.strip():
            return False
    return True


def audit_assistant_completion(result, audit_dir, observations=None, completion_context=None):
    directory = Path(audit_dir)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = directory / f"{uuid4().hex}.json"
    complete = (
        result.get("completed") is True
        and not result.get("partial")
        and not result.get("failed")
        and not result.get("error")
        and not result.get("interrupted")
    )
    messages = result.get("messages") or []
    last = next((m for m in reversed(messages) if m.get("role") == "assistant"), {})
    complete = complete and last.get("finish_reason") == "stop"
    boundary = natural_completion_at_boundary(result, observations, completion_context)
    complete = complete or boundary
    if completion_context and completion_context.get("summary_requested"):
        complete = False
    receipt = {"version": 1, "complete": bool(complete), "audit_path": str(path),
               "completion_reason": "natural_at_iteration_boundary" if boundary else "native_complete" if complete else "incomplete"}
    with path.open("x") as handle:
        path.chmod(0o600)
        json.dump({"receipt": receipt, "native_result": result,
                   "observations": observations, "completion_context": completion_context}, handle, ensure_ascii=False)
    if not complete:
        raise RuntimeError(f"Incomplete assistant generation; no policy reward; audit={path}")
    return receipt


def validate_completion_receipt(response):
    receipt = response.get("_ng_agent_completion")
    if not isinstance(receipt, dict) or receipt.get("version") != 1 or receipt.get("complete") is not True:
        raise RuntimeError("Missing or invalid native assistant completion receipt; no policy reward")
    if response.get("status") in ("incomplete", "failed", "cancelled") or response.get("incomplete_details"):
        raise RuntimeError("Incomplete assistant response; no policy reward")
    for item in response.get("output", []):
        if item.get("status") in ("incomplete", "failed", "in_progress"):
            raise RuntimeError("Incomplete assistant output item; no policy reward")
