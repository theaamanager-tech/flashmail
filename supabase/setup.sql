-- ============================================================
-- FlashMail Complete Database Setup
-- Run this entire file in the Supabase SQL Editor (New query)
-- Migrations 001-009 combined in order
-- ============================================================

-- ============================================================
-- 001_flashmail_core.sql
-- ============================================================

-- Enable required extensions
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_admin on public.profiles(is_admin);
create index if not exists idx_profiles_suspended on public.profiles(is_suspended);

comment on table public.profiles is 'Public profile metadata linked to Supabase Auth users.';

-- Auto-create profile on auth sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger only if it does not already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ============================================================
-- PUBLIC DOMAINS (available to guests and members)
-- ============================================================
create table if not exists public.public_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  dns_status text not null default 'verified' check (dns_status in ('pending','verified','error')),
  routing text not null default 'enabled' check (routing in ('disabled','pending','enabled')),
  created_at timestamptz not null default now()
);

insert into public.public_domains (name, active, dns_status, routing)
values
  ('mailnova.dev', true, 'verified', 'enabled'),
  ('inboxrush.net', true, 'verified', 'enabled'),
  ('tempwave.io', true, 'verified', 'enabled'),
  ('ghostbox.io', true, 'verified', 'enabled')
on conflict (name) do nothing;

-- ============================================================
-- PRIVATE DOMAINS (member-owned)
-- ============================================================
create table if not exists public.private_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','error')),
  routing_status text not null default 'pending' check (routing_status in ('disabled','pending','enabled')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (domain)
);

create index if not exists idx_private_domains_user_id on public.private_domains(user_id);

-- ============================================================
-- MAILBOXES
-- ============================================================
create table if not exists public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  email_address text not null unique,
  domain_type text not null check (domain_type in ('public','private')),
  domain_id uuid not null,
  domain_name text not null,
  access_token_hash text,
  token_enabled boolean not null default false,
  status text not null default 'active' check (status in ('active','expired','deleted')),
  expires_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mailboxes_user_id on public.mailboxes(user_id);
create index if not exists idx_mailboxes_public_id on public.mailboxes(public_id);
create index if not exists idx_mailboxes_domain on public.mailboxes(domain_type, domain_id);
create index if not exists idx_mailboxes_status on public.mailboxes(status);

-- ============================================================
-- MAILBOX MEMBERS
-- ============================================================
create table if not exists public.mailbox_members (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','member','viewer')),
  can_regenerate_token boolean not null default false,
  created_at timestamptz not null default now(),
  unique (mailbox_id, user_id)
);

create index if not exists idx_mailbox_members_mailbox_id on public.mailbox_members(mailbox_id);
create index if not exists idx_mailbox_members_user_id on public.mailbox_members(user_id);

-- ============================================================
-- EMAILS
-- ============================================================
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  sender text not null,
  sender_name text not null default '',
  recipient text not null,
  subject text not null default '',
  text_body text,
  html_body text,
  is_read boolean not null default false,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_emails_mailbox_id on public.emails(mailbox_id);
create index if not exists idx_emails_received_at on public.emails(received_at desc);

-- ============================================================
-- API KEYS
-- ============================================================
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_keys_user_id on public.api_keys(user_id);
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);

-- ============================================================
-- DAILY EMAIL USAGE
-- ============================================================
create table if not exists public.daily_email_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  received_count integer not null default 0,
  limit integer not null default 500,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_email_usage_user_date on public.daily_email_usage(user_id, date);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values
  ('daily_email_limit', '500'),
  ('api_rate_limit_per_minute', '60'),
  ('daily_limit_behavior', 'reject')
on conflict (key) do nothing;

-- ============================================================
-- API USAGE
-- ============================================================
create table if not exists public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer,
  requested_at timestamptz not null default now()
);

create index if not exists idx_api_usage_user_id on public.api_usage(user_id);
create index if not exists idx_api_usage_requested_at on public.api_usage(requested_at desc);

-- ============================================================
-- ATOMIC INCOMING EMAIL + CREDIT CHECK
-- ============================================================
create or replace function public.try_receive_email(
  p_mailbox_id uuid,
  p_sender text,
  p_sender_name text,
  p_recipient text,
  p_subject text,
  p_text_body text,
  p_html_body text
) returns table(success boolean, received_count int, daily_limit int) language plpgsql as $$
declare
  v_user_id uuid;
  v_status text;
  v_limit int;
  v_count int;
  v_lock_id bigint;
