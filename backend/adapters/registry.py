"""Casino adapter registry — single source of truth for all supported casinos."""
from __future__ import annotations

from typing import Dict, Optional, Type

from .base import BaseCasinoAdapter, CasinoMeta
from .sportpesa import SportPesaAdapter
from .betika import BetikaAdapter
from .mozzart import MozzartAdapter, OnexBetAdapter, BetwayAdapter, OdiBetsAdapter

_REGISTRY: Dict[str, Type[BaseCasinoAdapter]] = {
    "sportpesa": SportPesaAdapter,
    "betika": BetikaAdapter,
    "mozzart": MozzartAdapter,
    "1xbet": OnexBetAdapter,
    "betway": BetwayAdapter,
    "odibets": OdiBetsAdapter,
}


def get_adapter(casino_id: str) -> Optional[Type[BaseCasinoAdapter]]:
    return _REGISTRY.get(casino_id)


def list_casinos() -> list[dict]:
    """Return a list of all casino metadata dicts (for /casino/list)."""
    return [
        {
            **vars(adapter.get_meta()),
        }
        for adapter in _REGISTRY.values()
    ]


def get_meta(casino_id: str) -> Optional[CasinoMeta]:
    adapter = _REGISTRY.get(casino_id)
    return adapter.get_meta() if adapter else None


def get_script_context(casino_id: str) -> Optional[dict]:
    adapter = _REGISTRY.get(casino_id)
    return adapter.get_script_context() if adapter else None
