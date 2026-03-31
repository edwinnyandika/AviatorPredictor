"""
SSE Stream router — real-time crash event broadcast.

Architecture:
  - Each client that connects to GET /stream gets a dedicated asyncio.Queue
  - When a crash arrives via /add (in data.py), it calls broadcast_crash()
  - broadcast_crash() pushes the event JSON to every active queue
  - Each generator loop awaits its queue; events arrive with zero polling lag
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Set

from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse

from core.security import verify_firebase_token, rate_limit

router = APIRouter(prefix="/stream", tags=["stream"])

# Global set of subscriber queues — lives on the app state
_SUBSCRIBERS: Set[asyncio.Queue] = set()


def _get_subscribers(app) -> Set[asyncio.Queue]:
    """Lazily initialise the subscriber set on app state."""
    if not hasattr(app.state, "crash_subscribers"):
        app.state.crash_subscribers = set()
    return app.state.crash_subscribers


async def broadcast_crash(app, payload: dict) -> None:
    """
    Push a crash event to every active SSE subscriber.
    Called from data.router after a successful /add insertion.
    """
    subscribers = _get_subscribers(app)
    dead = set()
    data_str = json.dumps(payload)
    for q in list(subscribers):
        try:
            q.put_nowait(data_str)
        except asyncio.QueueFull:
            dead.add(q)
    subscribers -= dead


@router.get("", summary="Server-Sent Events — live crash stream")
async def stream_events(
    request: Request,
    user: dict = Depends(verify_firebase_token)
):
    """
    Connect to receive real-time crash events.
    Events:
      - 'connected'  : handshake on connect
      - 'crash'      : new crash point from interceptor
      - 'ping'       : heartbeat every 20 s (keep connection alive)
    """
    user_id = user["uid"]
    rate_limit(f"stream:{user_id}", max_calls=5, window_seconds=60)
    
    subscribers = _get_subscribers(request.app)
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    subscribers.add(queue)

    async def event_generator():
        # Handshake
        yield "event: connected\ndata: {\"status\":\"ok\"}\n\n"
        try:
            while True:
                # Wait up to 20 s for an event, then send heartbeat
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: crash\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    ts = datetime.now(timezone.utc).isoformat()
                    yield f"event: ping\ndata: {{\"ts\":\"{ts}\"}}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            subscribers.discard(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
