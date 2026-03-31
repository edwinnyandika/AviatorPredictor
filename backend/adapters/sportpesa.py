"""SportPesa (Spribe SFS2X) adapter."""
from __future__ import annotations

import json
from typing import Optional

from .base import BaseCasinoAdapter, CasinoMeta


class SportPesaAdapter(BaseCasinoAdapter):
    meta = CasinoMeta(
        id="sportpesa",
        name="SportPesa",
        country="Kenya",
        currency="KES",
        wss_pattern="wss://*.spribegaming.com/*",
        status="active",
    )

    @classmethod
    def parse_crash(cls, raw: str) -> Optional[float]:
        """
        SportPesa uses Spribe's SFS2X protocol.
        Frames are null-byte delimited JSON objects:
          { "c": "ext", "a": "roundResult", "p": { "crashPoint": 3.14 } }
        """
        for frame in raw.split("\x00"):
            frame = frame.strip()
            if not frame:
                continue
            try:
                msg = json.loads(frame)
            except (json.JSONDecodeError, ValueError):
                continue

            if msg.get("c") != "ext":
                continue

            action = msg.get("a", "")
            if action not in (
                "roundResult", "gameResult", "crashResult",
                "planeCrashed", "roundEnd", "gameEnd",
            ):
                continue

            p = msg.get("p", {})
            for key in ("crashPoint", "crash", "mult", "m", "multiplier", "result", "value", "coef", "x"):
                raw_val = p.get(key)
                if raw_val is not None:
                    try:
                        val = float(raw_val)
                        if val >= 1.0:
                            return round(val, 2)
                    except (TypeError, ValueError):
                        continue
        return None

    @classmethod
    def get_script_context(cls) -> dict:
        ctx = super().get_script_context()
        ctx["wss_host_pattern"] = "spribegaming.com"
        ctx["frame_protocol"] = "sfs2x"
        return ctx
