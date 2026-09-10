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


def test_search_action_planning():
    payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [
            {
                "role": "searchbox",
                "label": "Search",
                "selector": "#search-input",
                "tagName": "INPUT",
                "boundingBox": {"x": 50, "y": 50, "width": 300, "height": 40},
            },
            {
                "role": "button",
                "label": "Search",
                "selector": "#search-button",
                "tagName": "BUTTON",
                "boundingBox": {"x": 360, "y": 50, "width": 80, "height": 40},
            },
        ],
        "domStructure": "<div><input id='search-input' role='searchbox'/><button id='search-button'>Search</button></div>",
        "ocrText": "National Internship Portal Search",
        "url": "http://localhost:5055/search_demo.html",
        "taskDescription": "Find the search box and search for internships",
    }

    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    actions = data["actions"]

    # Verify structured sequence: click searchbox -> type query -> submit
    assert len(actions) == 3
    assert actions[0]["action"] == "click"
    assert actions[0]["selector"] == "#search-input"

    assert actions[1]["action"] == "type"
    assert actions[1]["selector"] == "#search-input"
    assert actions[1]["text"] == "internships"

    assert actions[2]["action"] == "click"
    assert actions[2]["selector"] == "#search-button"



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


def test_server_rejects_authentication_context_payload():
    auth_payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [],
        "domStructure": "<div>Sign in to account</div>",
        "ocrText": "Sign in",
        "url": "https://example.com/login",
        "context": "AUTHENTICATION",
    }
    response = client.post("/analyze", json=auth_payload)
    assert response.status_code == 422
    assert "POLICY_VIOLATION" in response.text


def test_server_rejects_messaging_context_payload():
    chat_payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [],
        "domStructure": "<div>Chat log</div>",
        "ocrText": "Type a message",
        "url": "https://web.whatsapp.com",
        "context": "MESSAGING",
    }
    response = client.post("/analyze", json=chat_payload)
    assert response.status_code == 422
    assert "POLICY_VIOLATION" in response.text


def test_server_rejects_social_media_context_payload():
    social_payload = {
        "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "accessibilityTree": [],
        "domStructure": "<div>Social feed and user posts</div>",
        "ocrText": "What's happening?",
        "url": "https://x.com/home",
        "context": "SOCIAL_MEDIA",
    }
    response = client.post("/analyze", json=social_payload)
    assert response.status_code == 422
    assert "POLICY_VIOLATION" in response.text


def test_schema_rejects_blocked_contexts():
    with pytest.raises(ValueError, match="POLICY_VIOLATION"):
        AnalyzeRequest(
            screenshot="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            url="https://example.com",
            context="AUTHENTICATION",
        )

    with pytest.raises(ValueError, match="POLICY_VIOLATION"):
        AnalyzeRequest(
            screenshot="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            url="https://example.com",
            context="MESSAGING",
        )

    with pytest.raises(ValueError, match="POLICY_VIOLATION"):
        AnalyzeRequest(
            screenshot="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            url="https://twitter.com/home",
            context="SOCIAL_MEDIA",
        )


