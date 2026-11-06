-- Give to Light: database schema
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- Public visitors only ever read the *_public views (no emails, phones or private notes).
-- Writes from the website server use the service-role key, which bypasses these rules.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- admins
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- campaigns
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null,
  kind text not null default 'other',            -- hike | volleyball | other
  year int,
  tagline text,
  story text,                                    -- plain text, paragraphs split on blank lines
  cover_url text,
  goal numeric(12,2),
  match_multiplier numeric(4,2) not null default 1,  -- 2 = every $1 becomes $2
  match_cap numeric(12,2),                       -- total pledged by matchers (null = no cap)
  match_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','live','ended')),
  show_on_home boolean not null default true,
  ambassador_approval boolean not null default true,
  preset_amounts int[] not null default '{36,180,360,1000,1800}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  name text not null,
  goal numeric(12,2),
  blurb text,
  photo_url text,
  created_at timestamptz not null default now(),
  unique (campaign_id, slug)
);

-- ---------------------------------------------------------------- ambassadors
create table if not exists ambassadors (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$' and slug <> 'team' and slug <> 'donate'),
  name text not null,
  goal numeric(12,2),
  story text,
  photo_url text,
  phone text,                                    -- private: staff and the ambassador only
  email text,                                    -- private
  status text not null default 'pending' check (status in ('pending','live','hidden')),
  created_at timestamptz not null default now(),
  unique (campaign_id, slug)
);
create index if not exists ambassadors_user on ambassadors(user_id);

