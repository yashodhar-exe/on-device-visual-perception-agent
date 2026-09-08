"""
action_planner.py

Action Planner Subsystem:
Validates, hardens, and synthesizes structured browser actions from VLM reasoning.
Enforces security constraints:
  1. Mandates user confirmation on submit / auth actions.
  2. Ensures sensitive input fields use valueRef instead of raw text.
  3. Provides deterministic fallback planning based on accessibility tree structure.
"""

from typing import List
from actions.action_schema import AgentAction, A11yNode, AnalyzeRequest, AnalyzeResponse


def is_sensitive_target(selector: str, label: str) -> bool:
    """Checks whether a target element is associated with sensitive data or destructive actions."""
    target_str = f"{selector} {label}".lower()
    sensitive_keywords = [
        "pass", "pwd", "auth", "login", "sign-in", "signin", "submit",
        "card", "cvv", "payment", "pay", "checkout", "delete", "destroy",
        "aadhaar", "pan", "ssn", "gov"
    ]
    return any(kw in target_str for kw in sensitive_keywords)


def plan_actions_from_tree(request: AnalyzeRequest) -> List[AgentAction]:
    """
    Deterministic rule-based action planner:
    Inspects the accessibility tree and task description to synthesize
    safe, structured browser actions. Used for fast demonstration and fallback.
    """
    actions: List[AgentAction] = []
    tree = request.accessibilityTree
    task = (request.taskDescription or "").lower()

    if not tree:
        return actions

    # Search for login/registration form fields
    email_node = next(
        (n for n in tree if "email" in f"{n.selector} {n.label}".lower() and n.role == "textbox"),
        None
    )
    pass_node = next(
        (n for n in tree if any(k in f"{n.selector} {n.label}".lower() for k in ["pass", "pwd"]) and n.role == "textbox"),
        None
    )
    submit_node = next(
        (n for n in tree if any(k in f"{n.selector} {n.label}".lower() for k in ["submit", "login", "sign in", "continue"]) and n.role in ["button", "link"]),
        None
    )

    if email_node:
        actions.append(
            AgentAction(
                action="type",
                selector=email_node.selector,
                valueRef="LOCAL_EMAIL",
                requiresConfirmation=False,
                reason="Populate user email from secure client store",
                confidence=0.92,
            )
        )

    if pass_node:
        actions.append(
            AgentAction(
                action="type",
                selector=pass_node.selector,
                valueRef="LOCAL_PASSWORD",
                requiresConfirmation=True,
                reason="Fill password securely without transmitting raw secret to server",
                confidence=0.95,
            )
        )

    if submit_node and (email_node or pass_node or "submit" in task or "login" in task):
        actions.append(
            AgentAction(
                action="click",
                selector=submit_node.selector,
                requiresConfirmation=True,
                reason="Form submission requires explicit user authorization",
                confidence=0.90,
            )
        )

    # If no specific login pattern, find first relevant interactive element matching task
    if not actions and tree:
        first_btn = next((n for n in tree if n.role == "button"), None)
        if first_btn:
            actions.append(
                AgentAction(
                    action="click",
                    selector=first_btn.selector,
                    requiresConfirmation=is_sensitive_target(first_btn.selector, first_btn.label),
                    reason=f"Activate {first_btn.label or first_btn.selector}",
                    confidence=0.85,
                )
            )

    return actions


def post_process_actions(actions: List[AgentAction]) -> List[AgentAction]:
    """
    Enforces security invariants on any list of actions before returning to client:
      - Forces requiresConfirmation = True on sensitive targets
      - Converts any plaintext sensitive value to symbolic valueRef
    """
    hardened: List[AgentAction] = []

    for act in actions:
        selector = act.selector or ""
        reason = act.reason or ""

        # Enforce confirmation for submit and sensitive fields
        if act.action in ["submit"] or is_sensitive_target(selector, reason):
            act.requiresConfirmation = True

        # Ensure password fields never receive plaintext text
        if "pass" in selector.lower() and act.text and not act.valueRef:
            act.valueRef = "LOCAL_PASSWORD"
            act.text = None

        hardened.append(act)

    return hardened
