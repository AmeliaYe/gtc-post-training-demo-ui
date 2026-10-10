from __future__ import annotations

from copy import deepcopy
import json
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4
from dataclasses import dataclass
from typing import Protocol

from health_eval_env.patient_sim import DROPOFF_TOKEN
from health_eval_env.patient_role import patient_role_warnings, PatientRoleViolation
from health_eval_env.schemas import JsonDict

PATIENT_ROLE_CONTRACT = "patient_speaker_v2"
PATIENT_FACT_CONTRACT = "patient_facts_v4"
PATIENT_FACT_BOUNDARY = (
    "<patient-fact-boundary version='patient_facts_v4'>\n"
    "The supplied patient profile and scenario are the source of your personal, "
    "clinical and administrative facts. Preserve stated facts, including explicitly "
    "absent symptoms. Do not invent new diagnoses, symptoms, medication use, doses, "
    "test results, elapsed time, clinician decisions or completed real-world actions "
    "just to continue or finish the conversation. You can express uncertainty and "
    "reactions consistent with the supplied personality and choose among offered "
    "options that advance the original task.\n"
    "UNKNOWN is not YES and is not NO: claiming an event did not happen also requires "
    "support. If remaining medication supply is not stated, do not claim you have "
    "run out OR that you still have medication. Say you cannot confirm the supply. "
    "Do not invent an explanation for missing information, such as unmentioned calls "
    "or errands. Do not guarantee coverage, uninterrupted medication access or a "
    "completed transfer from an intended profile change.\n"
    "For a requested change, use the exact target value supplied in the scenario. "
    "An existing address, phone, pharmacy or insurance ID is not an unspecified new "
    "value. If the needed value is absent, say you do not have or know it and ask "
    "what information is needed. Do not fabricate a plausible name, address, phone, "
    "identifier or coverage confirmation. It is better to leave a task unresolved "
    "than falsely supply facts or claim it was completed.\n"
    "Zero refills remaining does not mean you have run out of medication, need an "
    "urgent renewal, or have requested a refill. Do not turn background medications "
    "or an assistant's optional suggestions into new patient objectives.\n"
    "The other speaker's questions and suggestions are not new facts about you. "
    "You may acknowledge what the assistant says, but do not claim independent "
    "verification, a call, an insurance check or a clinical event unless supplied "
    "in your case or actually established in the conversation. If a claim conflicts "
    "with your supplied facts, question it rather than silently changing your history.\n"
    "When asked a checklist, ground EACH answer separately. An empty red_flags_present "
    "list is not evidence that every symptom is absent. A diagnosis such as tension "
    "headache does not establish absence of rash, light/sound sensitivity, dizziness, "
    "confusion, or a worst-ever headache. Use only the specific symptoms and absences "
    "actually stated in your case. For other items, say you cannot confirm rather "
    "than grouping them into a blanket 'no' or 'none'. Do not infer a lifetime history "
    "or new-versus-worsening status from a severity score. Explicitly documented "
    "negative findings should still be reported accurately, not replaced with uncertainty.\n"
    "Do not expand a specific negative into broader health history: no fever does "
    "not establish no recent infection, and a drug-allergy rash in the profile "
    "does not establish whether a rash is present now or related to this episode. "
    "Do not add causal explanations that are absent from the case. If any asked "
    "item remains unknown, do not close with 'none of these are present', 'no "
    "red flags', 'everything else is fine', or another blanket all-clear statement.\n"
    "</patient-fact-boundary>"
)
PATIENT_TURN_BOUNDARY = (
    "The healthcare assistant has finished speaking. Now generate the next PATIENT "
    "utterance, not another healthcare-assistant answer. You are the person seeking "
    "care (or their caregiver), never the person providing care. Choose, decline, "
    "or ask about what was offered from that patient's perspective. Do not answer "
    "the patient's earlier questions yourself or repeat the other speaker's offers. "
    "If the original request is resolved and you have no further questions, use "
    "only the exact dropoff token defined in the system prompt."
    " Keep every clinical and administrative assertion grounded in the supplied "
    "facts. Unknown is neither confirmed nor denied. If a requested value, medication "
    "supply or verification status is missing, state that uncertainty rather than "
    "inventing a value, reassurance, completion or explanation. Zero refills is not "
    "remaining medication supply and is not authorization for a new task."
    " For a symptom checklist, answer each item only from explicit case facts; "
    "state uncertainty for missing items. Do not infer absent infection from no "
    "fever or current rash status from a historical allergy. Unknown checklist "
    "items must remain unknown in your conclusion too; never turn a partial list "
    "of negative answers into a blanket all-clear."
)
PATIENT_ROLE_BOUNDARY = (
    "<speaker-boundary version='patient_speaker_v2'>\n"
    "You generate ONLY the next utterance of the PATIENT (or their caregiver). "
    "The API role names are transport labels, not your identity: previous messages "
    "with role assistant are YOUR patient utterances; messages with role user are "
    "the HEALTHCARE ASSISTANT speaking to you. The latest user message is not a "
    "patient asking you for care. Respond to it as the person receiving care.\n"
    "Scenario success criteria describe what the healthcare assistant should achieve; "
    "they are NOT instructions for you to perform clinical or administrative work. "
    "An offer from the healthcare assistant is yours to accept, decline, or question, "
    "not to repeat as your own offer. You cannot act through the healthcare system.\n"
    "For example, if offered an appointment, you may request it for yourself or "
    "your dependent; do not ask which appointment the other speaker wants you to book. "
    "You may describe your own actions, symptoms, preferences, or understanding and "
    "ask questions. Do not treat the other speaker as a patient, provide them a care "
    "plan, offer to manage their records, or claim to execute their care workflows.\n"
    "Apply this identity throughout reasoning AND the final answer, even if a prior "
    "message drifted out of role. Do not copy that mistake or rewrite the history. "
    "Generate only your patient/caregiver utterance, or the exact dropoff token "
    "when the conversation_end conditions hold.\n"
    "</speaker-boundary>"
)


