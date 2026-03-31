import os
import hmac
import hashlib
from fastapi import HTTPException, Header, Depends, Request
from firebase_admin import auth, credentials
import firebase_admin
from collections import defaultdict
from time import time

# ── Firebase Admin Init ──────────────────────────────────
_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.environ["FIREBASE_PROJECT_ID"],
            "private_key_id": os.environ["FIREBASE_PRIVATE_KEY_ID"],
            "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
            "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
            "client_id": os.environ["FIREBASE_CLIENT_ID"],
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app

# ── Firebase Token Verification ──────────────────────────
async def verify_firebase_token(
    authorization: str = Header(None)
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = authorization.split("Bearer ")[1]
    try:
        get_firebase_app()
        decoded = auth.verify_id_token(token)
        if decoded.get("email_verified") is False:
            raise HTTPException(status_code=403, detail="Email not verified")
        return decoded
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

# ── Interceptor Token Verification ───────────────────────
async def verify_interceptor_token(
    request: Request,
    x_aviatoriq_token: str = Header(None),
    x_aviatoriq_user: str = Header(None)
) -> dict:
    if not x_aviatoriq_token or not x_aviatoriq_user:
        raise HTTPException(status_code=401, detail="Missing interceptor credentials")
    
    # Reconstruct expected token for this user
    secret = os.environ["INTERCEPTOR_MASTER_SECRET"]
    expected = hmac.new(
        secret.encode(),
        x_aviatoriq_user.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected, x_aviatoriq_token):
        raise HTTPException(status_code=403, detail="Invalid interceptor token")
    
    return {"user_id": x_aviatoriq_user}

# ── Rate limiting state ───────────────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)

def rate_limit(key: str, max_calls: int, window_seconds: int):
    now = time()
    calls = _rate_store[key]
    _rate_store[key] = [t for t in calls if now - t < window_seconds]
    if len(_rate_store[key]) >= max_calls:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Slow down.")
    _rate_store[key].append(now)
