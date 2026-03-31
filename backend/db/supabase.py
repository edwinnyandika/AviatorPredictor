"""Centralised Supabase client — import `get_client()` everywhere."""
import os
import logging
from functools import lru_cache

from supabase import Client, create_client

logger = logging.getLogger("aviatoriq.db")


@lru_cache(maxsize=1)
def get_client() -> Client | None:
    """Return a cached Supabase client, or None if credentials are missing."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_KEY not set — DB unavailable.")
        return None
    try:
        client = create_client(url, key)
        logger.info("Supabase client created.")
        return client
    except Exception:
        logger.exception("Failed to create Supabase client.")
        return None


def require_client(request) -> Client:
    """Fetch the client from app state (set at startup)."""
    return request.app.state.supabase