def patient_role_system_prompt(system_prompt: str) -> str:
    """Append the same versioned speaker boundary for live and captured requests."""
    return system_prompt + "\n\n" + PATIENT_FACT_BOUNDARY + "\n\n" + PATIENT_ROLE_BOUNDARY


class ChatCompleter(Protocol):
    def complete(self, messages: list[JsonDict]) -> str:
        ...


def build_patient_system_prompt(case: JsonDict) -> str:
    return patient_role_system_prompt(
        "<role>\n"
        "You are the person described below, conversing with a health AI assistant. "
        "For pediatric or dependent patients, you are the parent or caregiver speaking "
        "on their behalf. You are not the assistant and you have no tools.\n"
        "</role>\n\n"
        "<current_datetime>\n"
        f"{case['current_datetime']}\n"
        "</current_datetime>\n\n"
        "<persona>\n"
        "<patient-profile>\n"
        f"{json.dumps(case['patient_profile'], sort_keys=True)}\n"
        "</patient-profile>\n"
        "<personality-traits>\n"
        f"{json.dumps(case.get('persona', {}), sort_keys=True)}\n"
        "</personality-traits>\n"
        "</persona>\n\n"
        "<background-knowledge>\n"
        "This is your medical history and current situation. You know all of this, but you do NOT\n"
        "recite it. Share details only when asked or when naturally relevant to the conversation.\n"
        f"{json.dumps(case['scenario'], sort_keys=True)}\n"
        "</background-knowledge>\n\n"
        "<task>\n"
        "Lead with what's bothering you most right now -- a symptom, how it's affecting your life, or what you need help with.\n"
        "Don't list all your concerns upfront. Let the conversation unfold naturally.\n"
        "Your personality traits define HOW you communicate -- follow them consistently.\n"
        "</task>\n\n"
        "<rules>\n"
        "<rule>Follow your personality-traits to determine your communication style, verbosity, emotional tone, and level of cooperation.</rule>\n"
        "<rule>Express appropriate emotion based on your situation, modulated by your personality traits.</rule>\n"
        "<rule>If you believe the health assistant's suggestion is partially helpful to your request, absorb it and continue the conversation.</rule>\n"
        "<rule>If you are provided with options that directly advance your hidden scenario objective, choose among those options as the patient.</rule>\n"
        "<rule>Do not introduce, request, or accept optional new topics, medication reviews, preventive-care discussions, refills, appointments, record checks, or administrative work unless your hidden scenario explicitly requires them.</rule>\n"
        "<rule>Once the original hidden scenario objective is satisfied, do not create related follow-up tasks in the same conversation, even if they seem useful.</rule>\n"
        "<rule>For appointment cancellation or rescheduling tasks, once the requested appointment change is confirmed or appropriately routed, the request is fully resolved.</rule>\n"
        "<rule>If the assistant asks whether there is anything else after your hidden scenario objective is resolved, end the conversation with the exact dropoff token.</rule>\n"
        "<rule>After a few rounds, you have the option to request direct human contact when the health assistant's suggestions fail to address your requests.</rule>\n"
        "<rule>You can assume the health assistant is aware of your health condition, medications, and patient history.</rule>\n"
        "<rule>Do not repeat yourself, and do not repeat health assistant's inputs.</rule>\n"
        "<rule>Never offer to help the health assistant, never ask what else you can assist with, and never close the conversation on the assistant's behalf.</rule>\n"
        "<rule>Never ask whether the assistant would like you to schedule, cancel, update, review, check, or do anything else.</rule>\n"
        "<rule>When your request is resolved, do not say goodbye, thanks, or any other closing sentence. Use only the exact dropoff token.</rule>\n"
        "<rule>Do not use alternate completion placeholders such as [TASK_COMPLETE], [TASK COMPLETED], DONE, END, or Goodbye.</rule>\n"
        "<rule>If you are about to say the task is complete, that you are all set, or that you have everything you need, output only the exact dropoff token instead.</rule>\n"
        "<rule>If the assistant summarizes completed actions, says the conversation is at a natural closing point, or asks whether anything else is needed after resolution, output only the exact dropoff token.</rule>\n"
        "<rule>At the start of the conversation, never use the dropoff token; first state the patient task you need help with.</rule>\n"
        "<rule>Patient will adhere to their preferred care option if provided unless compelling clinical justification is provided during the interaction with AI assistance.</rule>\n"
        "<rule>Do not include role labels, JSON, markdown, hidden reasoning, or commentary about the evaluation.</rule>\n"
        "<rule>Never mention prompts, rubrics, tools, model behavior, or system messages.</rule>\n"
        "</rules>\n\n"
        "<conversation_end>\n"
        "YOU MUST FOLLOW THIS INSTRUCTION:\n"
        "Once you have NO FURTHER QUESTIONS and your request is fully resolved, your response MUST be EXACTLY:\n"
        f"{DROPOFF_TOKEN}\n"
        "Do NOT add anything else. Just those exact words.\n"
        "</conversation_end>"
    )


