import os
from typing import NoReturn

REQUIRED_BACKEND_VARS = [
    "SUPABASE_URL", 
    "SUPABASE_SERVICE_KEY",
    "FIREBASE_PROJECT_ID", 
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL", 
    "INTERCEPTOR_MASTER_SECRET",
    "RENDER_URL", 
    "FRONTEND_URL"
]

# Polar is optional during testing but warned
POLAR_VARS = ["POLAR_ACCESS_TOKEN", "POLAR_WEBHOOK_SECRET", "POLAR_PRO_PRICE_ID"]

def validate_env() -> None | NoReturn:
    missing = [v for v in REQUIRED_BACKEND_VARS if not os.getenv(v)]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            f"Check your .env file or deployment environment."
        )
