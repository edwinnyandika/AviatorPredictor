/**
 * /api/history — proxies to Render /data/history
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const casinoId = searchParams.get('casino_id') || '';
  const limit = searchParams.get('limit') || '200';

  const params = new URLSearchParams();
  if (casinoId) params.set('casino_id', casinoId);
  params.set('limit', limit);

  try {
    const res = await fetch(`${BACKEND}/data/history?${params}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ history: [] }, { status: res.status });
    const data = await res.json();
    // Normalize: Render returns { items, connected }, dashboard expects { history }
    return NextResponse.json({
      history: data.items || [],
      connected: data.connected ?? true,
    });
  } catch (err) {
    console.error('[/api/history]', err);
    return NextResponse.json({ history: [], connected: false }, { status: 502 });
  }
}
