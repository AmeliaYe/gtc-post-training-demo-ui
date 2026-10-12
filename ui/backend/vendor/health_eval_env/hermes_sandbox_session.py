from __future__ import annotations

import json
import os
import tempfile
from copy import deepcopy
from dataclasses import asdict
from pathlib import Path
from uuid import uuid4

from health_eval_env.sandbox import HealthSandbox
from health_eval_env.case_boundaries import require_unchanged_profile
from health_eval_env.schemas import JsonDict, ToolCall


DEFAULT_SESSION_DIR = "/tmp/healthcare_agent_evals/hermes_sandbox_sessions"


def session_dir() -> Path:
    path = Path(os.getenv("HEALTH_SANDBOX_SESSION_DIR", DEFAULT_SESSION_DIR))
    path.mkdir(parents=True, exist_ok=True)
    return path


def new_session_id(case_id: str) -> str:
    return f"{case_id}_{uuid4().hex}"


def _session_path(session_id: str) -> Path:
    safe = "".join(ch if ch.isalnum() or ch in {"_", "-"} else "_" for ch in session_id)
    return session_dir() / f"{safe}.json"


def _sandbox_from_state(state: JsonDict) -> HealthSandbox:
    return HealthSandbox(
        patient_profile=state["patient_profile"],
        appointments=state.get("appointments", []),
        telehealth_queue=state.get("telehealth_queue", []),
        pcp_messages=state.get("pcp_messages", []),
        profile_change_log=state.get("profile_change_log", []),
        prescription_requests=state.get("prescription_requests", []),
    )


def _sandbox_state(sandbox: HealthSandbox) -> JsonDict:
    return asdict(sandbox)


def seed_session(session_id: str, case: JsonDict) -> JsonDict:
    starting_profile = deepcopy(case["patient_profile"])
    sandbox = HealthSandbox.from_case(case)
    require_unchanged_profile(starting_profile, case["patient_profile"])
    require_unchanged_profile(starting_profile, sandbox.patient_profile)
    data: JsonDict = {
        "session_id": session_id,
        "case_id": case["id"],
        "current_datetime": case.get("current_datetime"),
        "sandbox": _sandbox_state(sandbox),
        "tool_events": [],
    }
    write_session(session_id, data)
    return data


def read_session(session_id: str) -> JsonDict:
    path = _session_path(session_id)
    if not path.exists():
        raise FileNotFoundError(f"Health sandbox session not found: {session_id}")
    return json.loads(path.read_text())


def write_session(session_id: str, data: JsonDict) -> None:
    path = _session_path(session_id)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=str(path.parent)) as tmp:
        json.dump(data, tmp, indent=2, sort_keys=True)
        tmp.write("\n")
        tmp_path = Path(tmp.name)
    tmp_path.replace(path)


def execute_tool(session_id: str, tool_name: str, arguments: JsonDict) -> JsonDict:
    data = read_session(session_id)
    sandbox = _sandbox_from_state(data["sandbox"])
    result = sandbox.execute(ToolCall(name=tool_name, arguments=arguments))
    event = {
        "tool_call": {"name": tool_name, "arguments": arguments},
        "result": result,
    }
    data["sandbox"] = _sandbox_state(sandbox)
    data.setdefault("tool_events", []).append(event)
    write_session(session_id, data)
    return result


def session_summary(session_id: str) -> JsonDict:
    data = read_session(session_id)
    return _sandbox_from_state(data["sandbox"]).summary()


def session_tool_events(session_id: str, start_index: int = 0) -> list[JsonDict]:
    return list(read_session(session_id).get("tool_events", []))[start_index:]
