"""
Console script generator.

Usage:
    from scripts.generator import generate_script
    js = generate_script("sportpesa")
"""
from __future__ import annotations

import os
import hmac
import hashlib
from pathlib import Path

from adapters.registry import get_script_context

_TEMPLATE_DIR = Path(__file__).parent
_BASE_TEMPLATE = _TEMPLATE_DIR / "base.js.template"


def generate_user_token(user_id: str) -> str:
    """
    Generates a deterministic per-user token using HMAC-SHA256.
    Same user always gets same token — no storage needed.
    Token changes only if INTERCEPTOR_MASTER_SECRET rotates.
    """
    secret = os.environ.get("INTERCEPTOR_MASTER_SECRET", "changeme")
    return hmac.new(
        secret.encode(),
        user_id.encode(),
        hashlib.sha256
    ).hexdigest()


def generate_script(casino_id: str, user_id: str) -> str:
    """
    Generate a ready-to-paste console script for the given casino.
    Injects:
      - backend URL (from RENDER_URL env)
      - casino-specific metadata
      - per-user authentication token and user ID
    """
    ctx = get_script_context(casino_id)
    if ctx is None:
        raise ValueError(f"Unknown casino: {casino_id}")

    # Try casino-specific template first, fall back to base
    specific = _TEMPLATE_DIR / f"{casino_id}.js.template"
    template_path = specific if specific.exists() else _BASE_TEMPLATE

    template = template_path.read_text(encoding="utf-8")

    backend_url = os.getenv("RENDER_URL", "").rstrip("/")
    token = generate_user_token(user_id)

    replacements = {
        "{{casino_id}}": ctx["casino_id"],
        "{{casino_name}}": ctx["casino_name"],
        "{{wss_host_pattern}}": ctx.get("wss_host_pattern", ""),
        "{{backend_url}}": backend_url,
        "{{secret}}": token,  # Legacy replacement fallback if used
        "{{TOKEN}}": token,
        "{{USER_ID}}": user_id,
    }

    script = template
    for placeholder, value in replacements.items():
        script = script.replace(placeholder, value)

    return script
