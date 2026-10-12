from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any

from health_eval_env.schemas import JsonDict, ToolCall


EXISTING_APPOINTMENT_TASKS = {"cancel", "reschedule"}


@dataclass
class HealthSandbox:
    patient_profile: JsonDict
    appointments: list[JsonDict] = field(default_factory=list)
    telehealth_queue: list[JsonDict] = field(default_factory=list)
    pcp_messages: list[JsonDict] = field(default_factory=list)
    profile_change_log: list[JsonDict] = field(default_factory=list)
    prescription_requests: list[JsonDict] = field(default_factory=list)

    @classmethod
    def from_case(cls, case: JsonDict) -> "HealthSandbox":
        profile = deepcopy(case["patient_profile"])
        return cls(patient_profile=profile, appointments=build_case_appointments(case))

    def summary(self) -> JsonDict:
        medications = self.patient_profile.get("medications", [])
        return {
            "available_appointments": [appt for appt in self.appointments if appt["available"]],
            "medications": [
                {
                    "name": med["name"],
                    "dose": med.get("dose"),
                    "frequency": med.get("frequency"),
                    "refills_remaining": med.get("refills_remaining"),
                }
                for med in medications
            ],
            "telehealth_queue_count": len(self.telehealth_queue),
            "pcp_message_count": len(self.pcp_messages),
            "scheduled_appointments": [
                appt for appt in self.appointments if not appt["available"]
            ],
            "prescription_request_count": len(self.prescription_requests),
        }

    def execute(self, call: ToolCall) -> JsonDict:
        handlers = {
            "list_doctors": self._list_doctors,
            "list_medications": self._list_medications,
            "request_refill": self._request_refill,
            "request_new_prescription": self._request_new_prescription,
            "list_appointments": self._list_appointments,
            "get_available_appointments": self._get_available_appointments,
            "schedule_appointment": self._schedule_appointment,
            "cancel_appointment": self._cancel_appointment,
            "join_virtual_call_queue": self._join_virtual_call_queue,
            "message_pcp": self._message_pcp,
            "get_profile": self._get_profile,
            "update_contact_info": self._update_contact_info,
            "update_pcp": self._update_pcp,
            "update_pharmacy": self._update_pharmacy,
            "update_insurance": self._update_insurance,
        }
        handler = handlers.get(call.name)
        if handler is None:
            return {"ok": False, "error": f"Unknown tool: {call.name}"}
        try:
            return handler(**call.arguments)
        except TypeError as exc:
            return {"ok": False, "error": f"Invalid arguments for {call.name}: {exc}"}

    def _list_doctors(self, specialty: str | None = None) -> JsonDict:
        pcp = self.patient_profile.get("preferred_pcp", "Primary Care")
        doctors = [
            {"provider_id": "pcp_preferred", "name": pcp, "specialty": "primary care"},
            {"provider_id": "cardiology_clinic", "name": "Cardiology Clinic", "specialty": "cardiology"},
        ]
        if specialty:
            doctors = [doctor for doctor in doctors if specialty.lower() in str(doctor.get("specialty", "")).lower()]
        return {"ok": True, "doctors": doctors}

    def _list_medications(self) -> JsonDict:
        return {"ok": True, "medications": deepcopy(self.patient_profile.get("medications", []))}

    def _request_refill(self, medication_name: str, urgent: bool = False) -> JsonDict:
        for medication in self.patient_profile.get("medications", []):
            if medication["name"].lower() == medication_name.lower():
                request = {
                    "medication_name": medication["name"],
                    "urgent": urgent,
                    "status": "sent_to_clinician" if medication.get("refills_remaining", 0) <= 0 else "approved",
                }
                medication["prescription_renewal_request"] = request
                return {"ok": True, "prescription_renewal_request": request}
        return {"ok": False, "error": f"Medication not found: {medication_name}"}

    def _request_new_prescription(self, medication_name: str, reason: str) -> JsonDict:
        request = {
            "request_id": f"rx_new_{len(self.prescription_requests) + 1}",
            "medication_name": medication_name,
            "reason": reason,
            "status": "sent_to_clinician",
        }
        self.prescription_requests.append(request)
        return {"ok": True, "prescription_request": deepcopy(request)}

    def _list_appointments(self, status: str | None = None) -> JsonDict:
        appointments = self.appointments
        if status:
            if status.lower() in {"scheduled", "booked"}:
                appointments = [appointment for appointment in appointments if not appointment["available"]]
            elif status.lower() in {"available", "open"}:
                appointments = [appointment for appointment in appointments if appointment["available"]]
        return {"ok": True, "appointments": deepcopy(appointments)}

    def _get_available_appointments(
        self,
        appointment_type: str,
        start_date: str | None = None,
        end_date: str | None = None,
        specialty: str | None = None,
        preferred_time: str | None = None,
    ) -> JsonDict:
        slots = [appt for appt in self.appointments if appt["available"]]
        if appointment_type:
            slots = [appt for appt in slots if appointment_type.lower() in appt["type"].lower()]
        if specialty:
            slots = [
                appt
                for appt in slots
                if specialty.lower() in f"{appt.get('type', '')} {appt.get('provider', '')}".lower()
            ]
        if preferred_time:
            slots = [appt for appt in slots if _matches_preferred_time(appt, preferred_time)]
        if start_date:
            slots = [appt for appt in slots if appt["starts_at"][:10] >= start_date]
        if end_date:
            slots = [appt for appt in slots if appt["starts_at"][:10] <= end_date]
        return {"ok": True, "appointments": deepcopy(slots)}

    def _schedule_appointment(
        self,
        appointment_type: str,
        reason: str | None = None,
        preferred_date: str | None = None,
        preferred_time: str | None = None,
        provider_name: str | None = None,
    ) -> JsonDict:
        candidates = self._get_available_appointments(
            appointment_type=appointment_type,
            start_date=preferred_date,
            end_date=preferred_date,
            preferred_time=preferred_time,
        )["appointments"]
        if provider_name:
            candidates = [
                appt for appt in candidates if provider_name.lower() in str(appt.get("provider", "")).lower()
            ]
        if not candidates:
            return {"ok": False, "error": "No matching appointment slot is available."}
        appointment_id = str(candidates[0]["appointment_id"])
        for appointment in self.appointments:
            if appointment["appointment_id"] == appointment_id and appointment["available"]:
                appointment["available"] = False
                appointment["reason"] = reason or "patient_requested"
                return {"ok": True, "appointment": deepcopy(appointment)}
        return {"ok": False, "error": f"Appointment unavailable: {appointment_id}"}

    def _cancel_appointment(
        self,
        appointment_id: str,
        reason_for_cancellation: str | None = None,
    ) -> JsonDict:
        for appointment in self.appointments:
            if appointment["appointment_id"] == appointment_id and not appointment["available"]:
                appointment["available"] = True
                appointment["cancellation_reason"] = reason_for_cancellation or "patient_requested"
                return {"ok": True, "appointment": deepcopy(appointment)}
        return {"ok": False, "error": f"Scheduled appointment not found: {appointment_id}"}

    def _join_virtual_call_queue(self, doctor_name: str, reason: str) -> JsonDict:
        entry = {
            "queue_id": f"tele_{len(self.telehealth_queue) + 1}",
            "doctor_name": doctor_name,
            "reason": reason,
            "status": "queued",
        }
        self.telehealth_queue.append(entry)
        return {"ok": True, "queue_entry": deepcopy(entry)}

    def _message_pcp(
        self,
        reason_for_consultation: str,
        message_body: str,
        symptom_onset: str | None = None,
        symptom_severity: str | None = None,
        current_medications_relevant: str | None = None,
        additional_context: str | None = None,
        urgency: str = "routine",
    ) -> JsonDict:
        message = {
            "message_id": f"pcp_msg_{len(self.pcp_messages) + 1}",
            "reason_for_consultation": reason_for_consultation,
            "message_body": message_body,
            "symptom_onset": symptom_onset,
            "symptom_severity": symptom_severity,
            "current_medications_relevant": current_medications_relevant,
            "additional_context": additional_context,
            "urgency": urgency,
            "status": "sent",
        }
        self.pcp_messages.append(message)
        return {"ok": True, "message": deepcopy(message)}

    def _get_profile(self) -> JsonDict:
        return {"ok": True, "profile": deepcopy(self.patient_profile)}

    def _set_profile_field(self, field: str, value: Any) -> JsonDict:
        self.profile_change_log.append({"field": field, "value": value})
        self.patient_profile[field] = value
        return {"ok": True, "updated": {"field": field, "value": value}}

    def _update_contact_info(
        self,
        phone: str | None = None,
        email: str | None = None,
        address: str | None = None,
    ) -> JsonDict:
        updated = {}
        demographics = self.patient_profile.setdefault("demographics", {})
        for field, value in {"phone": phone, "email": email, "address": address}.items():
            if value is None:
                continue
            demographics[field] = value
            updated[field] = value
            self.profile_change_log.append({"field": f"demographics.{field}", "value": value})
        if not updated:
            return {"ok": False, "error": "At least one contact field is required."}
        return {"ok": True, "updated": updated}

    def _update_pcp(self, new_pcp_name: str, reason: str | None = None) -> JsonDict:
        updated = self._set_profile_field("preferred_pcp", new_pcp_name)
        if updated["ok"] and reason:
            updated["updated"]["reason"] = reason
        return updated

    def _update_pharmacy(
        self,
        pharmacy_name: str,
        pharmacy_address: str | None = None,
        pharmacy_phone: str | None = None,
    ) -> JsonDict:
        updated = self._set_profile_field("preferred_pharmacy", pharmacy_name)
        if pharmacy_address or pharmacy_phone:
            updated["updated"]["pharmacy_details"] = {
                "name": pharmacy_name,
                "address": pharmacy_address,
                "phone": pharmacy_phone,
            }
        return updated

    def _update_insurance(
        self,
        insurance_name: str | None = None,
        plan_type: str | None = None,
    ) -> JsonDict:
        insurance = dict(self.patient_profile.get("insurance") or {})
        for field, value in {
            "payer": insurance_name,
            "plan": plan_type,
        }.items():
            if value is not None:
                insurance[field] = value
        if not insurance:
            return {"ok": False, "error": "At least one insurance field is required."}
        self.patient_profile["insurance"] = insurance
        self.profile_change_log.append({"field": "insurance", "value": deepcopy(insurance)})
        return {"ok": True, "updated": {"insurance": deepcopy(insurance)}}


