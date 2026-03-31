"""
Data router — /add, /history, /stats
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from engine.signals import build_prediction
from engine.streaks import streak_summary
from engine.volatility import volatility_index, volatility_label
from routers.stream import broadcast_crash

router = APIRouter(tags=["data"])


from core.security import verify_interceptor_token, verify_firebase_token, rate_limit


# ─── SCHEMAS ─────────────────────────────────────────────────────────────────

class CrashPayload(BaseModel):
    multiplier: float = Field(..., ge=1.0)
    casino_id: str = Field(default="sportpesa")
    source: str = Field(default="console")
    session_id: Optional[str] = None
    user_id: Optional[str] = None


# ─── /add ────────────────────────────────────────────────────────────────────

@router.post("/add", dependencies=[])
async def add_crash(
    payload: CrashPayload, 
    request: Request,
    credentials: dict = Depends(verify_interceptor_token)
):
    user_id = credentials["user_id"]
    rate_limit(f"add:{user_id}", max_calls=120, window_seconds=60)
    """
    Ingest a crash multiplier from the interceptor console script.
    Stores in Supabase → broadcasts to all SSE subscribers → returns prediction.
    """
    crash = round(payload.multiplier, 2)
    client = request.app.state.supabase

    if client is not None:
        try:
            client.table("aviator_history").insert({
                "crash": crash,
                "provider": "spribe",
                "casino_id": payload.casino_id,
                "source": payload.source,
                "session_id": payload.session_id,
                "user_id": payload.user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"DB insert failed: {exc}") from exc

    # Compute a fresh prediction from recent history
    try:
        recent = _fetch_recent(client, payload.casino_id, limit=100)
    except Exception:
        recent = [crash]

    prediction = build_prediction(recent, provider=payload.casino_id)

    broadcast_payload = {
        "crash": crash,
        "casino_id": payload.casino_id,
        "prediction": prediction,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await broadcast_crash(request.app, broadcast_payload)

    return {"status": "accepted", "crash": crash, "prediction": prediction}


# ─── /data/history ────────────────────────────────────────────────────────────

@router.get("/data/history")
async def get_history(
    request: Request,
    limit: int = Query(default=200, le=500),
    casino_id: Optional[str] = Query(default=None),
    user: dict = Depends(verify_firebase_token)
):
    user_id = user["uid"]
    rate_limit(f"history:{user_id}", max_calls=20, window_seconds=60)
    client = request.app.state.supabase
    if client is None:
        return {"items": [], "connected": False}
    try:
        q = client.table("aviator_history").select("*").order("created_at", desc=True).limit(limit)
        if casino_id:
            q = q.eq("casino_id", casino_id)
        response = q.execute()
        return {"items": response.data or [], "connected": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"History fetch failed: {exc}") from exc


# ─── /data/heatmap ────────────────────────────────────────────────────────────

@router.get("/data/heatmap")
async def get_heatmap(
    request: Request,
    casino_id: Optional[str] = Query(default=None),
    user: dict = Depends(verify_firebase_token)
):
    user_id = user["uid"]
    rate_limit(f"heatmap:{user_id}", max_calls=15, window_seconds=60)
    client = request.app.state.supabase
    # Default 24 zero arrays
    hourly_data = {str(i): {"count": 0, "sum": 0.0} for i in range(24)}
    
    if client:
        try:
            q = client.table("aviator_history").select("crash, created_at").order("created_at", desc=True).limit(2000)
            if casino_id:
                q = q.eq("casino_id", casino_id)
            resp = q.execute()
            
            for row in (resp.data or []):
                if row.get("crash") is not None and row.get("created_at"):
                    dt = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                    hour_str = str(dt.hour)
                    hourly_data[hour_str]["count"] += 1
                    hourly_data[hour_str]["sum"] += row["crash"]
                    
        except Exception as exc:
            pass # Keep defaults on error

    # Format output for frontend D3 charting
    heatmap = []
    for i in range(24):
        hr = str(i)
        count = hourly_data[hr]["count"]
        sm = hourly_data[hr]["sum"]
        heatmap.append({
            "hour": i,
            "avg_multiplier": round(sm / count, 2) if count > 0 else 0.0,
            "rounds_tracked": count
        })
        
    return {"status": "success", "heatmap": heatmap}


# ─── /stats ──────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    request: Request,
    casino_id: Optional[str] = Query(default=None),
    limit: int = Query(default=200, le=500),
    user: dict = Depends(verify_firebase_token)
):
    user_id = user["uid"]
    rate_limit(f"stats:{user_id}", max_calls=20, window_seconds=60)
    client = request.app.state.supabase
    values: list[float] = []

    if client is not None:
        try:
            q = client.table("aviator_history").select("crash").order("created_at", desc=True).limit(limit)
            if casino_id:
                q = q.eq("casino_id", casino_id)
            resp = q.execute()
            values = [row["crash"] for row in (resp.data or []) if row.get("crash") is not None]
            values = list(reversed(values))  # oldest → newest
        except Exception:
            values = []

    prediction = build_prediction(values, provider=casino_id or "spribe")
    streaks = streak_summary(values)
    vol_idx = volatility_index(values)

    return {
        "totalRounds": len(values),
        "avgCrash": round(sum(values) / len(values), 2) if values else 0.0,
        "lastCrash": values[-1] if values else None,
        "safe80th": streaks["percentile_80"],
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "recent10": values[-10:] if len(values) >= 10 else values,
        "volatilityIndex": vol_idx,
        "volatilityLabel": volatility_label(vol_idx),
        "streaks": streaks,
        "prediction": prediction,
    }


# ─── INTERNAL HELPER ─────────────────────────────────────────────────────────

def _fetch_recent(client, casino_id: str, limit: int = 100) -> list[float]:
    if client is None:
        return []
    q = client.table("aviator_history").select("crash").order("created_at", desc=True).limit(limit)
    if casino_id:
        q = q.eq("casino_id", casino_id)
    resp = q.execute()
    values = [row["crash"] for row in (resp.data or []) if row.get("crash") is not None]
    return list(reversed(values))
