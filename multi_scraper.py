from typing import Dict, List, Optional
import threading
import time
import random
from sportpesa_scraper import AviatorSFS2XScraper

class BaseScraper:
    def __init__(self, provider_id: str):
        self.provider_id = provider_id
        self.on_crash_callback = None
        self.on_tick_callback = None

    def connect(self):
        pass

    def disconnect(self):
        pass

    def set_simulation(self, state: bool):
        pass


class SmartsoftScraper(BaseScraper):
    """
    Simulated implementation of a Smartsoft / JetX websocket.
    In production, this would connect to SignalR or Smartsoft specific WS.
    """
    def __init__(self):
        super().__init__(provider_id="smartsoft")
        self.running = False
        self.simulation_thread = None

    def connect(self, **kwargs):
        pass

    def set_simulation(self, state: bool):
        self.running = state
        if state and (not self.simulation_thread or not self.simulation_thread.is_alive()):
            self.simulation_thread = threading.Thread(
                target=self._sim_loop, daemon=True, name="Smartsoft-Sim"
            )
            self.simulation_thread.start()
            print(f"🎮 {self.provider_id} Simulation STARTED")

    def _sim_loop(self):
        """Generates crashes using a slightly different volatility curve for JetX"""
        while self.running:
            wait = random.uniform(5, 12)
            time.sleep(wait)
            u = random.random()
            if u >= 0.98: # JetX often has thicker 1.00x house edges
                crash = 1.0
            else:
                crash = round(1.0 / (1.0 - u) * 0.97, 2)
                crash = min(crash, 500.0) 
            
            if self.on_crash_callback:
                self.on_crash_callback(self.provider_id, crash)


class MultiExchangeAggregator:
    """
    Manages multiple concurrent WebSocket scrapers (Spribe, Smartsoft)
    and unifies their output into a normalized stream.
    """
    def __init__(self):
        self.scrapers: Dict[str, BaseScraper] = {}
        
        # Callbacks passed up to the main Flask engine
        self.global_crash_callback = None
        self.global_tick_callback = None

        # Initialize Spribe Scraper wrapper
        self.spribe = AviatorSFS2XScraper()
        self.spribe.on_crash_callback = lambda c: self._handle_crash("spribe", c)
        self.spribe.on_tick_callback = lambda m: self._handle_tick("spribe", m)
        self.scrapers["spribe"] = self.spribe

        # Initialize Smartsoft Scraper
        self.smartsoft = SmartsoftScraper()
        self.smartsoft.on_crash_callback = lambda p, c: self._handle_crash(p, c)
        self.smartsoft.on_tick_callback = lambda p, m: self._handle_tick(p, m)
        self.scrapers["smartsoft"] = self.smartsoft

    def connect_all(self, simulate=False):
        if simulate:
            for name, scraper in self.scrapers.items():
                scraper.set_simulation(True)
        else:
            print("Production multi-exchange connect not fully implemented - using simulation fallback.")
            self.connect_all(simulate=True)

    def _handle_crash(self, provider: str, crash: float):
        if self.global_crash_callback:
            self.global_crash_callback(provider, crash)

    def _handle_tick(self, provider: str, multiplier: float):
        if self.global_tick_callback:
            self.global_tick_callback(provider, multiplier)
