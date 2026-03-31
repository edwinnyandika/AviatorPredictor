/**
 * /api/stream — SSE proxy to Render /stream
 * The frontend dashboard connects here; this forwards the Render SSE stream.
 * Uses ReadableStream to pass through events with zero buffering.
 */
import { NextRequest } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const upstream = await fetch(`${BACKEND}/stream`, {
    headers: { Accept: 'text/event-stream' },
    // @ts-ignore — duplex needed for streaming in Node fetch
    duplex: 'half',
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('upstream unavailable', { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