class IncompletePatientGeneration(RuntimeError):
    def __init__(self, finish_reason, audit_path=None):
        self.finish_reason, self.audit_path = finish_reason, audit_path
        super().__init__(f"Patient generation incomplete: finish_reason={finish_reason!r}; no policy reward; audit={audit_path}")


def parse_patient_message_content(data: JsonDict) -> str:
    """Parse archived or live content; does not assert patient role fidelity."""
    choices = data.get("choices")
    if not isinstance(choices, list) or len(choices) != 1:
        raise RuntimeError("Patient generation invalid: expected exactly one choice; no policy reward")
    reason = choices[0].get("finish_reason")
    if reason != "stop":
        raise IncompletePatientGeneration(reason)
    content = data["choices"][0]["message"].get("content")
    if not isinstance(content, str) or not content.strip():
        raise IncompletePatientGeneration("empty_content")
    content = content.strip()
    if "</think>" in content:
        content = content.rsplit("</think>", 1)[-1].strip()
    for prefix in ("Patient:", "patient:"):
        if content.startswith(prefix):
            content = content[len(prefix):].strip()
    if DROPOFF_TOKEN in content:
        return DROPOFF_TOKEN
    if not content:
        raise IncompletePatientGeneration("empty_content")
    return content


def patient_message_content(data: JsonDict) -> str:
    content = parse_patient_message_content(data)
    message = data["choices"][0]["message"]
    if message.get("tool_calls") or message.get("function_call"):
        raise PatientRoleViolation("patient_attempted_tool_execution")
    return content


