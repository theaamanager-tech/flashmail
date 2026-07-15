import { createServerClient } from "@supabase/ssr";
import { getCookies } from "@tanstack/react-start/server";
import { getServerEnv } from "./env.server";
import { getServiceClient, getUserClient } from "./supabase.server";
import { UnauthorizedError, ForbiddenError } from "./errors.server";
import { hashToken } from "@/lib/security";
import type { Database } from "@/lib/database.types";

export async function getSessionUser() {
  const env = getServerEnv();
  const cookieMap = getCookies();
  const cookies = Object.entries(cookieMap).map(([name, value]) => ({ name, value }));
  const cookieHeader = Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const supabase = createServerClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookies,
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // Use the user-context client so RLS enforces access to the caller's own profile.
  const profile = await getUserClient(cookieHeader).from("profiles").select("*").single();

  if (!profile.data) return null;

  return { user: data.user, profile: profile.data };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) throw new UnauthorizedError();
  if (session.profile.is_suspended) throw new ForbiddenError("Account suspended");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session.profile.is_admin) throw new ForbiddenError("Admin access required");
  return session;
}

export async function getApiKeyUser(apiKey: string) {
  if (!apiKey) return null;
  const hash = await hashToken(apiKey);
  const row = await getServiceClient()
    .from("api_keys")
    .select("*, profiles(user_id, is_admin)")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (row.error || !row.data) return null;

  const profile = await getServiceClient()
    .from("profiles")
    .select("*")
    .eq("id", row.data.user_id)
    .single();

  if (!profile.data) return null;

  return { apiKey: row.data, profile: profile.data };
}
