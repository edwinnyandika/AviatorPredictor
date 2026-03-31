"""Streak detection — consecutive low rounds, high rounds, and pattern analysis."""
from __future__ import annotations

from typing import List


def low_streak(values: List[float], threshold: float = 2.0) -> int:
    """Count consecutive low multipliers at the end of the list."""
    count = 0
    for v in reversed(values):
        if v < threshold:
            count += 1
        else:
            break
    return count


def high_streak(values: List[float], threshold: float = 5.0) -> int:
    """Count consecutive high multipliers at the end of the list."""
    count = 0
    for v in reversed(values):
        if v >= threshold:
            count += 1
        else:
            break
    return count


def spike_count(values: List[float], threshold: float = 10.0) -> int:
    """Count how many rounds hit the spike threshold."""
    return sum(1 for v in values if v >= threshold)


def percentile(values: List[float], p: float) -> float:
    """Return the p-th percentile of values (0–100)."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    idx = (p / 100) * (len(sorted_vals) - 1)
    lower = int(idx)
    upper = min(lower + 1, len(sorted_vals) - 1)
    frac = idx - lower
    return round(sorted_vals[lower] * (1 - frac) + sorted_vals[upper] * frac, 2)


def streak_summary(values: List[float]) -> dict:
    return {
        "low_streak": low_streak(values),
        "high_streak": high_streak(values),
        "spike_count": spike_count(values),
        "percentile_20": percentile(values, 20),
        "percentile_50": percentile(values, 50),
        "percentile_80": percentile(values, 80),
    }
