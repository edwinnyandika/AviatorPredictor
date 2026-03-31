"""Base casino adapter — all casino-specific adapters inherit from this."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CasinoMeta:
    """Static metadata about a casino."""
    id: str
    name: str
    country: str
    currency: str
    wss_pattern: Optional[str] = None
    logo_url: Optional[str] = None
    status: str = "active"   # active | beta | coming_soon


class BaseCasinoAdapter:
    """
    Base class for casino-specific WebSocket frame parsers.
    Each subclass knows how to:
      - Identify the correct WebSocket URL
      - Parse SFS2X / raw JSON frames for crash points
    """
    meta: CasinoMeta

    @classmethod
    def get_meta(cls) -> CasinoMeta:
        return cls.meta

    @classmethod
    def parse_crash(cls, raw: str) -> Optional[float]:
        """
        Parse a raw WebSocket frame and return the crash multiplier,
        or None if this frame does not contain a crash event.
        """
        raise NotImplementedError

    @classmethod
    def get_script_context(cls) -> dict:
        """
        Return template variables for the console script generator.
        Override to add casino-specific WSS hooks.
        """
        return {
            "casino_id": cls.meta.id,
            "casino_name": cls.meta.name,
            "wss_pattern": cls.meta.wss_pattern or "",
        }
