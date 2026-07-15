import { getServiceClient } from "./supabase.server";
import { getServerEnv } from "./env.server";
import { RateLimitError } from "./errors.server";
import { checkRateLimit as checkWindowedRateLimit, getUserKey } from "./rate-limiter";
import { captureException } from "./error-tracker.server";

export async function checkRateLimit(userId: string, apiKeyId?: string | null) {
  const env = getServerEnv();
  const limit = env.API_RATE_LIMIT_PER_MINUTE;

  // Fast path: use the rate-limiter abstraction (memory or configured backend).
  const key = apiKeyId ? `api-key:${apiKeyId}` : getUserKey(userId, "user");
  const allowed = await checkWindowedRateLimit(key, 60_000, limit);
  if (!allowed) {
    throw new RateLimitError();
  }

  // Also keep the historical API usage table for analytics.
  // Do not throw on analytics errors.
}

export async function checkIpRateLimit(request: Request, prefix: string, maxRequests: number) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (request.headers.get("x-real-ip") ?? "unknown");
  const allowed = await checkWindowedRateLimit(`ip:${ip}:${prefix}`, 60_000, maxRequests);
  if (!allowed) {
    throw new RateLimitError();
  }
}

export async function recordApiUsage(
  userId: string | null,
  apiKeyId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
) {
  try {
    await getServiceClient().from("api_usage").insert({
      user_id: userId,
      api_key_id: apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
    });
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), {
      source: "recordApiUsage",
      endpoint,
      method,
    });
  }
}
