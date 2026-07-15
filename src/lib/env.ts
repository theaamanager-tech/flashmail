/**
 * Client-safe environment variables.
 * These are injected at build time and are safe to expose to the browser.
 */
export const env = {
  VITE_SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL ?? "") as string,
  VITE_SUPABASE_ANON_KEY: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "") as string,
};

export function ensureClientEnv() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }
}
