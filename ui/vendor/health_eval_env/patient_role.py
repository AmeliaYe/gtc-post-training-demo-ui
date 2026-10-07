"""Diagnostic patient-role tripwires, not a semantic role classifier.

These word patterns must not filter episodes or change policy rewards. They miss
real role reversals and can flag quoted or unusual but legitimate patient speech.
The full model response is always retained for contextual review.
"""
import re


class PatientRoleViolation(RuntimeError):
    def __init__(self, rule: str):
        self.rule = rule
        super().__init__(f"Patient role violation: {rule}; no policy reward")


_RULES = {
    "offers_other_speaker_workflow": re.compile(
        r"\bi(?: (?:can|could|will|would be happy to)|'ll)\s+(?:help\s+)?"
        r"(?:book|schedule|arrange|update|review|check)\b[^.!?\n]{0,160}"
        r"(?:\bfor you\b|\byour (?:appointment|record|profile|prescription|refill)\b)", re.I),
    "asks_other_speaker_to_choose_workflow": re.compile(
        r"\bwould you like me to (?:help you\b|(?:book|schedule)\b|"
        r"(?:submit|send)\b[^.!?\n]{0,160}\byour\b)", re.I),
    "offers_assistant_service": re.compile(
        r"\b(?:anything else (?:i can help (?:you )?with|related to your)|"
        r"i can (?:help you (?:look at|schedule|book)|update your (?:profile|record)))\b", re.I),
}


def patient_role_warnings(content: str) -> list[str]:
    # Normalization is for matching only; never return modified patient evidence.
    normalized = re.sub(r'"[^"\n]*"|\u201c[^\u201d\n]*\u201d', '', content)
    normalized = normalized.replace("\u2019", "'").replace("*", "")
    return [rule for rule, pattern in _RULES.items() if pattern.search(normalized)]


def validate_patient_role(content: str) -> None:
    """Diagnostic probe helper only; not an acceptance gate for live episodes."""
    warnings = patient_role_warnings(content)
    if warnings:
        raise PatientRoleViolation(warnings[0])
