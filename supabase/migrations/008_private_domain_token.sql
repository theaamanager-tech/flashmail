-- Add verification token column for real DNS verification of private domains.

alter table public.private_domains
  add column if not exists verification_token text;

create index if not exists idx_private_domains_verification_token
  on public.private_domains(verification_token)
  where verification_token is not null;
