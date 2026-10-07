"""Deterministic guards between hidden case data and assistant-visible state."""


def require_unchanged_profile(expected: dict, actual: dict) -> None:
    if actual != expected:
        raise ValueError("Case boundary: starting patient profile changed before tool execution")


def _fields(value, allowed, path):
    if not isinstance(value, dict):
        raise ValueError(f"Case boundary: {path} must be an object")
    if value.keys() - allowed:
        raise ValueError(f"Case boundary: unexpected fields in {path}")


def _scalar_records(records, allowed, path):
    if not isinstance(records, list):
        raise ValueError(f"Case boundary: {path} must be a list")
    for record in records:
        _fields(record, allowed, path)
        if any(value is not None and not isinstance(value, (str, int, float, bool))
               for value in record.values()):
            raise ValueError(f"Case boundary: nested data in {path}")


def require_operational_context(context: dict) -> None:
    """Reject new prompt-bearing fields, rather than silently stripping evidence.

    This validates the runtime channel, not patient utterances or tool results.
    Text values are not scanned for desired outcomes: patients may disclose them.
    """
    _fields(context, {"current_datetime", "turn_index", "sandbox_summary"}, "policy_context")
    if "current_datetime" in context and not isinstance(context["current_datetime"], str):
        raise ValueError("Case boundary: current_datetime must be a string")
    if "turn_index" in context and (type(context["turn_index"]) is not int or context["turn_index"] < 0):
        raise ValueError("Case boundary: turn_index must be a nonnegative integer")
    if "sandbox_summary" not in context:
        return
    summary = context["sandbox_summary"]
    counts = {"telehealth_queue_count", "pcp_message_count", "prescription_request_count"}
    appointments = {"available_appointments", "scheduled_appointments"}
    _fields(summary, counts | appointments | {"medications"}, "sandbox_summary")
    for key in counts & summary.keys():
        if type(summary[key]) is not int or summary[key] < 0:
            raise ValueError(f"Case boundary: {key} must be a nonnegative integer")
    for key in appointments & summary.keys():
        _scalar_records(summary[key], {
            "appointment_id", "provider", "type", "starts_at", "available", "status",
            "reason", "cancellation_reason",
        }, key)
    if "medications" in summary:
        _scalar_records(summary["medications"], {
            "name", "dose", "frequency", "refills_remaining",
        }, "medications")
