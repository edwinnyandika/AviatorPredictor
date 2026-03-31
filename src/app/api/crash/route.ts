/**
 * /api/crash — DEPRECATED
 * The interceptor now POSTs directly to Render /add.
 * This route kept for backwards compat — returns a redirect hint.
 */
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-AviatorIQ-Secret',
    },
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. The interceptor script should POST directly to the Render backend /add endpoint.',
      migration: 'Update your script: set BACKEND_URL to your Render URL (e.g. https://your-app.onrender.com)',
    },
    { status: 410 }
  );
}
