from __future__ import annotations

import json
from typing import Any

from health_eval_env.hermes_health_tools import HEALTH_HERMES_TOOLSET_NAME, HEALTH_TOOL_DEFINITIONS
from health_eval_env.hermes_sandbox_session import execute_tool, session_summary


def _schema_for(tool: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": tool["name"],
        "description": tool["description"],
        "parameters": tool["parameters"],
    }


def _handler_for(tool_name: str):
    def handler(args: dict[str, Any], task_id: str | None = None, **_: Any) -> str:
        session_id = task_id or args.pop("health_sandbox_session_id", None)
        if not session_id:
            return json.dumps({"ok": False, "error": "Missing health sandbox session id."})
        result = execute_tool(session_id, tool_name, args)
        if result.get("ok"):
            result = dict(result)
            result["sandbox_summary"] = session_summary(session_id)
        return json.dumps(result)

    return handler


def register(ctx) -> None:
    for tool in HEALTH_TOOL_DEFINITIONS:
        ctx.register_tool(
            name=tool["name"],
            toolset=HEALTH_HERMES_TOOLSET_NAME,
            schema=_schema_for(tool),
            handler=_handler_for(tool["name"]),
            description=tool["description"],
        )
