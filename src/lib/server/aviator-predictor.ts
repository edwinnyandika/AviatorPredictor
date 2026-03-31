export type PredictionResult = {
  safe_cashout: number;
  risk_level: 'LOW' | 'NEUTRAL' | 'HIGH';
  confidence: number;
  signals: string[];
  next_crash_range: [number, number];
  bet_recommendation: 'WAIT' | 'SMALL_BET' | 'NO_BET' | 'FULL_BET' | 'HOLD';
  provider: string;
  multi_timeframe: {
    ema: Record<'10' | '50' | '200', number>;
    rsi: Record<'10' | '50' | '200', number>;
  };
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[]) {
  if (!values.length) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function ema(values: number[], periods: number) {
  if (!values.length) return 1;
  if (values.length < periods) return average(values);

  const multiplier = 2 / (periods + 1);
  let current = average(values.slice(0, periods));

  for (const value of values.slice(periods)) {
    current = (value - current) * multiplier + current;
  }

  return current;
}

function rsi(values: number[], periods: number) {
  if (values.length <= periods) return 50;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let index = 1; index < values.length; index += 1) {
    const diff = values[index] - values[index - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  const avgGain = average(gains.slice(-periods));
  const avgLoss = average(losses.slice(-periods));
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function analyzeStreak(values: number[]) {
  const low_streak = values.filter((value) => value < 2).length;
  const high_streak = values.filter((value) => value > 5).length;
  return { low_streak, high_streak };
}

function detectCycle(values: number[]) {
  if (values.length < 10) return 'INSUFFICIENT';

  const xMean = (values.length - 1) / 2;
  const yMean = average(values);
  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });

  const trend = denominator === 0 ? 0 : numerator / denominator;
  const deltas = values.slice(1).map((value, index) => value - values[index]);
  const volatility = standardDeviation(deltas);

  if (trend > 0.1 && volatility < 0.5) return 'RECOVERY';
  if (trend < -0.1 && volatility > 1.0) return 'PEAK';
  return 'SIDEWAYS';
}

function defaultPrediction(): PredictionResult {
  return {
    safe_cashout: 1.8,
    risk_level: 'NEUTRAL',
    confidence: 0.65,
    signals: ['NEED 20 TICKS MINIMUM'],
    next_crash_range: [1.2, 3.5],
    bet_recommendation: 'WAIT',
    provider: 'unknown',
    multi_timeframe: {
      ema: { '10': 0, '50': 0, '200': 0 },
      rsi: { '10': 50, '50': 50, '200': 50 },
    },
  };
}

export function predictFromHistory(crashes: number[], provider = 'spribe'): PredictionResult {
  if (crashes.length < 20) return defaultPrediction();

  const tf10Ema = ema(crashes, 10);
  const tf50Ema = ema(crashes, 50);
  const tf200Ema = ema(crashes, 200);
  const tf10Rsi = rsi(crashes, 10);
  const tf50Rsi = rsi(crashes, 50);
  const tf200Rsi = rsi(crashes, 200);

  const validForGeo = crashes.filter((value) => value > 1);
  const geometricMean = validForGeo.length
    ? Math.exp(average(validForGeo.map((value) => Math.log(value))))
    : 1.5;

  const prediction: PredictionResult = {
    safe_cashout: Math.max(1.2, ((geometricMean * 0.4) + (tf10Ema * 0.35) + (tf50Ema * 0.25)) * 0.78),
    risk_level: 'LOW',
    confidence: 0,
    signals: [],
    next_crash_range: [0, 0],
    bet_recommendation: 'HOLD',
    provider,
    multi_timeframe: {
      ema: {
        '10': Number(tf10Ema.toFixed(2)),
        '50': Number(tf50Ema.toFixed(2)),
        '200': Number(tf200Ema.toFixed(2)),
      },
      rsi: {
        '10': Number(tf10Rsi.toFixed(2)),
        '50': Number(tf50Rsi.toFixed(2)),
        '200': Number(tf200Rsi.toFixed(2)),
      },
    },
  };

  if (tf10Rsi > 70 && tf50Rsi > 60) {
    prediction.safe_cashout *= 0.75;
    prediction.signals.push('MACRO OVERBOUGHT (RSI) - EXTREME RISK');
    prediction.risk_level = 'HIGH';
  } else if (tf10Rsi < 30 && tf50Rsi < 40) {
    prediction.safe_cashout *= 1.3;
    prediction.signals.push('MACRO OVERSOLD (RSI) - PRIME ENTRY');
    prediction.risk_level = 'LOW';
  }

  const streak = analyzeStreak(crashes.slice(-10));
  if (streak.low_streak >= 4) {
    prediction.safe_cashout = Math.min(prediction.safe_cashout, 1.8);
    prediction.signals.push('LOW STREAK - CASH EARLY');
    prediction.risk_level = 'HIGH';
  } else if (streak.high_streak >= 2) {
    prediction.safe_cashout = Math.max(prediction.safe_cashout, 2.5);
    prediction.signals.push('HIGH STREAK - RIDE');
  }

  const cycle = detectCycle(crashes.slice(-20));
  if (cycle === 'RECOVERY') {
    prediction.safe_cashout *= 1.15;
    prediction.signals.push('RECOVERY PHASE');
  } else if (cycle === 'PEAK') {
    prediction.safe_cashout *= 0.85;
    prediction.signals.push('PEAK WARNING');
  }

  const recentVelocityValues = crashes.slice(-5).map((value, index, recent) => {
    const baseIndex = crashes.length - recent.length + index;
    return value - crashes[baseIndex - 1];
  });
  const recentVelocity = average(recentVelocityValues);

  if (recentVelocity > 0.4) prediction.signals.push('MOMENTUM UP');
  else if (recentVelocity < -0.3) prediction.signals.push('MOMENTUM DOWN');

  const trendAligned = (tf10Ema > tf50Ema && tf50Ema > tf200Ema) || (tf10Ema < tf50Ema && tf50Ema < tf200Ema);
  const baseConfidence = trendAligned ? 0.85 : 0.65;
  prediction.confidence = Number((baseConfidence + Math.abs(recentVelocity) * 0.1).toFixed(2));

  const stdDev = standardDeviation(crashes.slice(-10));
  prediction.next_crash_range = [
    Math.max(1.0, Number((prediction.safe_cashout - stdDev).toFixed(1))),
    Number((prediction.safe_cashout + (stdDev * 1.5)).toFixed(1)),
  ];

  if (prediction.safe_cashout < 1.5) prediction.bet_recommendation = 'SMALL_BET';
  else if (prediction.risk_level === 'HIGH') prediction.bet_recommendation = 'NO_BET';
  else prediction.bet_recommendation = 'FULL_BET';

  prediction.safe_cashout = Number(prediction.safe_cashout.toFixed(2));
  return prediction;
}
