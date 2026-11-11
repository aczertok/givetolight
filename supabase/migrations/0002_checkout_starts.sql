-- Every checkout that is started, so staff can see donations that were begun but never finished.
create table if not exists checkout_starts (
  id uuid primary key default gen_random_uuid(),
  session_id text unique,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  ambassador_id uuid references ambassadors(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  donor_name text,
  donor_email text,
  donor_phone text,
  amount numeric(12,2),
  plan text,
  method text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists checkout_starts_campaign on checkout_starts(campaign_id, created_at desc);
alter table checkout_starts enable row level security;
create policy admin_all_checkout_starts on checkout_starts for all using (is_admin()) with check (is_admin());
