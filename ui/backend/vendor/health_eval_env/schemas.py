from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


JsonDict = dict[str, Any]


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: JsonDict = field(default_factory=dict)


@dataclass(frozen=True)
class AssistantAction:
    reply: str
    tool_calls: list[ToolCall] = field(default_factory=list)


@dataclass
class EnvObservation:
    case_id: str
    current_datetime: str
    patient_message: str
    patient_profile: JsonDict
    sandbox_summary: JsonDict
    turn_index: int


@dataclass
class StepResult:
    observation: EnvObservation | None
    reward: float
    done: bool
    info: JsonDict
