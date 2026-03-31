/**
 * /api/stats — proxies to Render /stats
 * The interceptor POSTs directly to Render, so stats come from Render/Supabase.
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
    const res = await fetch(`${BACKEND}/stats?${params}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'Backend error' }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/stats]', err);
    return NextResponse.json({ error: 'Unreachable backend' }, { status: 502 });
  }
}
