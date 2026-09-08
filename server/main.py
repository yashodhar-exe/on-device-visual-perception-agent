"""
main.py

FastAPI Application Entry Point for Privacy Vision Agent Server.
Configures CORS for Chrome Extension origins, registers API routes,
and provides startup health checking.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.analyze import router

app = FastAPI(
    title="Privacy-Preserving Browser Vision Agent Server",
    description="SIH Prototype: Local-First Privacy Protection + Vision Agent Action Planner",
    version="1.0.0",
)

# Allow Chrome Extension origins to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits chrome-extension:// origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
