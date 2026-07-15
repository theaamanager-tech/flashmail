-- Additional indexes for performance and security-critical lookups.

-- Faster active public domain lookups and conflict checks.
create index if not exists idx_public_domains_name_active
  on public.public_domains(name, active);

-- Faster private domain ownership and conflict checks.
create index if not exists idx_private_domains_domain_user
  on public.private_domains(domain, user_id);

-- Faster email address uniqueness/conflict checks.
create index if not exists idx_mailboxes_email_address_status
  on public.mailboxes(email_address, status);

-- Composite index for the most common email listing query.
create index if not exists idx_emails_mailbox_received
  on public.emails(mailbox_id, received_at desc);

-- Faster active API key verification.
create index if not exists idx_api_keys_hash_active
  on public.api_keys(key_hash, is_active);

-- Faster daily usage lookups and limit enforcement.
create index if not exists idx_daily_email_usage_lookup
  on public.daily_email_usage(user_id, date);

-- Faster audit log time-series reads.
create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at desc);
