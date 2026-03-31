/**
 * /api/casino/script/[casinoId] — proxies to Render /casino/script/{id}
 * Returns the generated console script for a specific casino.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { casinoId: string } }
) {
  try {
    const res = await fetch(`${BACKEND}/casino/script/${params.casinoId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[/api/casino/script]', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
