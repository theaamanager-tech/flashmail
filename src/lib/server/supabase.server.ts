import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getCookies } from "@tanstack/react-start/server";
import { getServerEnv } from "./env.server";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client for trusted server-side operations.
 * Bypasses RLS. Must only be used after explicit authorization checks.
 */
export function getServiceClient() {
  const env = getServerEnv();
  return createClient<Database>(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function parseCookies(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * User-context client that respects RLS.
 * Use this for normal user-owned CRUD operations.
 */
export function getUserClient(cookieHeader?: string | null | undefined) {
  const env = getServerEnv();
  const cookies = parseCookies(cookieHeader ?? null);
  return createServerClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => cookies },
  });
}

/**
 * User-context client for TanStack Start server functions.
 */
export function getUserClientFromServerFn() {
  const cookieMap = getCookies();
  const header = Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return getUserClient(header);
}
