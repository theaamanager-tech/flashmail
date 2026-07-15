-- Prevent non-admin users from changing their own admin/suspended flags.

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
