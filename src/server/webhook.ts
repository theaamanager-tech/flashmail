import { getServerEnv } from "@/lib/server/env.server";
import { AppError, UnauthorizedError } from "@/lib/server/errors.server";
import { receiveIncomingEmail } from "@/lib/server/mailboxes.server";
import { auditLog } from "@/lib/server/audit.server";
import { getMailboxByEmailAddress } from "@/lib/server/mailboxes.server";
import { checkIpRateLimit } from "@/lib/server/rate-limit.server";

const MAX_WEBHOOK_PAYLOAD_BYTES = 10 * 1_048_576; // 10 MB

export type InboundEmailPayload = {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
};

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function handleInboundWebhook(request: Request): Promise<Response> {
  const env = getServerEnv();
  // Enforce IP-level rate limiting before authentication to reduce brute-force volume.
  await checkIpRateLimit(request, "webhook", 60);

  const secret = env.INBOUND_WEBHOOK_SECRET;

  if (!secret) {
    throw new AppError("Inbound webhook not configured", 500, "NOT_CONFIGURED");
  }

  const provided = request.headers.get("x-webhook-secret") ?? "";
  if (!constantTimeEqual(provided, secret)) {
    // Log without revealing the secret.
    await auditLog(null, "inbound_webhook.auth_failed", "inbound_webhook", "unknown", {
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });
    throw new UnauthorizedError("Invalid webhook secret");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_PAYLOAD_BYTES) {
    throw new AppError("Payload too large", 413, "PAYLOAD_TOO_LARGE");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("Invalid JSON body", 400, "BAD_REQUEST");
  }

  const payload = validatePayload(body);

  // Resolve the recipient mailbox.
  const recipient = payload.to.trim().toLowerCase();
  const mailbox = await getMailboxByEmailAddress(recipient);
  if (!mailbox) {
    return new Response(JSON.stringify({ success: false, error: "Mailbox not found" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await receiveIncomingEmail(mailbox.id, {
    sender: payload.from,
    senderName: payload.fromName,
    recipient,
    subject: payload.subject,
    textBody: payload.text,
    htmlBody: payload.html,
  });

  await auditLog(mailbox.user_id, "inbound_webhook.delivered", "email", mailbox.id, {
    success: result.success,
    received_count: result.received_count,
    daily_limit: result.daily_limit,
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "DAILY_LIMIT_REACHED",
        received_count: result.received_count,
        daily_limit: result.daily_limit,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      received_count: result.received_count,
      daily_limit: result.daily_limit,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
}

function validatePayload(body: unknown): InboundEmailPayload {
  if (!body || typeof body !== "object") {
    throw new AppError("Invalid payload", 400, "BAD_REQUEST");
  }
  const b = body as Record<string, unknown>;

  const to = normalizeString(b.to);
  const from = normalizeString(b.from);
  const subject = normalizeString(b.subject);
  const text = typeof b.text === "string" ? b.text : "";
  const html = typeof b.html === "string" ? b.html : "";
  const fromName = typeof b.fromName === "string" ? b.fromName : undefined;

  if (!to || !to.includes("@")) throw new AppError("Invalid recipient", 400, "BAD_REQUEST");
  if (!from || !from.includes("@")) throw new AppError("Invalid sender", 400, "BAD_REQUEST");
  if (byteLength(text) > 1_048_576 || byteLength(html) > 1_048_576) {
    throw new AppError("Email body exceeds maximum size", 413, "PAYLOAD_TOO_LARGE");
  }

  return { to, from, fromName, subject, text, html };
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}