begin
  select user_id, status into v_user_id, v_status
  from public.mailboxes
  where id = p_mailbox_id;

  if v_user_id is null or v_status != 'active' then
    return query select false, 0, 0;
    return;
  end if;

  v_limit := coalesce((select value::int from public.system_settings where key = 'daily_email_limit'), 500);

  -- Serialize all inbound deliveries for a single user on the current transaction.
  v_lock_id := ('x' || substr(md5(v_user_id::text || current_date::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_id);

  -- Atomically upsert the daily usage row, guarded by the limit.
  insert into public.daily_email_usage (user_id, date, received_count, limit)
  values (v_user_id, current_date, 1, v_limit)
  on conflict (user_id, date)
  do update set received_count = public.daily_email_usage.received_count + 1
  where public.daily_email_usage.received_count < public.daily_email_usage.limit
  returning public.daily_email_usage.received_count, public.daily_email_usage.limit into v_count, v_limit;

  if v_count is null then
    select received_count, limit into v_count, v_limit
    from public.daily_email_usage
    where user_id = v_user_id and date = current_date;
    return query select false, v_count, v_limit;
    return;
  end if;

  insert into public.emails (mailbox_id, sender, sender_name, recipient, subject, text_body, html_body, received_at)
  values (p_mailbox_id, p_sender, p_sender_name, p_recipient, p_subject, p_text_body, p_html_body, now());

  update public.mailboxes set last_activity_at = now() where id = p_mailbox_id;

  return query select true, v_count, v_limit;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.public_domains enable row level security;
alter table public.private_domains enable row level security;
alter table public.mailboxes enable row level security;
alter table public.mailbox_members enable row level security;
alter table public.emails enable row level security;
alter table public.api_keys enable row level security;
alter table public.daily_email_usage enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.api_usage enable row level security;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Public domains: visible to everyone (anon + authenticated)
create policy "Public domains are readable"
  on public.public_domains for select
  using (true);

-- Private domains: owner only
create policy "Users own private domains"
  on public.private_domains for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mailboxes: owner or shared member
create policy "Users can access own or shared mailboxes"
  on public.mailboxes for all to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.mailbox_members
      where mailbox_id = mailboxes.id and user_id = auth.uid()
    )
  )
  with check (user_id = auth.uid());

-- Mailbox members: owner can manage; members can view rows for mailboxes they belong to
create policy "Mailbox members manageable by owner"
  on public.mailbox_members for all to authenticated
  using (
    exists (
      select 1 from public.mailbox_members
      where mailbox_id = mailbox_members.mailbox_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.mailbox_members
      where mailbox_id = mailbox_members.mailbox_id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

create policy "Mailbox members readable by members"
  on public.mailbox_members for select to authenticated
  using (
    exists (
      select 1 from public.mailbox_members m
      where m.mailbox_id = mailbox_members.mailbox_id and m.user_id = auth.uid()
    )
  );

-- Emails: owner or shared member of the mailbox
create policy "Users can read emails of own or shared mailboxes"
  on public.emails for select to authenticated
  using (
    exists (
      select 1 from public.mailboxes
      where mailboxes.id = emails.mailbox_id
        and (
          mailboxes.user_id = auth.uid()
          or exists (
            select 1 from public.mailbox_members
            where mailbox_id = mailboxes.id and user_id = auth.uid()
          )
        )
    )
  );

create policy "Users can manage emails of own mailboxes"
  on public.emails for all to authenticated
  using (
    exists (
      select 1 from public.mailboxes
      where mailboxes.id = emails.mailbox_id and mailboxes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mailboxes
      where mailboxes.id = emails.mailbox_id and mailboxes.user_id = auth.uid()
    )
  );

-- API keys: owner only
create policy "Users can manage own API keys"
  on public.api_keys for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Daily email usage: owner only
create policy "Users can read own daily usage"
  on public.daily_email_usage for select to authenticated
  using (user_id = auth.uid());

create policy "Users can update own daily usage"
  on public.daily_email_usage for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Audit logs: own + admin
create policy "Users can read own audit logs"
  on public.audit_logs for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can read all audit logs"
  on public.audit_logs for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- System settings: readable by authenticated, writable by admin
create policy "System settings readable by authenticated users"
  on public.system_settings for select to authenticated
  using (true);

create policy "System settings manageable by admins"
  on public.system_settings for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- API usage: own + admin
create policy "Users can read own API usage"
  on public.api_usage for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can read all API usage"
  on public.api_usage for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ============================================================
-- 002_profiles_email.sql
-- ============================================================

alter table public.profiles add column if not exists email text;

create index if not exists idx_profiles_email on public.profiles(email);

-- Backfill emails from existing auth users.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email;

-- Update the trigger to keep the email column in sync.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);
  return new;
end;
$$ language plpgsql security definer;

-- Sync email on auth user updates.
create or replace function public.handle_auth_user_updated()
returns trigger as $$
begin
  update public.profiles
  set email = new.email,
      name = coalesce(new.raw_user_meta_data->>'name', public.profiles.name)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_updated'
  ) then
    create trigger on_auth_user_updated
      after update on auth.users
      for each row execute function public.handle_auth_user_updated();
  end if;
