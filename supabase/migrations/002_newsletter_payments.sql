-- ================================================================
-- MAXIMS INTERIORS — MIGRATION 002
-- Newsletter subscribers + payment transactions
-- Run AFTER 001_schema.sql in the Supabase SQL Editor.
-- ================================================================

-- ── ENUMS ───────────────────────────────────────────────────────
do $$ begin
  create type newsletter_status as enum ('subscribed','unsubscribed','bounced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_status as enum ('pending','success','failed','abandoned','refunded');
exception when duplicate_object then null; end $$;

-- ================================================================
-- NEWSLETTER SUBSCRIBERS
-- ================================================================
create table if not exists newsletter_subscribers (
  id          uuid default uuid_generate_v4() primary key,
  email       text unique not null,
  name        text,
  source      text default 'website',        -- footer | contact | checkout …
  status      newsletter_status default 'subscribed',
  welcomed_at timestamptz,                    -- set by send-newsletter-welcome
  created_at  timestamptz default now()
);

-- ================================================================
-- TRANSACTIONS (Squad / Paystack)
-- Reference is the unique payment ref we generate per attempt.
-- The verify Edge Function is the ONLY writer of `status = success`.
-- ================================================================
create table if not exists transactions (
  id              uuid default uuid_generate_v4() primary key,
  reference       text unique not null,
  provider        text not null default 'squad',   -- 'squad' | 'paystack'
  order_id        uuid references orders(id) on delete set null,
  customer_name   text,
  customer_email  text not null,
  customer_phone  text,
  amount          numeric(12,2) not null,          -- in Naira
  currency        text default 'NGN',
  status          txn_status default 'pending',
  channel         text,                            -- card | bank | transfer …
  gateway_response text,
  metadata        jsonb default '{}',
  paid_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_txn_status   on transactions(status);
create index if not exists idx_txn_email    on transactions(customer_email);
create index if not exists idx_txn_created  on transactions(created_at desc);

create trigger trg_txn_upd before update on transactions
  for each row execute procedure set_updated_at();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
alter table newsletter_subscribers enable row level security;
alter table transactions            enable row level security;

-- Newsletter: anyone may subscribe (insert); only staff can read/manage.
create policy "Anyone subscribes"        on newsletter_subscribers for insert with check (true);
create policy "Staff reads subscribers"  on newsletter_subscribers for select using (is_staff());
create policy "Owner manages subscribers" on newsletter_subscribers for all   using (my_role() = 'owner');

-- Transactions: clients can create a pending row when checkout starts.
-- Reads/updates are staff-only. The Edge Function uses the service role
-- (which bypasses RLS) to flip status after verifying with the gateway —
-- so the public anon key can never mark a transaction as paid.
create policy "Anyone starts a txn"      on transactions for insert with check (true);
create policy "Staff reads txns"         on transactions for select using (is_staff());
create policy "Owner+shop manage txns"   on transactions for update using (my_role() in ('owner','shop_manager'));

-- ================================================================
-- REALTIME
-- ================================================================
alter publication supabase_realtime add table transactions;

-- newsletter realtime is optional; uncomment if you want live admin updates
-- alter publication supabase_realtime add table newsletter_subscribers;
