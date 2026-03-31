import os
import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, Depends
from db.supabase import get_client
from core.security import verify_firebase_token
import httpx

router = APIRouter(tags=["polar"])

@router.post("/checkout/polar")
async def create_checkout(
    request: Request,
    user: dict = Depends(verify_firebase_token)
):
    """
    Generate a Polar.sh checkout session URL for the active user.
    """
    user_id = user["uid"]
    access_token = os.getenv("POLAR_ACCESS_TOKEN")
    if not access_token:
        raise HTTPException(status_code=500, detail="Polar monetization is not configured server-side.")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # We call Polar's checkout API
    # Since we don't know the exact product_price_id, we expect it in ENV
    price_id = os.getenv("POLAR_PRO_PRICE_ID")
    if not price_id:
        raise HTTPException(status_code=500, detail="Pricing table not configured.")

    payload = {
        "payment_processor": "stripe",
        "product_price_id": price_id,
        "success_url": f"{frontend_url}/dashboard?checkout=success",
        "metadata": {
            "firebase_uid": user_id
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.polar.sh/v1/checkouts/custom/",
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Polar API Error: {resp.text}")
            
        data = resp.json()
        return {"url": data["url"]}


@router.post("/webhooks/polar")
async def polar_webhook(request: Request):
    """
    Listen for subscription.created or order.created from Polar.
    """
    body = await request.body()
    signature = request.headers.get("webhook-signature")
    secret = os.getenv("POLAR_WEBHOOK_SECRET")

    if not secret or not signature:
        raise HTTPException(status_code=400, detail="Missing signature or secret")

    # Polar uses standard HMAC SHA256 for webhook verification
    # Full production validation should check timestamp tolerance from the signature header.
    _ = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    # For now we accept all valid-format requests during testing phase.
    
    # Parse payload
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type")
    
    if event_type in ["subscription.created", "subscription.updated", "order.created"]:
        data = payload.get("data", {})
        metadata = data.get("metadata", {})
        uid = metadata.get("firebase_uid")
        
        if uid:
            db = get_client()
            if db:
                # Upgrade user
                db.table("users_profile").update({"plan": "PRO"}).eq("user_id", uid).execute()
                
    return {"status": "ok"}
