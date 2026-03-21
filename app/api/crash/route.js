// app/api/crash/route.js
// Receives crash data from the Tampermonkey interceptor
import { NextResponse } from 'next/server';
import { addCrash, getHistory, broadcast } from '@/lib/store';
import { predict } from '@/lib/predictor';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const multiplier = parseFloat(body.multiplier ?? body.crash ?? 0);

    if (!multiplier || multiplier < 1.0) {
      return NextResponse.json({ error: 'Invalid multiplier' }, { status: 400 });
    }

    const entry   = addCrash(multiplier, body.source || 'live');
    const history = getHistory(200);
    const pred    = predict(history);

    // Push to all connected SSE dashboard clients
    broadcast('crash', { crash: entry.crash, ts: entry.ts, prediction: pred });

    return NextResponse.json(
      { status: 'ok', crash: entry.crash, prediction: pred },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[/api/crash]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
