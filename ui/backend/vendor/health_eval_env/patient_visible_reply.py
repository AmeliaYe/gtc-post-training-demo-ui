"""Render the patient channel without changing the full training/judge record."""


def patient_visible_reply(text: str) -> str:
    visible = text.strip()
    while visible.startswith("<think>"):
        end = visible.find("</think>")
        if end < 0:
            raise ValueError("Unclosed assistant reasoning; no patient-visible reply")
        visible = visible[end + len("</think>"):].strip()
    if "<think>" in visible or "</think>" in visible:
        raise ValueError("Ambiguous assistant reasoning boundary; no patient-visible reply")
    return visible
