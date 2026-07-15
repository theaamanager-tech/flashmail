import { getServiceClient } from "./supabase.server";
import { AppError } from "./errors.server";

export async function getDashboardStats(userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const mailboxIdsRes = await getServiceClient()
    .from("mailboxes")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "deleted");

  const mailboxIds = (mailboxIdsRes.data ?? []).map((m) => m.id);

  const [
    totalMailboxes,
    activeMailboxes,
    totalEmails,
    emailsToday,
    dailyUsage,
    privateDomains,
    activeApiKeys,
  ] = await Promise.all([
    getServiceClient()
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "deleted"),
    getServiceClient()
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
    mailboxIds.length === 0
      ? Promise.resolve({ count: 0 })
      : getServiceClient()
          .from("emails")
          .select("id", { count: "exact", head: true })
          .in("mailbox_id", mailboxIds),
    mailboxIds.length === 0
      ? Promise.resolve({ count: 0 })
      : getServiceClient()
          .from("emails")
          .select("id", { count: "exact", head: true })
          .gte("received_at", `${today}T00:00:00Z`)
          .in("mailbox_id", mailboxIds),
    getServiceClient()
      .from("daily_email_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single(),
    getServiceClient()
      .from("private_domains")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    getServiceClient()
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  const usage = dailyUsage.data ?? { received_count: 0, limit: 500 };

  return {
    totalMailboxes: totalMailboxes.count ?? 0,
    activeMailboxes: activeMailboxes.count ?? 0,
    totalEmails: totalEmails.count ?? 0,
    emailsToday: emailsToday.count ?? 0,
    receivedToday: usage.received_count,
    dailyLimit: usage.limit,
    remainingCredit: Math.max(0, usage.limit - usage.received_count),
    privateDomains: privateDomains.count ?? 0,
    activeApiKeys: activeApiKeys.count ?? 0,
  };
}

export async function getEmailUsageHistory(userId: string, days = 7) {
  const rows: { date: string; count: number }[] = [];
  const now = new Date();

  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);

  const { data, error } = await getServiceClient()
    .from("daily_email_usage")
    .select("date, received_count")
    .eq("user_id", userId)
    .gte("date", startStr)
    .order("date", { ascending: true });

  if (error) throw new AppError("Gagal memuat riwayat penggunaan");

  const map = new Map((data ?? []).map((d) => [d.date, d.received_count]));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    rows.push({ date: key, count: map.get(key) ?? 0 });
  }

  return rows;
}

export async function getApiUsageStats(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const [todayRes, monthRes, endpoints] = await Promise.all([
    getServiceClient()
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("requested_at", `${today}T00:00:00Z`),
    getServiceClient()
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("requested_at", `${thisMonth}-01T00:00:00Z`),
    getServiceClient()
      .from("api_usage")
      .select("endpoint, method, requested_at")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(50),
  ]);

  return {
    today: todayRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
    recent: endpoints.data ?? [],
  };
}
