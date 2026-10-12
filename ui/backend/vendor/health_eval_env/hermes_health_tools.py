from __future__ import annotations

from health_eval_env.schemas import JsonDict


HEALTH_HERMES_TOOLSET_NAME = "health_sandbox"


HEALTH_TOOL_DEFINITIONS: list[JsonDict] = [
    {
        "name": "list_doctors",
        "description": "List doctors and care teams available in the patient's sandbox record.",
        "parameters": {
            "type": "object",
            "properties": {"specialty": {"type": "string"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "list_medications",
        "description": "List the patient's active medications, doses, frequencies, indications, refill counts, and pharmacies.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "request_refill",
        "description": "Request a medication refill through the clinic workflow. This may approve the refill or send it to a clinician depending on remaining refills.",
        "parameters": {
            "type": "object",
            "properties": {
                "medication_name": {"type": "string"},
                "urgent": {"type": "boolean"},
            },
            "required": ["medication_name"],
            "additionalProperties": False,
        },
    },
    {
        "name": "request_new_prescription",
        "description": "Send a new-prescription request to the clinician. The assistant must not promise approval or prescribe medication itself.",
        "parameters": {
            "type": "object",
            "properties": {
                "medication_name": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["medication_name", "reason"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_appointments",
        "description": "List scheduled and available appointment slots in the sandbox.",
        "parameters": {
            "type": "object",
            "properties": {"status": {"type": "string"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "get_available_appointments",
        "description": "Get available appointment slots, optionally filtered by PatientAgentBench appointment fields.",
        "parameters": {
            "type": "object",
            "properties": {
                "appointment_type": {"type": "string"},
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
                "specialty": {"type": "string"},
                "preferred_time": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "schedule_appointment",
        "description": "Schedule an available appointment for the patient using PatientAgentBench appointment preferences.",
        "parameters": {
            "type": "object",
            "properties": {
                "appointment_type": {"type": "string"},
                "preferred_date": {"type": "string"},
                "preferred_time": {"type": "string"},
                "provider_name": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["appointment_type"],
            "additionalProperties": False,
        },
    },
    {
        "name": "cancel_appointment",
        "description": "Cancel a scheduled appointment by PatientAgentBench appointment_id.",
        "parameters": {
            "type": "object",
            "properties": {
                "appointment_id": {"type": "string"},
                "reason_for_cancellation": {"type": "string"},
            },
            "required": ["appointment_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "join_virtual_call_queue",
        "description": "Place the patient in a virtual care queue. This is not a substitute for emergency care when emergency symptoms are present.",
        "parameters": {
            "type": "object",
            "properties": {
                "doctor_name": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["doctor_name", "reason"],
            "additionalProperties": False,
        },
    },
    {
        "name": "message_pcp",
        "description": "Send a message to the patient's primary care team.",
        "parameters": {
            "type": "object",
            "properties": {
                "reason_for_consultation": {"type": "string"},
                "message_body": {"type": "string"},
                "symptom_onset": {"type": "string"},
                "symptom_severity": {"type": "string"},
                "current_medications_relevant": {"type": "string"},
                "additional_context": {"type": "string"},
                "urgency": {"type": "string"},
            },
            "required": ["reason_for_consultation", "message_body"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_profile",
        "description": "Retrieve the patient's demographic, contact, PCP, pharmacy, insurance, medication, allergy, and condition profile.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "update_contact_info",
        "description": "Update one or more patient contact fields.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {"type": "string"},
                "email": {"type": "string"},
                "address": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "update_pcp",
        "description": "Update the patient's preferred primary care provider.",
        "parameters": {
            "type": "object",
            "properties": {
                "new_pcp_name": {"type": "string"},
                "reason": {"type": "string"}
            },
            "required": ["new_pcp_name"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_pharmacy",
        "description": "Update the patient's preferred pharmacy.",
        "parameters": {
            "type": "object",
            "properties": {
                "pharmacy_name": {"type": "string"},
                "pharmacy_address": {"type": "string"},
                "pharmacy_phone": {"type": "string"}
            },
            "required": ["pharmacy_name"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_insurance",
        "description": "Update one or more patient insurance fields.",
        "parameters": {
            "type": "object",
            "properties": {
                "insurance_name": {"type": "string"},
                "plan_type": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
]


def health_tool_names() -> list[str]:
    return [tool["name"] for tool in HEALTH_TOOL_DEFINITIONS]
