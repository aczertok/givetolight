-- Messages sent from the dashboard (Compose message, Send donor list, recovery emails) and who received them.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campaign_id uuid references campaigns(id) on delete set null,
  kind text not null default 'compose',          -- compose | donor_list | recovery
  recipient_type text not null default 'donors', -- donors | ambassadors
  channel text not null default 'email',
  subject text not null default '',
  body text not null default '',
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  sent_by uuid references auth.users(id) on delete set null
);
create table if not exists message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  name text, email text, phone text,
  status text not null default 'sent',           -- sent | failed | skipped
  provider_id text, error text,
  created_at timestamptz not null default now()
);
create index if not exists message_recipients_msg on message_recipients(message_id);
alter table messages enable row level security;
alter table message_recipients enable row level security;
create policy admin_all_messages on messages for all using (is_admin()) with check (is_admin());
create policy admin_all_message_recipients on message_recipients for all using (is_admin()) with check (is_admin());
alter table checkout_starts add column if not exists recovery_sent_at timestamptz;
