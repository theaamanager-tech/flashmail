-- Add a foreign key from mailbox_members.user_id to public.profiles so we can
-- use Supabase's embedded selects (e.g. `profiles(name)`) in member queries.

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'mailbox_members_profile_id_fkey'
      and table_name = 'mailbox_members'
      and table_schema = 'public'
  ) then
    alter table public.mailbox_members
      add constraint mailbox_members_profile_id_fkey
      foreign key (user_id) references public.profiles(id)
      on delete cascade;
  end if;
end $$;