def build_case_appointments(case: JsonDict) -> list[JsonDict]:
    profile = case.get("patient_profile") if isinstance(case.get("patient_profile"), dict) else {}
    pcp = str(profile.get("preferred_pcp") or "Primary Care")
    current_datetime = _parse_case_datetime(case.get("current_datetime"))
    appointments = _case_declared_appointments(case, current_datetime)
    appointment_ids = {str(appt.get("appointment_id")) for appt in appointments}

    for appointment in _default_available_appointments(current_datetime, pcp):
        if str(appointment["appointment_id"]) not in appointment_ids:
            appointments.append(appointment)
            appointment_ids.add(str(appointment["appointment_id"]))

    seed = case.get("seed") if isinstance(case.get("seed"), dict) else {}
    if seed.get("task_subcategory") in EXISTING_APPOINTMENT_TASKS and "appt_existing_primary_care" not in appointment_ids:
        appointments.insert(0, _default_existing_appointment(current_datetime, pcp))
    return appointments


def _case_declared_appointments(case: JsonDict, current_datetime: datetime) -> list[JsonDict]:
    sandbox_state = case.get("sandbox_state") if isinstance(case.get("sandbox_state"), dict) else {}
    raw_appointments = sandbox_state.get("appointments") if isinstance(sandbox_state, dict) else None
    if not isinstance(raw_appointments, list):
        return []
    appointments: list[JsonDict] = []
    for index, appointment in enumerate(raw_appointments):
        if not isinstance(appointment, dict):
            continue
        normalized = deepcopy(appointment)
        normalized.setdefault("appointment_id", f"appt_declared_{index + 1}")
        normalized.setdefault("provider", "Primary Care")
        normalized.setdefault("type", "routine primary care")
        normalized.setdefault("starts_at", current_datetime.isoformat())
        if "available" not in normalized:
            status = str(normalized.get("status") or "").lower()
            normalized["available"] = status not in {"scheduled", "booked", "confirmed"}
        appointments.append(normalized)
    return appointments


