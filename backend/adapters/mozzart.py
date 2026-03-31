"""Mozzart Bet adapter — Spribe SFS2X, beta status."""
from __future__ import annotations

from .sportpesa import SportPesaAdapter
from .base import CasinoMeta


class MozzartAdapter(SportPesaAdapter):
    meta = CasinoMeta(
        id="mozzart",
        name="Mozzart Bet",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.mozzartbet.co.ke/*",
        status="beta",
    )

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["casino_id"] = "mozzart"
        ctx["casino_name"] = "Mozzart Bet"
        ctx["wss_host_pattern"] = "mozzartbet.co.ke"
        return ctx


class OnexBetAdapter(SportPesaAdapter):
    """1xBet KE — Spribe SFS2X."""
    meta = CasinoMeta(
        id="1xbet",
        name="1xBet",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.1xbet.com/*",
        status="beta",
    )

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["casino_id"] = "1xbet"
        ctx["casino_name"] = "1xBet"
        ctx["wss_host_pattern"] = "1xbet.com"
        return ctx


class BetwayAdapter(SportPesaAdapter):
    """Betway KE — Spribe SFS2X."""
    meta = CasinoMeta(
        id="betway",
        name="Betway",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.betway.co.ke/*",
        status="beta",
    )

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["casino_id"] = "betway"
        ctx["casino_name"] = "Betway"
        ctx["wss_host_pattern"] = "betway.co.ke"
        return ctx


class OdiBetsAdapter(SportPesaAdapter):
    """OdiBets — coming soon."""
    meta = CasinoMeta(
        id="odibets",
        name="OdiBets",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.odibets.com/*",
        status="coming_soon",
    )

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["casino_id"] = "odibets"
        ctx["casino_name"] = "OdiBets"
        ctx["wss_host_pattern"] = "odibets.com"
        return ctx
