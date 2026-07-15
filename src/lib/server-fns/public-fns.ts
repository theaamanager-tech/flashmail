import { createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "@/lib/server/auth.server";
import { getMailboxAccess } from "@/lib/server/access.server";
import { listEmails } from "@/lib/server/mailboxes.server";
import { checkRateLimit } from "@/lib/server/rate-limiter";
import { RateLimitError } from "@/lib/server/errors.server";
import { publicInboxSchema } from "@/lib/validation-schemas";

const PUBLIC_INBOX_RATE_LIMIT = 30;

export const getPublicMailboxFn = createServerFn({ method: "POST" })
  .validator(publicInboxSchema)
  .handler(async ({ data }) => {
    // Rate limit public inbox access per mailbox public id.
    const allowed = await checkRateLimit(
      `public-inbox:${data.publicId}`,
      60_000,
      PUBLIC_INBOX_RATE_LIMIT,
    );
    if (!allowed) {
      throw new RateLimitError();
    }

    const session = await getSessionUser();
    const access = await getMailboxAccess(data.publicId, {
      userId: session?.user.id,
      token: data.token,
    });
    const emails = await listEmails(access.mailbox.id, { limit: 100 });
    return { mailbox: access.mailbox, emails: emails.items };
  });
