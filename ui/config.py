"""Explicit endpoint configuration; credentials never enter public responses."""
from dataclasses import dataclass, field
import os
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class EndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    base_url: str = Field(max_length=2048)
    model: str = Field(max_length=240)
    api_key: SecretStr | None = None
    clear_api_key: bool = False

    @field_validator("base_url")
    @classmethod
    def valid_url(cls, value):
        value = value.strip().rstrip("/")
        parsed = urlsplit(value)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username or parsed.password or parsed.query or parsed.fragment):
            raise ValueError("Use an HTTP(S) base URL without credentials, query, or fragment")
        if any(ord(c) < 33 for c in value):
            raise ValueError("Invalid URL characters")
        _ = parsed.port
        return value

    @field_validator("model")
    @classmethod
    def normalize_model(cls, value):
        # A blank model leaves this side unconfigured while the other can run.
        return value.strip()


class SettingsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    baseline: EndpointInput
    checkpoint: EndpointInput


@dataclass
class Endpoint:
    base_url: str
    model: str
    api_key: str = field(default="", repr=False)

    def public(self):
        return dict(base_url=self.base_url, model=self.model,
                    api_key_configured=bool(self.api_key), configured=bool(self.base_url and self.model))

    def worker(self):
        return dict(base_url=self.base_url, model=self.model, api_key=self.api_key)

    @classmethod
    def update(cls, incoming, previous):
        key = incoming.api_key.get_secret_value() if incoming.api_key else ""
        # An unchanged blank input retains the server-side secret only for the same destination.
        if not key and incoming.base_url == previous.base_url and not incoming.clear_api_key:
            key = previous.api_key
        return cls(incoming.base_url, incoming.model, "" if incoming.clear_api_key else key)


def initial_endpoints():
    return {
        "baseline": Endpoint(os.getenv("BASELINE_BASE_URL", "https://inference-api.nvidia.com/v1").rstrip("/"),
                             os.getenv("BASELINE_MODEL", ""), os.getenv("BASELINE_API_KEY", "")),
        "checkpoint": Endpoint(os.getenv("CHECKPOINT_BASE_URL", "http://127.0.0.1:18045/v1").rstrip("/"),
                               os.getenv("CHECKPOINT_MODEL", "pab-astra-step25-heldout"),
                               os.getenv("CHECKPOINT_API_KEY", "")),
    }
