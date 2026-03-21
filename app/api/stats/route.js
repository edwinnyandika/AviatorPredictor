// app/api/stats/route.js
// Returns current crash stats and AI prediction — polled by dashboard
import { NextResponse } from 'next/server';
import { getHistory, store } from '@/lib/store';
import { predict } from '@/lib/predictor';

export async function GET() {
  const history = getHistory(200);
  const last100 = history.slice(-100);

  const stats = {
    totalRounds:   history.length,
    lastCrash:     store.lastCrash,
    lastUpdated:   store.lastUpdated,
    recent10:      history.slice(-10),
    avgCrash:      last100.length
      ? Math.round((last100.reduce((a, b) => a + b, 0) / last100.length) * 100) / 100
      : 0,
    safe80th:      percentile(last100, 80),
    prediction:    predict(history),
  };

  return NextResponse.json(stats, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * (sorted.length - 1))];
}