-- ---------------------------------------------------------------- donations
create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  ambassador_id uuid references ambassadors(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  ambassador_name text,                          -- for imported history without an ambassador row
  team_name text,
  donor_name text not null default '',
  donor_email text,
  donor_phone text,
  anonymous boolean not null default false,
  dedication text,
  message text,
  amount numeric(12,2) not null check (amount > 0),   -- what the donor gave toward the campaign
  fee_covered numeric(12,2) not null default 0,
  method text,                                   -- card | apple_pay | ach | daf | check | cash | zelle | wire | other
  method_detail text,                            -- e.g. "OJC Fund", "The Donors' Fund"
  provider text not null default 'stripe' check (provider in ('stripe','chariot','offline','import')),
  provider_ref text unique,                      -- Stripe session / Chariot grant id
  plan text,                                     -- null = one-time; 'monthly'; 'installments:12'
  status text not null default 'succeeded' check (status in ('pending','succeeded','failed','refunded')),
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists donations_campaign on donations(campaign_id, created_at desc);
create index if not exists donations_ambassador on donations(ambassador_id);
create index if not exists donations_email on donations(lower(donor_email));

-- ---------------------------------------------------------------- outreach
create table if not exists outreach (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  donor_key text not null,                       -- email, phone or normalized name
  texted_at timestamptz,
  note text,
  primary key (campaign_id, donor_key)
);
create table if not exists do_not_text (
  donor_key text primary key,
  added_at timestamptz not null default now()
);
create table if not exists message_templates (
  id text primary key,                           -- 'donor' | 'ambassador'
  body text not null
);

-- ---------------------------------------------------------------- public views
create or replace view campaigns_public with (security_invoker = false) as
  select id, slug, name, kind, year, tagline, story, cover_url, goal, match_multiplier, match_cap, match_note,
         starts_at, ends_at, status, show_on_home, ambassador_approval, preset_amounts, created_at
  from campaigns where status in ('live','ended');

create or replace view teams_public with (security_invoker = false) as
  select t.id, t.campaign_id, t.slug, t.name, t.goal, t.blurb, t.photo_url
  from teams t join campaigns c on c.id = t.campaign_id where c.status in ('live','ended');

create or replace view ambassadors_public with (security_invoker = false) as
  select a.id, a.campaign_id, a.team_id, a.slug, a.name, a.goal, a.story, a.photo_url, a.created_at
  from ambassadors a join campaigns c on c.id = a.campaign_id
  where a.status = 'live' and c.status in ('live','ended');

create or replace view donations_public with (security_invoker = false) as
  select d.id, d.campaign_id, d.ambassador_id, d.team_id,
         case when d.anonymous then 'Anonymous' else coalesce(nullif(d.donor_name,''),'Anonymous') end as display_name,
         d.amount, d.dedication, case when d.anonymous then null else d.message end as message, d.plan, d.created_at
  from donations d join campaigns c on c.id = d.campaign_id
  where d.status = 'succeeded' and c.status in ('live','ended') and d.provider <> 'import';

grant select on campaigns_public, teams_public, ambassadors_public, donations_public to anon, authenticated;

-- ---------------------------------------------------------------- row-level security
alter table admins enable row level security;
alter table campaigns enable row level security;
alter table teams enable row level security;
alter table ambassadors enable row level security;
alter table donations enable row level security;
alter table outreach enable row level security;
alter table do_not_text enable row level security;
alter table message_templates enable row level security;

-- admins: full access everywhere
create policy admin_all_admins on admins for all using (is_admin()) with check (is_admin());
create policy admin_all_campaigns on campaigns for all using (is_admin()) with check (is_admin());
create policy admin_all_teams on teams for all using (is_admin()) with check (is_admin());
create policy admin_all_ambassadors on ambassadors for all using (is_admin()) with check (is_admin());
create policy admin_all_donations on donations for all using (is_admin()) with check (is_admin());
create policy admin_all_outreach on outreach for all using (is_admin()) with check (is_admin());
create policy admin_all_dnt on do_not_text for all using (is_admin()) with check (is_admin());
create policy admin_all_templates on message_templates for all using (is_admin()) with check (is_admin());

-- ambassadors: read and edit their own rows (status changes stay with staff, enforced in the trigger below)
create policy amb_read_own on ambassadors for select using (user_id = auth.uid());
create policy amb_update_own on ambassadors for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy amb_read_own_donations on donations for select
  using (ambassador_id in (select id from ambassadors where user_id = auth.uid()) and provider <> 'import');

create or replace function ambassador_guard() returns trigger language plpgsql as $$
begin
  if not is_admin() and auth.uid() is not null then
    new.status := old.status;
    new.campaign_id := old.campaign_id;
    new.user_id := old.user_id;
    new.slug := old.slug;
  end if;
  return new;
end $$;
drop trigger if exists ambassador_guard on ambassadors;
create trigger ambassador_guard before update on ambassadors for each row execute function ambassador_guard();

-- ---------------------------------------------------------------- totals helper (public)
create or replace function campaign_totals(p_campaign uuid)
returns table (raised numeric, donors bigint, matched numeric)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(d.amount),0) as raised,
         count(*) as donors,
         least(coalesce(sum(d.amount),0) * (c.match_multiplier - 1), coalesce(c.match_cap, 'Infinity'::numeric)) as matched
  from campaigns c left join donations d on d.campaign_id = c.id and d.status = 'succeeded'
  where c.id = p_campaign and c.status in ('live','ended')
  group by c.match_multiplier, c.match_cap;
$$;
grant execute on function campaign_totals(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- photos bucket
insert into storage.buckets (id, name, public) values ('photos','photos', true) on conflict (id) do nothing;
create policy photos_public_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_member_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_admin_all on storage.objects for all using (bucket_id = 'photos' and is_admin()) with check (bucket_id = 'photos' and is_admin());

insert into message_templates (id, body) values
 ('donor', 'Hi {first}! Thank you for giving {amount} to the Lighthouse {kind} last time. {campaign} is now live, and the girls would love your support again: {link}'),
 ('ambassador', 'Hi {first}! You raised {raised} as an ambassador last time, thank you! Would you be an ambassador again for {campaign}? Sign up here: {link}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- admin totals (all statuses of campaign)
create or replace function admin_campaign_totals()
returns table (campaign_id uuid, gifts bigint, raised numeric)
language sql stable security definer set search_path = public as $$
  select d.campaign_id, count(*), sum(d.amount)
  from donations d where d.status = 'succeeded' and is_admin()
  group by d.campaign_id;
$$;
grant execute on function admin_campaign_totals() to authenticated;
