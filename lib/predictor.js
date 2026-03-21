/**
 * lib/predictor.js
 * JavaScript port of the Python AI prediction engine.
 * Implements: Geometric Mean, EMA, RSI, Streak Detection, Cycle Analysis.
 */

/** Exponential Moving Average */
function ema(values, periods) {
  if (values.length < periods) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  const k = 2 / (periods + 1);
  let e = values.slice(0, periods).reduce((a, b) => a + b, 0) / periods;
  for (const v of values.slice(periods)) e = (v - e) * k + e;
  return e;
}

/** Relative Strength Index */
function rsi(values, periods = 14) {
  if (values.length <= periods) return 50;
  const gains = [], losses = [];
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? Math.abs(d) : 0);
  }
  const avgGain = gains.slice(-periods).reduce((a, b) => a + b, 0) / periods;
  const avgLoss = losses.slice(-periods).reduce((a, b) => a + b, 0) / periods;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Geometric mean of an array of values > 1 */
function geometricMean(values) {
  const logs = values.filter(v => v > 1).map(v => Math.log(v));
  if (!logs.length) return 1.5;
  return Math.exp(logs.reduce((a, b) => a + b, 0) / logs.length);
}

/** Detect low/high streaks */
function analyzeStreak(last10) {
  const low  = last10.filter(c => c < 2.0).length;
  const high = last10.filter(c => c > 5.0).length;
  return { lowStreak: low, highStreak: high };
}

/** Detect trend cycle */
function detectCycle(last20) {
  if (last20.length < 10) return 'SIDEWAYS';
  // Simple linear regression slope
  const n = last20.length;
  const xMean = (n - 1) / 2;
  const yMean = last20.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (last20[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  // Standard deviation of differences
  const diffs = last20.slice(1).map((v, i) => v - last20[i]);
  const vol   = Math.sqrt(diffs.map(d => d * d).reduce((a, b) => a + b, 0) / diffs.length);
  if (slope > 0.1 && vol < 0.5)  return 'RECOVERY';
  if (slope < -0.1 && vol > 1.0) return 'PEAK';
  return 'SIDEWAYS';
}

/** Full Kelly Criterion bet sizing */
function kellyBet(crashes, target) {
  if (crashes.length < 10) return 0.02;
  const wins = crashes.filter(c => c >= target).length;
  const p    = wins / crashes.length;
  const b    = target - 1;
  if (b <= 0) return 0;
  const kelly = (b * p - (1 - p)) / b;
  // Quarter-Kelly for safety
  return Math.max(0, Math.min(kelly * 0.25, 0.05));
}

/**
 * Main prediction function.
 * @param {number[]} crashes - Array of recent crash multipliers
 * @returns {Object} prediction result
 */
export function predict(crashes) {
  const DEFAULT = {
    safeCashout: 1.8,
    riskLevel: 'NEUTRAL',
    confidence: 0.65,
    signals: ['Need at least 20 rounds of data'],
    nextRange: [1.2, 3.5],
    betRecommendation: 'WAIT',
    rsi: 50,
    ema10: 0,
    kellySizing: '2%',
  };

  if (crashes.length < 20) return DEFAULT;

  const signals = [];
  let safeCashout;
  let riskLevel = 'LOW';

  // ── 1. Geometric + EMA blend ──────────────────────
  const geoMean  = geometricMean(crashes);
  const ema10    = ema(crashes, 10);
  const blended  = geoMean * 0.6 + ema10 * 0.4;
  safeCashout    = Math.max(1.2, blended * 0.78);

  // ── 2. RSI indicator ─────────────────────────────
  const rsiVal = rsi(crashes, 14);
  if (rsiVal > 70) {
    safeCashout *= 0.8;
    signals.push('📉 OVERBOUGHT (RSI>70) — HIGH RISK');
    riskLevel = 'HIGH';
  } else if (rsiVal < 30) {
    safeCashout *= 1.25;
    signals.push('📈 OVERSOLD (RSI<30) — PRIME ENTRY');
    riskLevel = 'LOW';
  }

  // ── 3. Streak detection ───────────────────────────
  const { lowStreak, highStreak } = analyzeStreak(crashes.slice(-10));
  if (lowStreak >= 4) {
    safeCashout = Math.min(safeCashout, 1.8);
    signals.push('🔴 LOW STREAK — CASH OUT EARLY');
    riskLevel = 'HIGH';
  } else if (highStreak >= 2) {
    safeCashout = Math.max(safeCashout, 2.5);
    signals.push('🟢 HIGH STREAK — RIDE THE WAVE');
  }

  // ── 4. Cycle analysis ─────────────────────────────
  const cycle = detectCycle(crashes.slice(-20));
  if (cycle === 'RECOVERY') {
    safeCashout *= 1.15;
    signals.push('📈 RECOVERY PHASE DETECTED');
  } else if (cycle === 'PEAK') {
    safeCashout *= 0.85;
    signals.push('📉 PEAK WARNING — RISK RISING');
    riskLevel = 'HIGH';
  }

  // ── 5. Momentum ───────────────────────────────────
  const velocity = crashes.slice(-5).reduce((acc, v, i, a) =>
    i === 0 ? acc : acc + (v - a[i - 1]), 0) / 4;
  if (velocity > 0.4)       signals.push('🚀 MOMENTUM UP');
  else if (velocity < -0.3) signals.push('💥 MOMENTUM DOWN');

  // ── 6. Confidence ─────────────────────────────────
  let confidence = 0.75;
  if (crashes.length > 50)  confidence += 0.12;
  if (crashes.length > 100) confidence += 0.08;
  confidence = Math.min(confidence + Math.abs(velocity) * 0.05, 0.99);

  // ── 7. Range prediction ───────────────────────────
  const last10   = crashes.slice(-10);
  const mean10   = last10.reduce((a, b) => a + b, 0) / last10.length;
  const std10    = Math.sqrt(last10.map(v => (v - mean10) ** 2).reduce((a, b) => a + b, 0) / last10.length);

  // ── 8. Bet recommendation + Kelly ────────────────
  const targetCashout = Math.round(safeCashout * 10) / 10;
  const kelly  = kellyBet(crashes, targetCashout);
  let betRec;
  if (safeCashout < 1.5 || riskLevel === 'HIGH') betRec = 'SKIP';
  else if (safeCashout >= 2.5)                    betRec = 'FULL_BET';
  else                                             betRec = 'HALF_BET';

  return {
    safeCashout:      Math.round(safeCashout * 100) / 100,
    riskLevel,
    confidence:       Math.round(confidence * 100) / 100,
    signals,
    nextRange:        [
      Math.max(1.0, Math.round((safeCashout - std10) * 10) / 10),
      Math.round((safeCashout + std10 * 1.5) * 10) / 10,
    ],
    betRecommendation: betRec,
    rsi:               Math.round(rsiVal * 10) / 10,
    ema10:             Math.round(ema10 * 100) / 100,
    kellySizing:       `${Math.round(kelly * 100)}%`,
    cycle,
    dataPoints:        crashes.length,
  };
}
