export type HistoryEntry = {
  id: number | string;
  provider: string;
  crash: number;
  source: string;
  created_at: string;
};

type NewHistoryEntry = {
  provider?: string;
  crash: number;
  source?: string;
};

const tableName = process.env.SUPABASE_HISTORY_TABLE || 'aviator_history';
const globalStore = globalThis as typeof globalThis & {
  __aviatorHistoryFallback?: HistoryEntry[];
};

function getFallbackStore() {
  if (!globalStore.__aviatorHistoryFallback) globalStore.__aviatorHistoryFallback = [];
  return globalStore.__aviatorHistoryFallback;
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function requestSupabase(path: string, init?: RequestInit) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...supabaseHeaders(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function addHistoryEntry(entry: NewHistoryEntry) {
  const payload = {
    provider: entry.provider || 'spribe',
    crash: Number(entry.crash.toFixed(2)),
    source: entry.source || 'manual',
  };

  if (hasSupabaseConfig()) {
    const rows = await requestSupabase(`${tableName}`, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(payload),
    });

    return (rows as HistoryEntry[])[0];
  }

  const fallbackEntry: HistoryEntry = {
    id: Date.now(),
    created_at: new Date().toISOString(),
    ...payload,
  };

  const store = getFallbackStore();
  store.push(fallbackEntry);
  return fallbackEntry;
}

export async function getHistoryEntries(provider = 'spribe', limit = 200) {
  if (hasSupabaseConfig()) {
    const params = new URLSearchParams({
      select: 'id,provider,crash,source,created_at',
      provider: `eq.${provider}`,
      order: 'created_at.desc',
      limit: String(limit),
    });

    return (await requestSupabase(`${tableName}?${params.toString()}`)) as HistoryEntry[];
  }

  return getFallbackStore()
    .filter((entry) => entry.provider === provider)
    .slice(-limit)
    .reverse();
}

export async function getCrashHistory(provider = 'spribe', limit = 200) {
  const entries = await getHistoryEntries(provider, limit);
  return [...entries].reverse().map((entry) => entry.crash);
}
