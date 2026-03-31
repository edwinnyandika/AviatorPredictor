/**
 * /api/add — proxies to Render /add
 * Kept for backward compat. Interceptor now posts directly to Render.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-AviatorIQ-Secret",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AviatorIQ-Secret": req.headers.get("X-AviatorIQ-Secret") || "",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[/api/add]", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
