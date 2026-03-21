import numpy as np
from typing import List, Dict
from collections import deque
import statistics

class RealAviatorPredictor:
    """REAL multi-exchange prediction using multi-timeframe patterns + math"""
    
    def __init__(self):
        # We maintain isolated crash buffers for each provider to prevent data contamination
        self.provider_buffers = {} 
        self.streak_detector = StreakAnalyzer()
        self.cycle_detector = CycleAnalyzer()
        self.ema_detector = EMAAnalyzer()
        self.rsi_detector = RSIAnalyzer()
    
    def update(self, provider: str, new_crash: float):
        """Feed live crash data from a specific provider"""
        if provider not in self.provider_buffers:
            self.provider_buffers[provider] = deque(maxlen=200) # Increased to 200 for long-term TFs
        self.provider_buffers[provider].append(new_crash)
    
    def predict(self, provider: str = "spribe") -> Dict:
        """Main prediction algorithm for a specific provider timeline"""
        if provider not in self.provider_buffers or len(self.provider_buffers[provider]) < 20:
            return self._default_prediction()
        
        crashes = list(self.provider_buffers[provider])
        
        prediction = {
            "safe_cashout": 0,
            "risk_level": "LOW",
            "confidence": 0.0,
            "signals": [],
            "next_crash_range": [0, 0],
            "bet_recommendation": "HOLD",
            "provider": provider,
            "multi_timeframe": {
                "ema": {},
                "rsi": {}
            }
        }
        
        # ── MULTI-TIMEFRAME ANALYSIS ──
        # Calculate EMA across 3 periods: 10 (Fast), 50 (Med), 200 (Macro)
        tf_10_ema = self.ema_detector.calculate(crashes, 10)
        tf_50_ema = self.ema_detector.calculate(crashes, 50)
        tf_200_ema = self.ema_detector.calculate(crashes, 200)
        
        prediction["multi_timeframe"]["ema"] = {
            "10": round(tf_10_ema, 2),
            "50": round(tf_50_ema, 2),
            "200": round(tf_200_ema, 2)
        }
        
        # Calculate RSI across 3 periods
        tf_10_rsi = self.rsi_detector.calculate(crashes, 10)
        tf_50_rsi = self.rsi_detector.calculate(crashes, 50)
        tf_200_rsi = self.rsi_detector.calculate(crashes, 200)
        
        prediction["multi_timeframe"]["rsi"] = {
            "10": round(tf_10_rsi, 2),
            "50": round(tf_50_rsi, 2),
            "200": round(tf_200_rsi, 2)
        }

        # ── GEOMETRIC BASELINE ──
        geometric_mean = np.exp(np.mean([np.log(c) for c in crashes if c > 1]))
        
        # Blend geometric with weighted Multi-Timeframe EMA (favoring fast momentum slightly)
        base_prediction = (geometric_mean * 0.4) + (tf_10_ema * 0.35) + (tf_50_ema * 0.25)
        prediction["safe_cashout"] = max(1.2, base_prediction * 0.78)
        
        # ── MULTI-RSI INDICATOR LOGIC ──
        # If both fast and medium RSI are overbought, aggressive dump warning
        if tf_10_rsi > 70 and tf_50_rsi > 60:
            prediction["safe_cashout"] *= 0.75
            prediction["signals"].append("📉 MACRO OVERBOUGHT (RSI) - EXTREME RISK")
            prediction["risk_level"] = "HIGH"
        elif tf_10_rsi < 30 and tf_50_rsi < 40:
            prediction["safe_cashout"] *= 1.3
            prediction["signals"].append("📈 MACRO OVERSOLD (RSI) - PRIME ENTRY")
            prediction["risk_level"] = "LOW"
            
        # ── STREAK DETECTION ──
        streak_data = self.streak_detector.analyze(crashes[-10:])
        if streak_data["low_streak"] >= 4:
            prediction["safe_cashout"] = min(prediction["safe_cashout"], 1.8)
            prediction["signals"].append("🔴 LOW STREAK - CASH EARLY")
            prediction["risk_level"] = "HIGH"
        elif streak_data["high_streak"] >= 2:
            prediction["safe_cashout"] = max(prediction["safe_cashout"], 2.5)
            prediction["signals"].append("🟢 HIGH STREAK - RIDE")
        
        # ── CYCLE DETECTION ──
        cycle = self.cycle_detector.detect(crashes[-20:])
        if cycle == "RECOVERY":
            prediction["safe_cashout"] *= 1.15
            prediction["signals"].append("📈 RECOVERY PHASE")
        elif cycle == "PEAK":
            prediction["safe_cashout"] *= 0.85
            prediction["signals"].append("📉 PEAK WARNING")
        
        # ── MOMENTUM (velocity of crashes) ──
        recent_velocity = np.mean([crashes[i] - crashes[i-1] for i in range(-5, 0)])
        if recent_velocity > 0.4:
            prediction["signals"].append("🚀 MOMENTUM UP")
        elif recent_velocity < -0.3:
            prediction["signals"].append("💥 MOMENTUM DOWN")
        
        # ── CONFIDENCE SCORING ──
        # Confidence increases if all 3 timeframes are aligned
        trend_aligned = (tf_10_ema > tf_50_ema > tf_200_ema) or (tf_10_ema < tf_50_ema < tf_200_ema)
        base_conf = 0.85 if trend_aligned else 0.65
        prediction["confidence"] = round(base_conf + abs(recent_velocity) * 0.1, 2)
        
        # ── RANGE PREDICTION ──
        std_dev = np.std(crashes[-10:])
        prediction["next_crash_range"] = [
            max(1.0, round(prediction["safe_cashout"] - std_dev, 1)),
            round(prediction["safe_cashout"] + std_dev * 1.5, 1)
        ]
        
        # ── BET RECOMMENDATION ──
        if prediction["safe_cashout"] < 1.5:
            prediction["bet_recommendation"] = "SMALL_BET"
        elif prediction["risk_level"] == "HIGH":
            prediction["bet_recommendation"] = "NO_BET"
        else:
            prediction["bet_recommendation"] = "FULL_BET"
        
        prediction["safe_cashout"] = round(prediction["safe_cashout"], 2)
        
        return prediction
    
    def _default_prediction(self) -> Dict:
        return {
            "safe_cashout": 1.8,
            "risk_level": "NEUTRAL",
            "confidence": 0.65,
            "signals": ["NEED 20 TICKS MINIMUM"],
            "next_crash_range": [1.2, 3.5],
            "bet_recommendation": "WAIT",
            "provider": "unknown",
            "multi_timeframe": {
                "ema": {"10": 0, "50": 0, "200": 0},
                "rsi": {"10": 50, "50": 50, "200": 50}
            }
        }

