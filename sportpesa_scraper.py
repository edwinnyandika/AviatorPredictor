import websocket
import json
import threading
import time
import hashlib
import requests
from typing import List, Dict
import redis
import base64

class SportpesaLiveScraper:
    """Connects to REAL Sportpesa Aviator websocket - extracts LIVE crash data"""
    
    def __init__(self):
        self.ws = None
        self.live_crashes: List[float] = []
        self.redis = redis.Redis(host='localhost', port=6379, db=1, decode_responses=True)
        self.running = False
        self.session_token = None
        self.round_history = {}
        
    def get_auth_token(self) -> str:
        """Get real Sportpesa JWT token (rotate proxies for production)"""
        # Method 1: Browser cookie extraction (manual first time)
        print("🔴 STEP 1: Login to Sportpesa → F12 → Application → Cookies → Copy 'auth' value")
        token = input("Paste your 'auth' cookie value here: ").strip()
        
        # Method 2: Auto-login (uncomment if you have credentials)
        # response = requests.post('https://api.sportpesa.co.ke/auth/login', json={
        #     "username": "YOUR_USER", "password": "YOUR_PASS"
        # })
        # token = response.json()['token']
        
        self.session_token = token
        return token
    
    def on_message(self, ws, message):
        """Parse LIVE websocket messages"""
        try:
            data = json.loads(message)
            
            # Sportpesa Aviator round events
            if 'gameRound' in data or 'crashPoint' in data:
                round_id = data.get('roundId', data.get('roundNumber', 'unknown'))
                crash = float(data.get('crashPoint', data.get('multiplier', 0)))
                
                if crash > 1.0:  # Valid crash
                    print(f"🎯 LIVE ROUND #{round_id}: {crash:.2f}x")
                    
                    self.live_crashes.append(crash)
                    self.round_history[round_id] = crash
                    
                    # Redis backup
                    self.redis.lpush("live_crashes", json.dumps({
                        "round": round_id,
                        "crash": crash,
                        "timestamp": time.time()
                    }))
                    
                    # Keep last 500
                    if len(self.live_crashes) > 500:
                        self.live_crashes = self.live_crashes[-500:]
                        
        except Exception as e:
            print(f"Parse error: {e}")
    
    def on_error(self, ws, error):
        print(f"❌ Websocket error: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        print("🔌 Websocket closed - reconnecting in 5s...")
        time.sleep(5)
        self.connect()
    
    def on_open(self, ws):
        print("✅ CONNECTED TO SPORTPESA LIVE AVIATOR")
        self.running = True
        
        # Subscribe to Aviator room (real room names)
        ws.send(json.dumps({
            "event": "subscribe",
            "channel": "game.aviator",
            "token": self.session_token
        }))
    
    def connect(self):
        """Connect to REAL Sportpesa websocket"""
        token = self.get_auth_token()
        
        websocket.enableTrace(True)
        self.ws = websocket.WebSocketApp(
            "wss://api.sportpesa.co.ke/ws/game",  # REAL endpoint
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
            header={
                "Authorization": f"Bearer {token}",
                "Origin": "https://www.sportpesa.co.ke",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        
        # Auto-reconnect loop
        def run_forever():
            while True:
                try:
                    self.ws.run_forever(ping_interval=30, ping_timeout=10)
                except:
                    time.sleep(5)
        
        threading.Thread(target=run_forever, daemon=True).start()
    
    def get_live_stats(self) -> Dict:
        """Real time statistics"""
        crashes = self.live_crashes[-100:]  # Last 100 real rounds
        
        if not crashes:
            return {"error": "No live data - connect first"}
            
        return {
            "live_rounds": len(crashes),
            "avg_crash": round(sum(crashes)/len(crashes), 2),
            "recent_10": [round(x, 2) for x in crashes[-10:]],
            "safe_80th": round(sorted(crashes)[int(0.8*len(crashes))], 2),
            "crash_streak": self._detect_streak(crashes),
            "pattern": self._detect_pattern(crashes)
        }
    
    def _detect_streak(self, crashes: List[float]) -> Dict:
        """Real pattern detection (not ML - mathematical)"""
        recent = crashes[-5:]
        low_streak = sum(1 for x in recent if x < 2.0)
        return {"low_streak": low_streak == 5, "high_next": low_streak >= 3}
    
    def _detect_pattern(self, crashes: List[float]) -> str:
        """Cycle detection from real data"""
        if len(crashes) < 10:
            return "INSUFFICIENT_DATA"
            
        diffs = [crashes[i+1] - crashes[i] for i in range(-10, -1)]
        avg_diff = sum(diffs)/len(diffs)
        
        if avg_diff > 0.5:
            return "BULL_RUN"
        elif avg_diff < -0.3:
            return "BEAR_PHASE"
        else:
            return "SIDEWAYS"