/**
 * /api/casinos — proxies to Render /casino/list
 * Returns all supported casinos for the casino selector UI.
 */
import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/casino/list`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ casinos: [] }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error('[/api/casinos]', err);
    return NextResponse.json({ casinos: [] }, { status: 502 });
  }
}