end $$;

-- ============================================================
-- 003_mailbox_members_profiles_fk.sql
-- ============================================================

alter table public.mailbox_members
  add constraint if not exists mailbox_members_profile_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

-- ============================================================
-- 004_mailbox_token_expiry.sql
-- ============================================================

alter table public.mailboxes
  add column if not exists access_token_expires_at timestamptz;

create index if not exists idx_mailboxes_token_expires
  on public.mailboxes(access_token_expires_at)
  where access_token_expires_at is not null;

-- ============================================================
-- 005_add_indexes.sql
-- ============================================================

create index if not exists idx_public_domains_name_active
  on public.public_domains(name, active);

create index if not exists idx_private_domains_domain_user
  on public.private_domains(domain, user_id);

create index if not exists idx_mailboxes_email_address_status
  on public.mailboxes(email_address, status);

create index if not exists idx_emails_mailbox_received
  on public.emails(mailbox_id, received_at desc);

create index if not exists idx_api_keys_hash_active
  on public.api_keys(key_hash, is_active);

create index if not exists idx_daily_email_usage_lookup
  on public.daily_email_usage(user_id, date);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at desc);

-- ============================================================
-- 006_append_only_audit_logs.sql
-- ============================================================

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and cmd in ('UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.audit_logs', pol.policyname);
  end loop;
end $$;

create policy if not exists "Audit logs admin-only modifications"
  on public.audit_logs for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ============================================================
-- 007_atomic_email_limit.sql (function already defined in 001, hardened here)
-- ============================================================

create or replace function public.try_receive_email(
  p_mailbox_id uuid,
  p_sender text,
  p_sender_name text,
  p_recipient text,
  p_subject text,
  p_text_body text,
  p_html_body text
) returns table(success boolean, received_count int, daily_limit int) language plpgsql as $$
declare
  v_user_id uuid;
  v_status text;
  v_limit int;
  v_count int;
  v_lock_id bigint;
begin
  select user_id, status into v_user_id, v_status
  from public.mailboxes
  where id = p_mailbox_id;

  if v_user_id is null or v_status != 'active' then
    return query select false, 0, 0;
    return;
  end if;

  v_limit := coalesce((select value::int from public.system_settings where key = 'daily_email_limit'), 500);

  v_lock_id := ('x' || substr(md5(v_user_id::text || current_date::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_id);

  insert into public.daily_email_usage (user_id, date, received_count, limit)
  values (v_user_id, current_date, 1, v_limit)
  on conflict (user_id, date)
  do update set received_count = public.daily_email_usage.received_count + 1
  where public.daily_email_usage.received_count < public.daily_email_usage.limit
  returning public.daily_email_usage.received_count, public.daily_email_usage.limit into v_count, v_limit;

  if v_count is null then
    select received_count, limit into v_count, v_limit
    from public.daily_email_usage
    where user_id = v_user_id and date = current_date;
    return query select false, v_count, v_limit;
    return;
  end if;

  insert into public.emails (mailbox_id, sender, sender_name, recipient, subject, text_body, html_body, received_at)
  values (p_mailbox_id, p_sender, p_sender_name, p_recipient, p_subject, p_text_body, p_html_body, now());

  update public.mailboxes set last_activity_at = now() where id = p_mailbox_id;

  return query select true, v_count, v_limit;
end;
$$;

-- ============================================================
-- 008_private_domain_token.sql
-- ============================================================

alter table public.private_domains
  add column if not exists verification_token text;

create index if not exists idx_private_domains_verification_token
  on public.private_domains(verification_token)
  where verification_token is not null;

-- ============================================================
-- 009_protect_profile_admin_columns.sql
-- ============================================================

create or replace function public.protect_profile_admin_columns()
returns trigger as $$
begin
  if (
    new.is_admin is distinct from old.is_admin
    or new.is_suspended is distinct from old.is_suspended
  ) and not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Only admins can change is_admin or is_suspended';
  end if;
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'protect_profile_admin_columns'
  ) then
    create trigger protect_profile_admin_columns
      before update on public.profiles
      for each row execute function public.protect_profile_admin_columns();
  end if;
end $$;