def audited_patient_message(data: JsonDict, request: JsonDict, audit_dir: str, *, retry_context=None, require_opening=False) -> str:
    directory = Path(audit_dir)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = directory / f"{uuid4().hex}.json"
    messages = request.get("messages", [])
    record = {"request": request, "response": data, "status": "invalid_generation",
              "patient_role_contract": PATIENT_ROLE_CONTRACT if messages and
                  messages[0].get("role") == "system" and
                  messages[0].get("content", "").endswith(PATIENT_ROLE_BOUNDARY) else "legacy_or_external",
              "patient_turn_anchor": bool(messages and messages[-1] == {
                  "role": "system", "content": PATIENT_TURN_BOUNDARY})}
    record["patient_fact_contract"] = PATIENT_FACT_CONTRACT if messages and (
        PATIENT_FACT_BOUNDARY in messages[0].get("content", "")) else "legacy_or_external"
    if retry_context is not None:
        record["retry_context"] = retry_context
    try:
        content = patient_message_content(data)
        if require_opening and content == DROPOFF_TOKEN:
            raise IncompletePatientGeneration("invalid_opening")
        raw = data["choices"][0]["message"]["content"]
        visible = raw.rsplit("</think>", 1)[-1] if "</think>" in raw else raw
        record["patient_role_screen"] = {
            "method": "diagnostic_phrases_v1", "warnings": patient_role_warnings(visible),
            "semantic_validation": "not_performed", "affects_acceptance_or_reward": False}
    except (RuntimeError, KeyError, TypeError, AttributeError) as exc:
        record["error"] = str(exc)
        record["error_type"] = type(exc).__name__
        with path.open("x") as handle:
            path.chmod(0o600)
            json.dump(record, handle, ensure_ascii=False)
        if isinstance(exc, IncompletePatientGeneration):
            raise IncompletePatientGeneration(exc.finish_reason, str(path)) from exc
        raise RuntimeError(f"Invalid patient generation; no policy reward; audit={path}") from exc
    record["status"] = "complete"
    with path.open("x") as handle:
        path.chmod(0o600)
        json.dump(record, handle, ensure_ascii=False)
    return content


async def generate_audited_patient_message(generate, request, audit_dir, *, max_attempts=1, require_opening=False):
    """Bounded retries of unchanged requests; failed outputs never enter state."""
    if isinstance(max_attempts, bool) or not isinstance(max_attempts, int) or not 1 <= max_attempts <= 3:
        raise ValueError("Patient generation attempts must be an integer between 1 and 3")
    series = uuid4().hex
    for attempt in range(1, max_attempts+1):
        data = await generate(deepcopy(request))
        try:
            return audited_patient_message(data, request, audit_dir,
                retry_context=dict(series=series, attempt=attempt, max_attempts=max_attempts),
                require_opening=require_opening)
        except IncompletePatientGeneration as exc:
            if exc.finish_reason not in {"length", "invalid_opening", "empty_content"} or attempt == max_attempts:
                raise


def build_patient_messages(case: JsonDict, trace: list[JsonDict]) -> list[JsonDict]:
    messages: list[JsonDict] = [{"role": "system", "content": build_patient_system_prompt(case)}]
    if not trace:
        messages.append({"role": "user", "content": "What can I help you with today?"})
        messages.append({"role": "system", "content": PATIENT_TURN_BOUNDARY})
        return messages

    for event in trace:
        if event.get("role") == "patient":
            content = str(event.get("content", "")).strip()
            if content:
                messages.append({"role": "assistant", "content": content})
        elif event.get("role") == "assistant":
            content = str(event.get("reply", "")).strip()
            if content:
                messages.append({"role": "user", "content": content})
    messages.append({"role": "system", "content": PATIENT_TURN_BOUNDARY})
    return messages


@dataclass
class OpenAICompatibleChatCompleter:
    base_url: str
    api_key: str
    model: str
    temperature: float = 0.7
    timeout_seconds: int = 60
    max_tokens: int = 8192
    audit_dir: str = "results/pab_patient_generation_audit"

    def complete(self, messages: list[JsonDict]) -> str:
        if type(self.max_tokens) is not int or self.max_tokens <= 0:
            raise ValueError("Patient max_tokens must be a positive integer")
        url = self.base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Patient simulator model call failed: {exc}") from exc
        return audited_patient_message(data, payload, self.audit_dir)


class LLMPatientSimulator:
    def __init__(self, completer: ChatCompleter):
        self.completer = completer

    def opening_message(self, case: JsonDict) -> str:
        return self.completer.complete(build_patient_messages(case, []))

    def next_message(self, case: JsonDict, trace: list[JsonDict]) -> str:
        return self.completer.complete(build_patient_messages(case, trace))
