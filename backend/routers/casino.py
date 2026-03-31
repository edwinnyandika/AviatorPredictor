"""
Casino router — /casino/list, /casino/connect, /casino/script/{casino_id}
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel

from adapters.registry import list_casinos, get_meta, get_script_context
from scripts.generator import generate_script
from core.security import verify_firebase_token, rate_limit

router = APIRouter(prefix="/casino", tags=["casino"])


# ─── /casino/list ────────────────────────────────────────────────────────────

@router.get("/list")
async def casino_list():
    """Return all supported casinos with metadata."""
    return {"casinos": list_casinos()}


# ─── /casino/connect ─────────────────────────────────────────────────────────

class ConnectPayload(BaseModel):
    casino_id: str
    user_id: Optional[str] = None


@router.post("/connect")
async def casino_connect(
    payload: ConnectPayload, 
    request: Request,
    user: dict = Depends(verify_firebase_token)
):
    """Start a session for a user on a casino. Returns session ID."""
    meta = get_meta(payload.casino_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Casino '{payload.casino_id}' not found")

    if meta.status == "coming_soon":
        raise HTTPException(status_code=400, detail=f"'{meta.name}' is not yet available")

    client = request.app.state.supabase
    session_id = None
    user_id = user["uid"]

    if client is not None and user_id:
        try:
            resp = client.table("sessions").insert({
                "user_id": user_id,
                "casino_id": payload.casino_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "status": "active",
            }).execute()
            if resp.data:
                session_id = resp.data[0].get("id")
        except Exception as exc:
            # Non-fatal — continue without session tracking
            pass

    return {
        "casino": payload.casino_id,
        "casino_name": meta.name,
        "session_id": session_id,
        "status": "connected",
    }


# ─── /casino/script/{casino_id} ──────────────────────────────────────────────

@router.get("/script/{casino_id}")
async def get_script(
    casino_id: str,
    user: dict = Depends(verify_firebase_token)
):
    """Generate and return the console script for a casino."""
    user_id = user["uid"]
    rate_limit(f"script:{user_id}", max_calls=10, window_seconds=60)
    
    meta = get_meta(casino_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Casino '{casino_id}' not found")

    if meta.status == "coming_soon":
        raise HTTPException(status_code=400, detail=f"Script not available yet for '{meta.name}'")

    try:
        script = generate_script(casino_id, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "casino_id": casino_id,
        "casino_name": meta.name,
        "script": script,
        "instructions": [
            f"1. Open {meta.name} in a new browser tab",
            "2. Open DevTools → Console (F12 or Ctrl+Shift+J)",
            "3. Paste the script below and press Enter",
            "4. Look for the HUD in the top-right corner of the game",
            "5. Play — crash events stream live to your dashboard",
        ],
    }


# ─── /casino/status (legacy) ─────────────────────────────────────────────────

@router.get("/status")
async def casino_status():
    return {"status": "ready"}
