import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export const supabase = createBrowserClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
);
