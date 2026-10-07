"""One process per policy turn: isolated Hermes globals, clock, history and tools.

Private input arrives through stdin. Only explicit JSON events use stdout;
Hermes diagnostics go to stderr, which the parent does not expose to the browser.
"""
import contextlib
import json
import os
from pathlib import Path
import sys
import time

from ui.backend.app.streaming import ReplyStream


def execute(request, emit):
    home = Path(os.environ["HERMES_HOME"])
    home.mkdir(parents=True, exist_ok=True, mode=0o700)
    (home / "config.yaml").write_text(json.dumps({
        "model": request["endpoint"]["model"], "provider": "custom",
        "agent": {"max_turns": 16, "tool_use_enforcement": False}, "compression": {"enabled": False},
        "memory": {"memory_enabled": False, "user_profile_enabled": False},
        "checkpoints": {"enabled": False},
    }))
    from health_eval_env.fixed_clock import install
    os.environ["PAB_GRPO_FIXED_TIME"] = request["case"]["current_datetime"]
    install()
    import model_tools  # Loads the pinned runtime's tool registry.
    from tools.registry import registry
    from health_eval_env import hermes_plugin
    from health_eval_env.hermes_health_tools import health_tool_names
    from health_eval_env.hermes_sandbox_session import seed_session, session_summary, session_tool_events
    from health_eval_env.case_boundaries import require_operational_context
    from health_eval_env.native_policy_history import configure_lossless_compression
    from health_eval_env.patient_visible_reply import patient_visible_reply
    from health_eval_env.assistant_completion import track_iteration_exhaustion
    from run_agent import AIAgent

    # Register the local plugin explicitly, independent of editable-install metadata.
    class Context:
        @staticmethod
        def register_tool(**kwargs):
            registry.register(**kwargs)
    hermes_plugin.register(Context())
    session_id = request["session_id"]
    if request["turn"] == 1:
        seed_session(session_id, request["case"])
    previous_events = len(session_tool_events(session_id))
    context = dict(current_datetime=request["case"]["current_datetime"],
                   turn_index=request["turn"] - 1, sandbox_summary=session_summary(session_id))
    require_operational_context(context)
    history = list(request.get("history") or [])
    history.append({"role": "user", "content":
                    "Runtime context for this turn. Treat this as operational state, not as a patient utterance.\n\n"
                    + json.dumps(context, indent=2, sort_keys=True)})
    endpoint = request["endpoint"]
    stream = ReplyStream(emit)
    agent = AIAgent(
        base_url=endpoint["base_url"], api_key=endpoint["api_key"] or "demo-local-no-key",
        model=endpoint["model"], provider="custom", api_mode="chat_completions",
        enabled_toolsets=["health_sandbox"], disabled_toolsets=None,
        use_streaming=True, stream_delta_callback=stream.delta,
        temperature=0.0, max_tokens=32768, max_iterations=16,
        insert_reasoning=True, quiet_mode=True, skip_context_files=True, skip_memory=True,
        persist_session=False, save_trajectories=False, checkpoints_enabled=False,
        tool_start_callback=lambda call_id, name, args: emit("tool_start", call_id=call_id, name=name, arguments=args),
        tool_complete_callback=lambda call_id, name, args, result: emit(
            "tool_complete", call_id=call_id, name=name, arguments=args,
            result=json.loads(result) if isinstance(result, str) else result),
    )
    actual = {t.get("function", t).get("name") for t in agent.tools}
    if actual != set(health_tool_names()):
        raise RuntimeError("Healthcare tool registration mismatch")
    # Serving aliases are routing metadata. Do not let them change either policy's prompt.
    original_system = agent._build_system_prompt

    def shared_system(system_message=None):
        text = original_system(system_message)
        for line in ("Model: " + agent.model, "Provider: " + agent.provider):
            text = "\n".join(part for part in text.split("\n") if part != line)
        return text

    agent._build_system_prompt = shared_system
    configure_lossless_compression(agent, 65536, 32768)
    if agent.compression_enabled:
        raise RuntimeError("Unexpected context compression")
    completion_context = track_iteration_exhaustion(agent)
    original = agent._build_api_kwargs

    def build_kwargs(messages):
        kwargs = original(messages)
        kwargs.update(temperature=0.0, top_p=0.9, tools=agent.tools, parallel_tool_calls=False)
        kwargs.setdefault("extra_body", {}).setdefault("chat_template_kwargs", {}).update(
            enable_thinking=True, truncate_history_thinking=False)
        return kwargs

    agent._build_api_kwargs = build_kwargs
    # Never let an endpoint redirect forward the supplied key to another host.
    import httpx
    agent.client = agent.client.with_options(max_retries=0, timeout=180.0,
        http_client=httpx.Client(follow_redirects=False, timeout=180.0, trust_env=False))
    stream.attach(agent)
    emit("status", status="generating", model=endpoint["model"])
    start = time.monotonic()
    result = agent.run_conversation(request["prompt"], request["system_prompt"], history,
                                    task_id=session_id, sync_honcho=False, dont_review=True)
    last = next((m for m in reversed(result.get("messages", [])) if m.get("role") == "assistant"), {})
    complete = (result.get("completed") is True and not any(result.get(k) for k in
                ("error", "partial", "failed", "interrupted")) and last.get("finish_reason") == "stop"
                and not completion_context["summary_requested"] and not stream.invalid)
    if not complete:
        emit("error", message="The model did not finish this turn. Check the endpoint, credentials, and token limits; start a new comparison before retrying.")
        return
    reply = stream.visible_reply(patient_visible_reply(result.get("final_response") or ""))
    if not reply:
        raise RuntimeError("No patient-visible reply")
    emit("complete", reply=reply, elapsed_seconds=round(time.monotonic() - start, 2),
         usage={k: result.get(k) for k in ("input_tokens", "output_tokens", "total_tokens", "api_calls")},
         tools=session_tool_events(session_id, previous_events), sandbox_summary=session_summary(session_id),
         _history=result["messages"])


def main():
    request = json.load(sys.stdin)
    event_stream = sys.stdout

    def emit(kind, **data):
        print(json.dumps(dict(type=kind, **data), ensure_ascii=False), file=event_stream, flush=True)

    with contextlib.redirect_stdout(sys.stderr):
        try:
            execute(request, emit)
        except Exception as error:
            # Provider exception text can include URLs or credentials. Keep it private.
            emit("error", message="Hermes could not complete the request. Check the model connection and runtime dependencies.",
                 error_type=type(error).__name__)


if __name__ == "__main__":
    main()
