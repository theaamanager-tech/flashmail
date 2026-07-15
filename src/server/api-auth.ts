import { createServerClient } from "@supabase/ssr";
import { getServerEnv } from "@/lib/server/env.server";
import { getServiceClient, getUserClient } from "@/lib/server/supabase.server";
import { findApiKeyByPlaintext } from "@/lib/server/api-keys.server";
import type { Database } from "@/lib/database.types";

export type ApiContext = {
  userId: string;
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  apiKeyId: string | null;
};

function parseCookies(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

function serializeCookieHeader(cookies: { name: string; value: string }[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

export async function getApiContext(request: Request): Promise<ApiContext | null> {
  const env = getServerEnv();

  // 1. Try API key (Authorization: Bearer <key>)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7).trim();
    const apiKey = await findApiKeyByPlaintext(key);
    if (apiKey) {
      const profile = await getServiceClient()
        .from("profiles")
        .select("*")
        .eq("id", apiKey.user_id)
        .single();
      if (profile.data && !profile.data.is_suspended) {
        return { userId: apiKey.user_id, profile: profile.data, apiKeyId: apiKey.id };
      }
    }
  }

  // 2. Try session cookie
  const cookies = parseCookies(request.headers.get("cookie"));
  const cookieHeader = serializeCookieHeader(cookies);
  const supabase = createServerClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => cookies },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  // Use the user-context client so RLS enforces access to the caller's own profile.
  const profile = await getUserClient(cookieHeader).from("profiles").select("*").single();
  if (!profile.data || profile.data.is_suspended) return null;

  return { userId: data.user.id, profile: profile.data, apiKeyId: null };
}