class StreakAnalyzer:
    def analyze(self, crashes: List[float]) -> Dict:
        low_count = sum(1 for c in crashes if c < 2.0)
        high_count = sum(1 for c in crashes if c > 5.0)
        return {
            "low_streak": low_count,
            "high_streak": high_count,
            "balanced": abs(low_count - high_count) <= 1
        }

class CycleAnalyzer:
    def detect(self, crashes: List[float]) -> str:
        if len(crashes) < 10:
            return "INSUFFICIENT"
        
        trend = np.polyfit(range(len(crashes)), crashes, 1)[0]
        volatility = np.std(np.diff(crashes))
        
        if trend > 0.1 and volatility < 0.5:
            return "RECOVERY"
        elif trend < -0.1 and volatility > 1.0:
            return "PEAK"
        else:
            return "SIDEWAYS"

class EMAAnalyzer:
    def calculate(self, crashes: List[float], periods: int = 10) -> float:
        if len(crashes) < periods:
            return sum(crashes) / len(crashes) if crashes else 1.0
        
        multiplier = 2 / (periods + 1)
        ema = sum(crashes[:periods]) / periods
        
        for price in crashes[periods:]:
            ema = (price - ema) * multiplier + ema
        return ema

class RSIAnalyzer:
    def calculate(self, crashes: List[float], periods: int = 14) -> float:
        if len(crashes) <= periods:
            return 50.0
            
        gains = []
        losses = []
        
        for i in range(1, len(crashes)):
            diff = crashes[i] - crashes[i-1]
            if diff > 0:
                gains.append(diff)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(diff))
                
        avg_gain = sum(gains[-periods:]) / periods
        avg_loss = sum(losses[-periods:]) / periods
        
        if avg_loss == 0:
            return 100.0
            
        rs = avg_gain / avg_loss
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return rsi