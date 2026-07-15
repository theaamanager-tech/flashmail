-- Add mailbox access token expiration support.

alter table public.mailboxes
  add column if not exists access_token_expires_at timestamptz;

create index if not exists idx_mailboxes_token_expires
  on public.mailboxes(access_token_expires_at)
  where access_token_expires_at is not null;
