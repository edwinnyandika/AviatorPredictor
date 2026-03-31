import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

from core.config import validate_env
from db.supabase import get_client
from routers import casino, data, predict, stream, polar

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aviatoriq.backend")

VERSION = "2.0"

# ─── CORS ────────────────────────────────────────────────────────────────────

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").strip()
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
]

if os.getenv("ENVIRONMENT") == "development":
    ALLOWED_ORIGINS.append("http://localhost:3001")

logger.info("CORS allowed origins: %s", ALLOWED_ORIGINS)

# ─── APP ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AviatorIQ API",
    version=VERSION,
    description="Real-time crash signal engine with SSE broadcast.",
)

# Request ID Middleware
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type", 
        "X-AviatorIQ-Token",
        "X-AviatorIQ-User"
    ],
    expose_headers=["X-Request-ID"]
)

# ─── ROUTERS ─────────────────────────────────────────────────────────────────

app.include_router(data.router)
app.include_router(predict.router)
app.include_router(stream.router)
app.include_router(casino.router)
app.include_router(polar.router)


# ─── HEALTH ──────────────────────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "version": VERSION,
        "db": app.state.supabase_ready if hasattr(app.state, "supabase_ready") else False,
    }


# ─── STARTUP ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    validate_env()

    client = get_client()
    app.state.supabase = client
    app.state.supabase_ready = client is not None
    app.state.crash_subscribers = set()

    if client:
        try:
            client.table("aviator_history").select("id", count="exact").limit(1).execute()
            logger.info("Supabase connection verified.")
        except Exception as exc:
            logger.warning("Supabase probe failed: %s", exc)
    else:
        logger.warning("Running without Supabase — data will not persist.")
