-- Add email column to profiles so server code can look up users by email
-- without calling the Auth admin API for every lookup.

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
