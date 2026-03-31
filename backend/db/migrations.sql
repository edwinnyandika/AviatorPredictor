-- ============================================================
-- AviatorIQ Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── sessions ──────────────────────────────────────────────────
create table if not exists sessions (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null,
  casino_id   text not null,
  started_at  timestamptz default now(),
  ended_at    timestamptz,
  round_count int default 0,
  avg_multiplier numeric(6,2),
  status      text default 'active'
);
create index if not exists sessions_user_casino_idx on sessions (user_id, casino_id);

-- ── casinos ───────────────────────────────────────────────────
create table if not exists casinos (
  id          text primary key,
  name        text not null,
  country     text not null,
  currency    text not null,
  logo_url    text,
  status      text default 'active',
  wss_pattern text
);

insert into casinos (id, name, country, currency, status) values
  ('sportpesa', 'SportPesa',  'Kenya', 'KES', 'active'),
  ('betika',    'Betika',     'Kenya', 'KES', 'active'),
  ('mozzart',   'Mozzart Bet','Kenya', 'KES', 'beta'),
  ('1xbet',     '1xBet',      'Kenya', 'KES', 'beta'),
  ('betway',    'Betway',     'Kenya', 'KES', 'beta'),
  ('odibets',   'OdiBets',    'Kenya', 'KES', 'coming_soon')
on conflict (id) do nothing;

-- ── alerts ────────────────────────────────────────────────────
create table if not exists alerts (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  casino_id  text not null,
  signal     text not null,
  message    text not null,
  severity   text default 'INFO',
  is_read    boolean default false,
  created_at timestamptz default now()
);
create index if not exists alerts_user_read_idx on alerts (user_id, is_read);

-- ── alter aviator_history ─────────────────────────────────────
alter table aviator_history add column if not exists casino_id   text default 'sportpesa';
alter table aviator_history add column if not exists user_id     text;
alter table aviator_history add column if not exists session_id  text;

-- ── realtime ─────────────────────────────────────────────────
-- Enable in Supabase Dashboard → Database → Replication
-- Tables: aviator_history, alerts
-- (Cannot be done via SQL — do it in the UI)

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Service role bypasses RLS (backend uses service key — fine)
-- Anon/authenticated roles are blocked by these policies

alter table aviator_history enable row level security;
alter table sessions enable row level security;
alter table alerts enable row level security;

-- Block all direct client access (backend service key bypasses this)
create policy "No direct client access on rounds"
  on aviator_history for all
  using (false);

create policy "No direct client access on sessions"
  on sessions for all
  using (false);

create policy "No direct client access on alerts"
  on alerts for all
  using (false);

-- casinos table is read-only public
alter table casinos enable row level security;
create policy "Anyone can read casinos"
  on casinos for select
  using (true);

