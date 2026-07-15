import { getServiceClient } from "./supabase.server";
import { AppError } from "./errors.server";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function listUsers() {
  const { data, error } = await getServiceClient()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new AppError("Gagal mengambil data user");

  return (data ?? []).map((p) => ({
    ...p,
    email: p.email,
  }));
}

export async function setUserSuspended(adminId: string, userId: string, suspended: boolean) {
  const { error } = await getServiceClient()
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", userId);
  if (error) throw new AppError("Gagal mengubah status user");
}

export async function setUserAdmin(adminId: string, userId: string, isAdmin: boolean) {
  const { error } = await getServiceClient()
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) throw new AppError("Gagal mengubah role user");
}

export async function getGlobalStats() {
  const today = new Date().toISOString().slice(0, 10);
  const [users, mailboxes, emailsToday, apiToday, apiKeys, privateDomains] = await Promise.all([
    getServiceClient().from("profiles").select("id", { count: "exact", head: true }),
    getServiceClient()
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .neq("status", "deleted"),
    getServiceClient()
      .from("emails")
      .select("id", { count: "exact", head: true })
      .gte("received_at", `${today}T00:00:00Z`),
    getServiceClient()
      .from("api_usage")
      .select("id", { count: "exact", head: true })
      .gte("requested_at", `${today}T00:00:00Z`),
    getServiceClient()
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    getServiceClient().from("private_domains").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: users.count ?? 0,
    totalMailboxes: mailboxes.count ?? 0,
    emailsToday: emailsToday.count ?? 0,
    apiRequestsToday: apiToday.count ?? 0,
    activeApiKeys: apiKeys.count ?? 0,
    privateDomains: privateDomains.count ?? 0,
  };
}

export async function getSystemSettings() {
  const { data, error } = await getServiceClient().from("system_settings").select("*");
  if (error) throw new AppError("Gagal memuat pengaturan");
  return (data ?? []).reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>,
  );
}

export async function updateSystemSetting(adminId: string, key: string, value: string) {
  const { error } = await getServiceClient().from("system_settings").upsert({ key, value });
  if (error) throw new AppError("Gagal menyimpan pengaturan");
}
