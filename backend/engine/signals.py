"""Signal engine — EMA, RSI, risk level classification."""
from __future__ import annotations

import math
from typing import List


# ─── EMA ────────────────────────────────────────────────────────────────────

def ema(values: List[float], period: int) -> float:
    """Exponential Moving Average over the last `period` values."""
    if not values:
        return 0.0
    k = 2 / (period + 1)
    result = values[0]
    for v in values[1:]:
        result = v * k + result * (1 - k)
    return round(result, 4)


# ─── RSI ─────────────────────────────────────────────────────────────────────

def rsi(values: List[float], period: int = 14) -> float:
    """Relative Strength Index (0–100). Lower = oversold, higher = overbought."""
    if len(values) < period + 1:
        return 50.0
    changes = [values[i] - values[i - 1] for i in range(1, len(values))]
    gains = [max(c, 0) for c in changes[-period:]]
    losses = [abs(min(c, 0)) for c in changes[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


# ─── SAFE CASHOUT ────────────────────────────────────────────────────────────

def safe_cashout(values: List[float], risk_profile: str = "BALANCED") -> float:
    """
    Conservative target: mean minus a fraction of std-dev, adjusted by risk profile.
    """
    if not values:
        return 1.8

    mean = sum(values) / len(values)
    if len(values) > 1:
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance)
    else:
        std = 0.0

    base = max(1.2, mean - std * 0.15)

    multipliers = {"CONSERVATIVE": 0.82, "BALANCED": 1.0, "AGGRESSIVE": 1.2, "PAPER": 1.0}
    m = multipliers.get(risk_profile, 1.0)
    return round(max(1.1, base * m), 2)


# ─── CONFIDENCE ──────────────────────────────────────────────────────────────

def confidence(values: List[float]) -> float:
    """Confidence score 0–1, grows with sample size."""
    return round(min(0.95, 0.50 + len(values) / 500), 2)


# ─── RISK LEVEL ──────────────────────────────────────────────────────────────

def risk_level(values: List[float]) -> str:
    """HIGH / NEUTRAL / LOW based on recent volatility and RSI."""
    if len(values) < 5:
        return "NEUTRAL"
    recent = values[-20:]
    mean = sum(recent) / len(recent)
    variance = sum((v - mean) ** 2 for v in recent) / len(recent)
    std = math.sqrt(variance)
    cv = std / max(mean, 0.01)

    r = rsi(values)
    if cv > 0.6 or r > 70:
        return "HIGH"
    if cv < 0.3 and r < 40:
        return "LOW"
    return "NEUTRAL"


# ─── FULL PREDICTION ─────────────────────────────────────────────────────────

def build_prediction(values: List[float], provider: str = "spribe", risk_profile: str = "BALANCED") -> dict:
    count = len(values)
    if count == 0:
        return {
            "provider": provider,
            "count": 0,
            "safe_cashout": 1.8,
            "confidence": 0.5,
            "mean": 0.0,
            "std_dev": 0.0,
            "risk_level": "NEUTRAL",
            "signals": ["NO_DATA"],
            "next_range": [1.5, 2.5],
        }

    mean = round(sum(values) / count, 2)
    if count > 1:
        variance = sum((v - mean) ** 2 for v in values) / count
        std = round(math.sqrt(variance), 2)
    else:
        std = 0.0

    signals = []
    if count < 5:
        signals.append("INSUFFICIENT_HISTORY")
    if values[-1] < 2 if values else False:
        signals.append("LOW_LAST_ROUND")
    if std > 3:
        signals.append("HIGH_VOLATILITY")
    if mean >= 2.5:
        signals.append("ABOVE_AVERAGE_SESSION")

    ema_short = ema(values[-10:], 5) if len(values) >= 5 else mean
    ema_long = ema(values[-30:], 14) if len(values) >= 14 else mean
    if ema_short > ema_long:
        signals.append("EMA_BULLISH")
    elif ema_short < ema_long:
        signals.append("EMA_BEARISH")

    r = rsi(values)
    if r >= 70:
        signals.append("RSI_OVERBOUGHT")
    elif r <= 30:
        signals.append("RSI_OVERSOLD")

    cashout = safe_cashout(values, risk_profile)
    next_low = round(max(1.1, cashout * 0.85), 2)
    next_high = round(cashout * 1.35, 2)

    return {
        "provider": provider,
        "count": count,
        "safe_cashout": cashout,
        "confidence": confidence(values),
        "mean": mean,
        "std_dev": std,
        "rsi": r,
        "ema_short": round(ema_short, 2),
        "ema_long": round(ema_long, 2),
        "risk_level": risk_level(values),
        "signals": signals or ["STABLE"],
        "next_range": [next_low, next_high],
    }
