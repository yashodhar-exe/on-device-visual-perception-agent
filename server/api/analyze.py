"""
analyze.py

FastAPI API Endpoints for Privacy Vision Agent:
- POST /analyze: Main inference and action planning pipeline
- GET /health: Health and readiness diagnostic
"""

import os
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional

from actions.action_schema import AnalyzeRequest, AnalyzeResponse
from vlm.loader import get_vlm_engine

router = APIRouter()
vlm_engine = get_vlm_engine()

# Optional shared secret authentication for SIH demo security
EXPECTED_TOKEN = os.getenv("PF_SERVER_SECRET", "")


def verify_auth(authorization: Optional[str] = Header(None)):
    if EXPECTED_TOKEN:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
        token = authorization.split("Bearer ", 1)[1].strip()
        if token != EXPECTED_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid shared secret token")
    return True


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "Privacy-Preserving Browser Vision Agent Server",
        "version": "1.0.0",
        "auth_enabled": bool(EXPECTED_TOKEN),
        "vlm_ready": True,
    }


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest, _authenticated: bool = Depends(verify_auth)):
    try:
        response = await vlm_engine.analyze(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error: {str(e)}",
        )
