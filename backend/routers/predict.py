"""
Predict router — /predict (POST/GET)
Now delegates entirely to the engine.signals module.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel, Field

from engine.signals import build_prediction
from core.security import verify_firebase_token, rate_limit

router = APIRouter(prefix="/predict", tags=["predict"])


class PredictionInput(BaseModel):
    history: List[float] = Field(default_factory=list)
    provider: str = "spribe"
    casino_id: Optional[str] = None
    risk_profile: str = "BALANCED"


@router.get("")
async def predict_default(user: dict = Depends(verify_firebase_token)):
    user_id = user["uid"]
    rate_limit(f"predict:{user_id}", max_calls=30, window_seconds=60)
    return build_prediction([], "spribe")


@router.post("")
async def predict_from_history(
    payload: PredictionInput,
    user: dict = Depends(verify_firebase_token)
):
    user_id = user["uid"]
    rate_limit(f"predict:{user_id}", max_calls=30, window_seconds=60)
    casino = payload.casino_id or payload.provider
    return build_prediction(payload.history, casino, payload.risk_profile)
