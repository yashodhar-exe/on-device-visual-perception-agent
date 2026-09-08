"""
test_server.py

Pytest suite for FastAPI Vision Agent Server:
- Health check endpoint
- Analyze endpoint with mock payload
- Strict PII rejection in Pydantic schemas
- Malicious code / script injection rejection
"""

import pytest
import sys
import os

# Add server root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from actions.action_schema import AgentAction, AnalyzeRequest

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["vlm_ready"] is True


def test_analyze_endpoint_valid_request():
    payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [
            {
                "role": "textbox",
                "label": "[EMAIL]",
                "selector": "#email",
                "tagName": "INPUT",
                "boundingBox": {"x": 100, "y": 100, "width": 200, "height": 35},
            },
            {
                "role": "textbox",
                "label": "[PASSWORD]",
                "selector": "#password",
                "tagName": "INPUT",
                "boundingBox": {"x": 100, "y": 150, "width": 200, "height": 35},
            },
            {
                "role": "button",
                "label": "Sign In",
                "selector": "#login-btn",
                "tagName": "BUTTON",
                "boundingBox": {"x": 100, "y": 200, "width": 100, "height": 40},
            },
        ],
        "domStructure": "<form id='login'><input id='email'/><input id='password'/><button id='login-btn'>Sign In</button></form>",
        "ocrText": "Sign In [EMAIL] [PASSWORD]",
        "url": "https://example.com/login",
        "taskDescription": "Log in to the dashboard",
    }

    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "actions" in data
    assert len(data["actions"]) > 0
    assert data["policySafe"] is True

    # Verify that password action requires confirmation and uses LOCAL_PASSWORD
    pass_action = next((a for a in data["actions"] if a["selector"] == "#password"), None)
    if pass_action:
        assert pass_action["requiresConfirmation"] is True
        assert pass_action["valueRef"] == "LOCAL_PASSWORD"


def test_schema_rejects_raw_pii_in_text():
    # Attempting to assign raw email string into text must raise ValueError
    with pytest.raises(ValueError, match="Raw sensitive value detected"):
        AgentAction(action="type", selector="#email", text="user@domain.com")

    # Attempting to assign raw credit card number into text must raise ValueError
    with pytest.raises(ValueError, match="Raw sensitive value detected"):
        AgentAction(action="type", selector="#card", text="4111111111111111")


def test_schema_rejects_malicious_selector_injection():
    # Attempting to inject javascript: or eval() into selector must raise ValueError
    with pytest.raises(ValueError, match="Potentially malicious code pattern"):
        AgentAction(action="click", selector="javascript:alert(document.cookie)")

    with pytest.raises(ValueError, match="Potentially malicious code pattern"):
        AgentAction(action="click", selector="eval(window.location)")


def test_server_rejects_raw_pii_in_dom_or_ocr():
    # 1. Payload with raw email in DOM skeleton must be rejected with 422
    bad_dom_payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [],
        "domStructure": "<div>Contact admin at leaked_ceo@company.com</div>",
        "ocrText": "Welcome page",
        "url": "https://example.com",
    }
    response = client.post("/analyze", json=bad_dom_payload)
    assert response.status_code == 422
    assert "POLICY_VIOLATION" in response.text

    # 2. Payload with raw Aadhaar in OCR text must be rejected with 422
    bad_ocr_payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [],
        "domStructure": "<div>Safe DOM</div>",
        "ocrText": "Identity verified Aadhaar: 2345 6789 0124",
        "url": "https://example.com",
    }
    response = client.post("/analyze", json=bad_ocr_payload)
    assert response.status_code == 422
    assert "POLICY_VIOLATION" in response.text