def _default_available_appointments(current_datetime: datetime, pcp: str) -> list[JsonDict]:
    urgent_at = datetime.combine(
        current_datetime.date(), time(hour=16), tzinfo=current_datetime.tzinfo
    )
    if urgent_at <= current_datetime:
        urgent_at = current_datetime + timedelta(hours=2)
    routine_at = datetime.combine(
        current_datetime.date() + timedelta(days=1),
        time(hour=10, minute=30),
        tzinfo=current_datetime.tzinfo,
    )
    cardiology_at = datetime.combine(
        current_datetime.date() + timedelta(days=3),
        time(hour=9),
        tzinfo=current_datetime.tzinfo,
    )
    return [
        {
            "appointment_id": "appt_urgent_today",
            "provider": pcp,
            "type": "urgent primary care",
            "starts_at": urgent_at.isoformat(),
            "available": True,
        },
        {
            "appointment_id": "appt_routine_tomorrow",
            "provider": pcp,
            "type": "routine primary care",
            "starts_at": routine_at.isoformat(),
            "available": True,
        },
        {
            "appointment_id": "appt_cardiology_soon",
            "provider": "Cardiology Clinic",
            "type": "cardiology",
            "starts_at": cardiology_at.isoformat(),
            "available": True,
        },
    ]


def _default_existing_appointment(current_datetime: datetime, pcp: str) -> JsonDict:
    starts_at = datetime.combine(
        current_datetime.date() + timedelta(days=3),
        time(hour=10),
        tzinfo=current_datetime.tzinfo,
    )
    return {
        "appointment_id": "appt_existing_primary_care",
        "provider": pcp,
        "type": "routine primary care",
        "starts_at": starts_at.isoformat(),
        "available": False,
        "reason": "existing patient appointment",
    }


def _matches_preferred_time(appointment: JsonDict, preferred_time: str) -> bool:
    requested = str(preferred_time or "").strip().lower()
    if not requested:
        return True
    haystack = f"{appointment.get('starts_at', '')} {appointment.get('type', '')}".lower()
    if requested in haystack:
        return True
    starts_at = str(appointment.get("starts_at") or "")
    try:
        appointment_time = datetime.fromisoformat(starts_at.replace("Z", "+00:00")).time()
    except ValueError:
        return False
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p", "%I %p", "%I%p"):
        try:
            requested_time = datetime.strptime(requested.upper(), fmt).time()
        except ValueError:
            continue
        if appointment_time.hour == requested_time.hour and appointment_time.minute == requested_time.minute:
            return True
    return False


def _parse_case_datetime(value: Any) -> datetime:
    if isinstance(value, str) and value:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.now().astimezone()
