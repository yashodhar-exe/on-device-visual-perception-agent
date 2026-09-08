"""
action_schema.py

Pydantic schemas and validation for Browser Vision Agent API.
Enforces strict typing, rejects raw PII values, and prohibits arbitrary code execution.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
import re

# Supported browser actions
ActionType = Literal[
    "click",
    "type",
    "scroll",
    "select",
    "hover",
    "focus",
    "submit",
    "wait",
]

# Sensitive patterns that must NEVER be returned as raw plaintext
RAW_PII_PATTERNS = [
    re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"),  # Email
    re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b"),  # Card
    re.compile(r"\bsk-[a-zA-Z0-9]{20,}\b"),  # OpenAI/Anthropic keys
    re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b"),  # Aadhaar
    re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),  # PAN
]


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class A11yNode(BaseModel):
    role: str
    label: str = ""
    selector: str
    ariaLabel: Optional[str] = None
    tagName: str
    boundingBox: BoundingBox
    children: Optional[List["A11yNode"]] = None


class AgentAction(BaseModel):
    action: ActionType
    selector: Optional[str] = None
    text: Optional[str] = None
    valueRef: Optional[str] = Field(
        None,
        description="Symbolic reference to locally stored credential (e.g. 'LOCAL_EMAIL', 'LOCAL_PASSWORD'). Server never handles raw secret."
    )
    direction: Optional[Literal["up", "down", "left", "right"]] = None
    value: Optional[str] = None
    requiresConfirmation: bool = False
    reason: Optional[str] = None
    confidence: float = Field(0.9, ge=0.0, le=1.0)

    @field_validator("text")
    def reject_raw_pii_in_text(cls, v):
        if v is not None:
            for pattern in RAW_PII_PATTERNS:
                if pattern.search(v):
                    raise ValueError(
                        f"Raw sensitive value detected in text field. Use valueRef instead of plaintext."
                    )
        return v

    @field_validator("selector")
    def sanitize_selector(cls, v):
        if v is not None:
            # Prohibit javascript: execution, eval, or script injection in selectors
            if any(forbidden in v.lower() for forbidden in ["javascript:", "eval(", "<script", "onload="]):
                raise ValueError("Potentially malicious code pattern detected in action selector")
        return v


class AnalyzeRequest(BaseModel):
    screenshot: str = Field(..., description="Base64 encoded sanitized PNG screenshot")
    accessibilityTree: List[A11yNode] = Field(default_factory=list)
    domStructure: str = Field("", description="Sanitized HTML skeleton")
    ocrText: str = Field("", description="Sanitized OCR text")
    url: str
    taskDescription: Optional[str] = None
    timestamp: Optional[float] = None

    @field_validator("screenshot")
    def validate_screenshot_format(cls, v):
        if not v.startswith("data:image/") and not len(v) > 50:
            raise ValueError("Invalid screenshot base64 format")
        return v

    @field_validator("domStructure", "ocrText")
    def reject_raw_pii_in_metadata(cls, v, info):
        if v:
            for pattern in RAW_PII_PATTERNS:
                match = pattern.search(v)
                if match:
                    raise ValueError(
                        f"POLICY_VIOLATION: Raw sensitive data '{match.group(0)[:6]}...' leaked in {info.field_name}."
                    )
        return v


class AnalyzeResponse(BaseModel):
    actions: List[AgentAction]
    reasoning: str
    confidence: float = Field(0.9, ge=0.0, le=1.0)
    policySafe: bool = True
    engineMode: str = Field("deterministic_fallback", description="'neural_vlm' or 'deterministic_fallback'")
    modelName: str = Field("Qwen/Qwen2.5-VL-3B-Instruct", description="Target or active model name")
    device: str = Field("cpu", description="Execution device (cuda/cpu)")
    statusMessage: Optional[str] = None

