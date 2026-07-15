/**
 * Server-only environment variables.
 * This module is never imported by client code (protected by the Lovable
 * TanStack Start client import guard on any `server` directory).
 */
export type ServerEnv = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DAILY_EMAIL_LIMIT: number;
  API_RATE_LIMIT_PER_MINUTE: number;
  MAX_MAILBOXES_PER_USER: number;
  MAX_MAILBOX_CREATIONS_PER_HOUR: number;
  MAILBOX_TOKEN_EXPIRY_HOURS: number;
  ENABLE_MOCK_DNS_VERIFICATION: boolean;
  INBOUND_WEBHOOK_SECRET: string;
};

function getRaw(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function getServerEnv(): ServerEnv {
  const url = getRaw("VITE_SUPABASE_URL");
  const anonKey = getRaw("VITE_SUPABASE_ANON_KEY");
  const serviceRole = getRaw("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRole) {
    throw new Error(
      "Missing required server environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    DAILY_EMAIL_LIMIT: Number(getRaw("DAILY_EMAIL_LIMIT") ?? "500"),
    API_RATE_LIMIT_PER_MINUTE: Number(getRaw("API_RATE_LIMIT_PER_MINUTE") ?? "60"),
    MAX_MAILBOXES_PER_USER: Number(getRaw("MAX_MAILBOXES_PER_USER") ?? "100"),
    MAX_MAILBOX_CREATIONS_PER_HOUR: Number(getRaw("MAX_MAILBOX_CREATIONS_PER_HOUR") ?? "20"),
    MAILBOX_TOKEN_EXPIRY_HOURS: Number(getRaw("MAILBOX_TOKEN_EXPIRY_HOURS") ?? "0"),
    ENABLE_MOCK_DNS_VERIFICATION: getRaw("ENABLE_MOCK_DNS_VERIFICATION") === "true",
    INBOUND_WEBHOOK_SECRET: getRaw("INBOUND_WEBHOOK_SECRET") ?? "",
  };
}
