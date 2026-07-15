-- Harden the daily email limit function to serialize concurrent inbound deliveries
-- per user and prevent any race-condition exceedance of the configured limit.

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
  -- This eliminates any race condition where concurrent emails could push the
  -- account past its daily limit.
  v_lock_id := ('x' || substr(md5(v_user_id::text || current_date::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_id);

  -- Atomically upsert the daily usage row, guarded by the limit.
  insert into public.daily_email_usage (user_id, date, received_count, "limit")
  values (v_user_id, current_date, 1, v_limit)
  on conflict (user_id, date)
  do update set received_count = public.daily_email_usage.received_count + 1
  where public.daily_email_usage.received_count < public.daily_email_usage."limit"
  returning public.daily_email_usage.received_count, public.daily_email_usage."limit" into v_count, v_limit;

  if v_count is null then
    select received_count, "limit" into v_count, v_limit
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
