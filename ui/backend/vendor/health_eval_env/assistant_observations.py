"""Instance-local capture of model-visible histories, independent of compaction."""
from copy import deepcopy


def reasoning_only_stop(message):
    from health_eval_env.patient_visible_reply import patient_visible_reply

    if message.get("role") != "assistant" or message.get("finish_reason") != "stop" or message.get("tool_calls"):
        return False
    content = message.get("content") or ""
    if not isinstance(content, str):
        return False
    try:
        visible = patient_visible_reply(content)
    except ValueError:
        return False
    return not visible and bool(message.get("reasoning") or message.get("reasoning_content") or content.strip())


def install_observation_capture(agent, *, model_ref=None):
    records = []
    gaps = []
    original_request = agent._build_api_kwargs
    original_message = agent._build_assistant_message
    pending = None
    pending_response = None

    def request(messages):
        nonlocal pending, pending_response
        result = original_request(messages)
        if pending is not None:
            # Hermes retries reasoning-only stops before its message-builder hook.
            # Preserve the actual response, but never splice it into the live history.
            choices = getattr(pending_response, "choices", None) or []
            captured = None
            if len(choices) == 1 and hasattr(pending_response, "model_dump"):
                pending["api_response"] = deepcopy(pending_response.model_dump(mode="json"))
                captured = original_message(deepcopy(choices[0].message), choices[0].finish_reason)
            if (captured is not None and reasoning_only_stop(captured)
                    and pending["conversation"] == result.get("messages")):
                pending["conversation"].append(deepcopy(captured))
                pending["disposition"] = "hermes_reasoning_only_retry"
            else:
                gaps.append("superseded_request_without_captured_response")
        pending = None
        pending_response = None
        if "messages" not in result:
            gaps.append("unsupported_request_dialect")
        else:
            pending = {"invocation_id": f"request-{len(records)}", "conversation": deepcopy(result["messages"])}
            records.append(pending)
        return result

    def message(*args, **kwargs):
        nonlocal pending, pending_response
        result = original_message(*args, **kwargs)
        if pending is None:
            gaps.append("assistant_message_without_captured_request")
        else:
            pending["conversation"].append(deepcopy(result))
            pending = None
            pending_response = None
        return result

    agent._build_api_kwargs = request
    agent._build_assistant_message = message

    if model_ref is not None:
        original_call = agent._interruptible_api_call

        def call(api_kwargs):
            nonlocal pending_response
            response = original_call(api_kwargs)
            pending_response = deepcopy(response)
            ident = getattr(response, "id", None)
            # Preserve the terminal retry even when Hermes exits before another request.
            if pending is not None and hasattr(response, "model_dump"):
                pending["api_response"] = deepcopy(response.model_dump(mode="json"))
            if pending is not None and ident:
                pending.setdefault("model_calls", []).append(
                    {"model_ref": deepcopy(model_ref), "response_id": ident}
                )
            return response

        agent._interruptible_api_call = call

    def snapshot():
        if not records:
            gaps.append("no_model_requests_captured")
        if pending is not None:
            gaps.append("request_without_captured_response")
        return deepcopy({"records": records, "gaps": gaps})

    return snapshot


def raw_agent_observations(row):
    """Never substitute a normalized diagnostic view for full jury evidence."""
    if "pab_agent_observations" in row:
        raw = row["pab_agent_observations"]
        if not isinstance(raw, dict):
            raise ValueError("Malformed raw PAB observations")
        return raw
    legacy = row.get("ng_agent_observations") or {}
    if any("kind" in record for record in legacy.get("records", [])):
        raise ValueError("Typed Gym observations cannot replace missing raw PAB evidence")
    return legacy


def gym_observation_fields(raw):
    """Project diagnostics only; retain the complete independent raw bundle."""
    from nemo_gym.responses_converter import ResponsesConverter
    from nemo_gym.rollout_observability import AgentObservationBundle

    converter = ResponsesConverter(return_token_id_information=False, uses_reasoning_parser=False)
    records, gaps = [], []
    for gap in raw.get("gaps", []):
        gaps.append(deepcopy(gap) if isinstance(gap, dict) else {"code": str(gap)})
    for record in raw.get("records", []):
        ident = record["invocation_id"]
        items = []
        try:
            for index, message in enumerate(deepcopy(record["conversation"])):
                reasoning = message.get("reasoning") or message.get("reasoning_content")
                if isinstance(reasoning, str) and reasoning:
                    items.append({"type": "reasoning", "id": f"{ident}/reasoning-{index}",
                                  "summary": [{"type": "summary_text", "text": reasoning}]})
                items.extend(item.model_dump(mode="json") for item in
                             converter.chat_completions_messages_to_responses_items([message]))
            projected = {"kind": "agent_invocation", "invocation_id": ident,
                         "conversation": items, "model_calls": deepcopy(record.get("model_calls", []))}
            AgentObservationBundle.model_validate({"source": "hermes", "records": [projected]})
        except Exception as exc:
            gaps.append({"code": "pab_observation_projection_failed", "invocation_id": ident,
                         "detail": type(exc).__name__})
            projected = {"kind": "agent_invocation", "invocation_id": ident}
        if not projected.get("model_calls"):
            gaps.append({"code": "pab_model_call_identity_unavailable", "invocation_id": ident})
        records.append(projected)
    bundle = AgentObservationBundle.model_validate(
        {"source": raw.get("source", "hermes"), "records": records, "gaps": gaps})
    return {"pab_agent_observations": deepcopy(raw),
            "ng_agent_observations": bundle.model_dump(mode="json")}
