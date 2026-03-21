"""
Aviator SFS2X SmartFoxServer Client
====================================
Spribe's Aviator game uses SmartFoxServer (SFS2X), NOT SignalR.

Connection Flow:
  1. Connect to: wss://app-prod.spribe.io/SmartFoxServer/WebSocket
     (or demo: wss://app-demo.spribe.io/SmartFoxServer/WebSocket)
  2. Send a Login SFS2X packet with operator name + token.
  3. Subscribe to the Aviator game zone/room.
  4. Listen for JSON event messages:
     - changeState     => round phase (betting / flying / crashed)
     - roundChartInfo  => current multiplier (live tick)
     - updateCurrentBets   => bets placed in current round
     - updateCurrentCashOuts => player cashouts
     - roundResult         => FINAL crash point (what we want!)

Auth:
  The session token comes from the casino URL query parameter:
  ?token=<JWT>&operator=<casino_name>&currency=<KES>
  YOU DO NOT NEED A PASSWORD. Just copy the URL of the Aviator game
  while you are logged into Sportpesa and paste the token param here.
"""

import websocket
import json
import threading
import time
import random
from typing import List, Dict, Optional
from collections import deque

# ─────────────────────────────────────────────
#  SmartFoxServer2X Message Builder
# ─────────────────────────────────────────────
def sfs_handshake() -> str:
    """SFS2X HandShake message that is sent immediately on connection."""
    return json.dumps({
        "c": "sys",
        "a": "handshake",
        "p": {"api": "1.7.12", "cl": "Unity:1.0.0", "gt": 0, "bin": False}
    }) + "\0"

def sfs_login(zone: str, user: str, token: str) -> str:
    """SFS2X Login packet - zone is the casino operator name."""
    return json.dumps({
        "c": "sys",
        "a": "login",
        "p": {"zn": zone, "un": user, "pw": token, "params": {}}
    }) + "\0"

def sfs_join_room(room_name: str) -> str:
    """Join the Aviator game room within the zone."""
    return json.dumps({
        "c": "sys",
        "a": "joinRoom",
        "p": {"r": room_name}
    }) + "\0"


