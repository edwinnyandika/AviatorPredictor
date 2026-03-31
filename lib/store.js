/**
 * lib/store.js
 * In-memory crash data store using a global singleton.
 * Works in Next.js dev + single-instance Vercel functions.
 * For multi-region scale: swap out with Vercel KV (see bottom comment).
 */

const g = globalThis;
const encoder = new TextEncoder();

if (!g.__aviatorStore) {
  g.__aviatorStore = {
    crashes: [],          // Array of { crash: float, ts: number, source: string }
    lastCrash: null,
    lastUpdated: Date.now(),
    subscribers: [],      // SSE response objects
  };
}

export const store = g.__aviatorStore;

/** Add a crash point (max 500 entries) */
export function addCrash(crash, source = 'live') {
  const entry = { crash: Math.round(parseFloat(crash) * 100) / 100, ts: Date.now(), source };
  store.crashes.push(entry);
  store.lastCrash = entry.crash;
  store.lastUpdated = Date.now();
  if (store.crashes.length > 500) store.crashes = store.crashes.slice(-500);
  return entry;
}

/** Get last N structured crash entries */
export function getCrashEntries(n = 100) {
  return store.crashes.slice(-n);
}

/** Get last N crash values as plain floats */
export function getHistory(n = 100) {
  return store.crashes.slice(-n).map(e => e.crash);
}

/** Broadcast to all SSE subscribers */
export function broadcast(event, data) {
  const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  store.subscribers = store.subscribers.filter(ctrl => {
    try { ctrl.enqueue(payload); return true; } catch { return false; }
  });
}

/*
 * ─── VERCEL KV UPGRADE PATH ────────────────────────────────────────────
 * When you're ready for multi-region production:
 *
 * 1. In Vercel dashboard → Storage → Create KV Store → link to project
 * 2. npm install @vercel/kv
 * 3. Replace addCrash() / getHistory() with:
 *
 *    import { kv } from '@vercel/kv';
 *    await kv.lpush('crashes', JSON.stringify(entry));
 *    const raw = await kv.lrange('crashes', 0, 99);
 *    return raw.map(r => JSON.parse(r).crash);
 * ───────────────────────────────────────────────────────────────────────
 */
