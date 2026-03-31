"""Volatility metrics."""
from __future__ import annotations

import math
from typing import List


def std_dev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return round(math.sqrt(variance), 4)


def coefficient_of_variation(values: List[float]) -> float:
    """CV = σ / μ — scale-free volatility measure."""
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    if mean == 0:
        return 0.0
    return round(std_dev(values) / mean, 4)


def volatility_index(values: List[float], window: int = 20) -> int:
    """Return volatility as 0–100 int using CV on last `window` rounds."""
    recent = values[-window:] if len(values) >= window else values
    cv = coefficient_of_variation(recent)
    return min(100, round(cv * 100))


def volatility_label(index: int) -> str:
    if index >= 70:
        return "EXTREME"
    if index >= 50:
        return "HIGH"
    if index >= 30:
        return "MODERATE"
    return "LOW"
