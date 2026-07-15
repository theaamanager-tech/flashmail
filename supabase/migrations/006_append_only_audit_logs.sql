-- Ensure audit logs remain append-only for normal users.
-- This migration drops any UPDATE/DELETE policies that might exist on audit_logs
-- and re-creates only admin-managed write access if needed.

-- Drop any user-facing modification policies on audit_logs if they exist.
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

-- Create an admin-only policy for any future ALL operations (currently no normal user needs this).
create policy if not exists "Audit logs admin-only modifications"
  on public.audit_logs for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
