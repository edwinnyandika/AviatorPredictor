"""Betika adapter — also runs Spribe Aviator via SFS2X."""
from __future__ import annotations

from typing import Optional

from .sportpesa import SportPesaAdapter
from .base import CasinoMeta


class BetikaAdapter(SportPesaAdapter):
    """
    Betika uses the same Spribe SFS2X backend as SportPesa.
    The only differences are metadata and the operator URL.
    """
    meta = CasinoMeta(
        id="betika",
        name="Betika",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.betika.com/*",
        status="active",
    )

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["casino_id"] = "betika"
        ctx["casino_name"] = "Betika"
        ctx["wss_host_pattern"] = "betika.com"
        return ctx