class AviatorSFS2XScraper:
    """
    Production-grade Spribe Aviator scraper using SmartFoxServer protocol.
    
    Usage:
        scraper = AviatorSFS2XScraper()
        # Option A - Live: provide credentials from the casino URL
        scraper.connect(operator="sportpesa", token="<jwt_from_url>", user="<your_user_id>")
        # Option B - Simulation: no auth needed
        scraper.set_simulation(True)
    """

    # Spribe server endpoints
    PROD_WS  = "wss://app-prod.spribe.io/SmartFoxServer/WebSocket"
    DEMO_WS  = "wss://app-demo.spribe.io/SmartFoxServer/WebSocket"
    ROOM_NAME = "aviator_room"

    def __init__(self):
        self.ws: Optional[websocket.WebSocketApp] = None
        self.live_crashes: List[float] = []
        self.round_history: deque = deque(maxlen=500)
        self.current_multiplier: float = 1.0
        self.running: bool = False
        self.simulation_running: bool = False
        self.simulation_thread: Optional[threading.Thread] = None
        self.session_token: Optional[str] = None
        self.operator: str = "sportpesa"
        self.user_id: str = "player"

        # Callbacks so the Flask server can react to events
        self.on_crash_callback = None   # Called with float crash value
        self.on_tick_callback  = None   # Called with float multiplier each tick

    # ────────── PUBLIC API ──────────

    def connect(self, operator: str = None, token: str = None,
                user: str = None, demo: bool = False):
        """
        Connect to Spribe's SmartFoxServer.
        
        Args:
            operator: Casino operator name (e.g. 'sportpesa', 'betika').
                      Found in the Aviator game URL.
            token:    Session JWT from the Aviator game URL (?token=...).
            user:     Player username / ID.
            demo:     If True, connect to demo server (no real money).
        """
        if self.running:
            print("⚠️  Already connected. Call disconnect() first.")
            return

        if token:
            self.session_token = token
        if operator:
            self.operator = operator
        if user:
            self.user_id = user

        endpoint = self.DEMO_WS if demo else self.PROD_WS
        print(f"🔗 Connecting to Spribe SFS2X: {endpoint}")
        print(f"   Operator: {self.operator}  |  User: {self.user_id}")

        def _run():
            import ssl
            while True:
                try:
                    self.ws = websocket.WebSocketApp(
                        endpoint,
                        on_open=self._on_open,
                        on_message=self._on_message,
                        on_error=self._on_error,
                        on_close=self._on_close,
                        header={
                            "Origin": "https://aviator-next.spribegaming.com",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                          "AppleWebKit/537.36 Chrome/122.0 Safari/537.36"
                        }
                    )
                    self.ws.run_forever(
                        ping_interval=25,
                        ping_timeout=10,
                        sslopt={"cert_reqs": ssl.CERT_NONE}
                    )
                except Exception as e:
                    print(f"⚠️  Connection error: {e}")

                if not self.running:
                    break
                print("🔁 Reconnecting in 5s...")
                time.sleep(5)

        self.running = True
        threading.Thread(target=_run, daemon=True, name="SFS2X-Connection").start()

    def disconnect(self):
        """Cleanly stop the scraper connection."""
        self.running = False
        if self.ws:
            self.ws.close()
        print("🛑 Disconnected from Spribe SFS2X.")

    def add_manual_crash(self, crash: float):
        """Inject a crash point manually (from browser hook or manual UI entry)."""
        if crash < 1.0:
            return
        crash = round(crash, 2)
        print(f"📍 Manual crash injected: {crash}x")
        self._register_crash(crash, source="manual")

    def set_simulation(self, state: bool):
        """Toggle the simulation mode."""
        self.simulation_running = state
        if state and (not self.simulation_thread or not self.simulation_thread.is_alive()):
            self.simulation_thread = threading.Thread(
                target=self._simulation_loop, daemon=True, name="Simulation"
            )
            self.simulation_thread.start()
            print("🎮 Simulation STARTED  (generating realistic crash data)")
        elif not state:
            print("🛑 Simulation STOPPED.")

    def get_live_stats(self) -> Dict:
        """Returns real-time aggregated statistics."""
        crashes = list(self.live_crashes[-100:])
        if not crashes:
            return {
                "live_rounds": 0,
                "avg_crash": 0,
                "recent_10": [],
                "safe_80th": 0,
                "crash_streak": {"low_streak": False, "high_next": False},
                "pattern": "INSUFFICIENT_DATA",
                "current_multiplier": self.current_multiplier
            }

        sorted_crashes = sorted(crashes)
        return {
            "live_rounds": len(crashes),
            "avg_crash": round(sum(crashes) / len(crashes), 2),
            "recent_10": [round(x, 2) for x in crashes[-10:]],
            "safe_80th": round(sorted_crashes[int(0.8 * len(sorted_crashes))], 2),
            "crash_streak": self._detect_streak(crashes),
            "pattern": self._detect_pattern(crashes),
            "current_multiplier": round(self.current_multiplier, 2)
        }

    # ────────── SFS2X EVENT HANDLERS ──────────

    def _on_open(self, ws):
        print("✅ WebSocket opened — sending SFS2X handshake")
        ws.send(sfs_handshake())

    def _on_message(self, ws, raw_message: str):
        """Parse incoming SFS2X JSON messages."""
        # SFS2X messages are NUL-terminated; strip trailing \0
        for part in raw_message.split("\0"):
            part = part.strip()
            if not part:
                continue
            try:
                msg = json.loads(part)
                self._dispatch(ws, msg)
            except json.JSONDecodeError:
                pass  # Binary frames or malformed - ignore

    def _on_error(self, ws, error):
        print(f"❌ SFS2X error: {error}")

    def _on_close(self, ws, code, msg):
        print(f"🔌 WebSocket closed (code={code})")

    def _dispatch(self, ws, msg: dict):
        """Route an SFS2X message to the right handler."""
        cmd  = msg.get("c", "")   # channel: "sys" or "ext"
        action = msg.get("a", "")  # action / event name
        params = msg.get("p", {})

        # SFS2X sys events
        if cmd == "sys":
            if action == "handshake":
                print("🤝 Handshake OK — logging in")
                ws.send(sfs_login(self.operator, self.user_id,
                                  self.session_token or "demo"))

            elif action == "login":
                print(f"🔓 Login OK as {params.get('name', '?')} | zone: {params.get('zone', '?')}")
                ws.send(sfs_join_room(self.ROOM_NAME))

            elif action == "joinRoom":
                print(f"🏠 Joined room — listening for Aviator events")

        # SFS2X ext events (game events from Spribe)
        elif cmd == "ext":
            if action == "changeState":
                state = params.get("state", "")
                print(f"🔄 Round state → {state}")

            elif action == "roundChartInfo":
                # Live multiplier tick during flight
                multi = params.get("mult") or params.get("m") or params.get("multiplier")
                if multi:
                    self.current_multiplier = float(multi)
                    if self.on_tick_callback:
                        self.on_tick_callback(self.current_multiplier)

            elif action == "roundResult":
                # Final crash point for the finished round!
                crash = params.get("crashPoint") or params.get("crash") \
                     or params.get("mult") or params.get("m")
                if crash:
                    crash_f = round(float(crash), 2)
                    print(f"🎯 CRASH POINT: {crash_f}x")
                    self._register_crash(crash_f, source="live")

            elif action in ("updateCurrentBets", "updateCurrentCashOuts"):
                pass  # We don't need them for prediction, skip

    # ────────── INTERNAL HELPERS ──────────

    def _register_crash(self, crash: float, source: str = "live"):
        """Store a crash point and fire the callback."""
        self.live_crashes.append(crash)
        self.round_history.append({"crash": crash, "ts": time.time(), "source": source})

        if len(self.live_crashes) > 500:
            self.live_crashes = self.live_crashes[-500:]

        if self.on_crash_callback:
            self.on_crash_callback(crash)

    def _simulation_loop(self):
        """
        Generate realistic crash points using the same inverse-uniform
        distribution that real Aviator crash games use:
            P(crash < x) = 1 - 1/x   =>   x = 1/(1 - u)
        With a 1% house edge: x = floor(99/u) / 100
        """
        while self.simulation_running:
            wait = random.uniform(6, 15)   # Betting + flight time
            time.sleep(wait)
            u = random.random()
            # House-edge adjusted provably-fair distribution
            if u >= 0.99:
                crash = 1.0  # Instant crash (house wins)
            else:
                crash = round(1.0 / (1.0 - u) * 0.99, 2)
                crash = min(crash, 250.0)   # Cap at 250x

            self._register_crash(crash, source="sim")

    def _detect_streak(self, crashes: List[float]) -> Dict:
        recent = crashes[-5:]
        low = sum(1 for x in recent if x < 2.0)
        return {"low_streak": low >= 4, "high_next": low >= 3}

    def _detect_pattern(self, crashes: List[float]) -> str:
        if len(crashes) < 10:
            return "INSUFFICIENT_DATA"
        diffs = [crashes[i+1] - crashes[i] for i in range(len(crashes)-2, len(crashes)-11, -1) if i >= 0]
        avg = sum(diffs) / max(len(diffs), 1)
        if avg > 0.5:
            return "BULL_RUN"
        elif avg < -0.3:
            return "BEAR_PHASE"
        return "SIDEWAYS"