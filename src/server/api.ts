import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { getApiContext, type ApiContext } from "./api-auth";
import { checkRateLimit, recordApiUsage } from "@/lib/server/rate-limit.server";
import { getAvailableDomains } from "@/lib/server/domains.server";
import {
  createMailbox,
  deleteMailbox,
  getEmail,
  getMailboxByPublicId,
  listEmails,
  listMailboxes,
  regenerateMailboxToken,
  type CreateMailboxInput,
  type MailboxFilters,
} from "@/lib/server/mailboxes.server";
import { getMailboxAccess } from "@/lib/server/access.server";
import { getApiUsageStats, getDashboardStats } from "@/lib/server/usage.server";
import { getServiceClient } from "@/lib/server/supabase.server";
import { AppError, UnauthorizedError } from "@/lib/server/errors.server";
import { handleInboundWebhook } from "./webhook";

const app = new Hono();

// Mount all routes under /api/v1
const v1 = new Hono();

async function requireAuth(c: Context) {
  const ctx = await getApiContext(c.req.raw);
  if (!ctx) throw new UnauthorizedError();
  await checkRateLimit(ctx.userId, ctx.apiKeyId);
  return ctx;
}

function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, ...data }, status);
}

function err(c: Context, error: unknown) {
  const status = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : "Internal error";
  return c.json({ success: false, error: code, message }, status as ContentfulStatusCode);
}

function param(c: Context, key: string): string {
  const value = c.req.param(key);
  if (!value) throw new AppError(`Missing path parameter: ${key}`, 400, "BAD_REQUEST");
  return value;
}

async function logUsage(
  c: Context,
  ctx: { userId: string; apiKeyId: string | null },
  status: number,
) {
  await recordApiUsage(ctx.userId, ctx.apiKeyId, c.req.path, c.req.method, status);
}

// Wrap handler with auth + logging
function memberRoute(handler: (c: Context, ctx: ApiContext) => Promise<Response>) {
  return async (c: Context) => {
    const ctx = await requireAuth(c);
    try {
      const res = await handler(c, ctx);
      await logUsage(c, ctx, c.res.status);
      return res;
    } catch (e) {
      await logUsage(c, ctx, e instanceof AppError ? e.statusCode : 500);
      throw e;
    }
  };
}

v1.get(
  "/domains",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const domains = await getAvailableDomains(ctx.userId);
    return ok(c, { domains: [...domains.publicDomains, ...domains.privateDomains] });
  }),
);

v1.post(
  "/mailboxes",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const body = (await c.req.json()) as CreateMailboxInput;
    const { mailbox, plaintextToken } = await createMailbox(ctx.userId, body);
    return ok(
      c,
      {
        mailbox: {
          id: mailbox.public_id,
          email: mailbox.email_address,
          token_enabled: mailbox.token_enabled,
        },
        access_token: plaintextToken,
      },
      201,
    );
  }),
);

v1.get(
  "/mailboxes",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const search = c.req.query("search");
    const domain = c.req.query("domain");
    const status = c.req.query("status") as MailboxFilters["status"] | undefined;
    const domainType = c.req.query("domain_type") as MailboxFilters["domainType"] | undefined;
    const sortBy = c.req.query("sort_by") as MailboxFilters["sortBy"] | undefined;
    const result = await listMailboxes(ctx.userId, {
      search,
      domain,
      status,
      domainType,
      sortBy,
    });
    return ok(c, { mailboxes: result.items, total: result.total });
  }),
);

v1.get(
  "/mailboxes/:id",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const publicId = param(c, "id");
    const mailbox = await getMailboxByPublicId(publicId, ctx.userId);
    return ok(c, { mailbox });
  }),
);

v1.get(
  "/mailboxes/:id/emails",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const publicId = param(c, "id");
    const access = await getMailboxAccess(publicId, { userId: ctx.userId });
    const search = c.req.query("search");
    const isReadRaw = c.req.query("is_read");
    const limit = Number(c.req.query("limit") ?? "50");
    const offset = Number(c.req.query("offset") ?? "0");
    const result = await listEmails(access.mailbox.id, {
      search,
      isRead: isReadRaw === undefined ? undefined : isReadRaw === "true",
      limit,
      offset,
    });
    return ok(c, { emails: result.items, total: result.total });
  }),
);

v1.post(
  "/mailboxes/:id/regenerate-token",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const publicId = param(c, "id");
    const mailbox = await getMailboxByPublicId(publicId, ctx.userId);
    const result = await regenerateMailboxToken(ctx.userId, mailbox.id);
    return ok(c, { access_token: result.plaintextToken });
  }),
);

v1.delete(
  "/mailboxes/:id",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const publicId = param(c, "id");
    const mailbox = await getMailboxByPublicId(publicId, ctx.userId);
    await deleteMailbox(ctx.userId, mailbox.id);
    return ok(c, { deleted: true });
  }),
);

v1.get(
  "/emails/:id",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const emailId = param(c, "id");
    const emailRes = await getServiceClient()
      .from("emails")
      .select("mailbox_id")
      .eq("id", emailId)
      .single();
    if (!emailRes.data) throw new AppError("Email not found", 404, "NOT_FOUND");
    const mbRes = await getServiceClient()
      .from("mailboxes")
      .select("public_id")
      .eq("id", emailRes.data.mailbox_id)
      .single();
    if (!mbRes.data) throw new AppError("Mailbox not found", 404, "NOT_FOUND");
    const access = await getMailboxAccess(mbRes.data.public_id, { userId: ctx.userId });
    const email = await getEmail(emailId, access.mailbox.id);
    return ok(c, { email });
  }),
);

v1.get(
  "/usage",
  memberRoute(async (c) => {
    const ctx = await requireAuth(c);
    const stats = await getDashboardStats(ctx.userId);
    const apiStats = await getApiUsageStats(ctx.userId);
    return ok(c, { stats, api: apiStats });
  }),
);

app.route("/api/v1", v1);

// Inbound email webhook — uses a shared secret, not user authentication.
app.post(
  "/api/webhook/inbound",
  bodyLimit({
    maxSize: 10 * 1024 * 1024, // 10 MB
    onError: (c) => err(c, new AppError("Payload too large", 413, "PAYLOAD_TOO_LARGE")),
  }),
  async (c) => {
    try {
      return await handleInboundWebhook(c.req.raw);
    } catch (error) {
      return err(c, error);
    }
  },
);

app.onError((error, c) => err(c, error));
app.notFound((c) => err(c, new AppError("Not found", 404, "NOT_FOUND")));

export const apiApp = app;
