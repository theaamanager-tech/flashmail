-- Add a foreign key from mailbox_members.user_id to public.profiles so we can
-- use Supabase's embedded selects (e.g. `profiles(name)`) in member queries.

alter table public.mailbox_members
  add constraint if not exists mailbox_members_profile_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;
