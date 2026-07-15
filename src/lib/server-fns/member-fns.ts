import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/server/auth.server";
import { getMailboxAccess } from "@/lib/server/access.server";
import {
  createMailbox,
  deleteMailbox,
  getMailboxByPublicId,
  getMailboxMembers,
  getEmail,
  inviteMailboxMember,
  listEmails,
  listMailboxes,
  markEmailRead,
  regenerateMailboxToken,
  removeMailboxMember,
  setTokenEnabled,
  updateMailboxMemberRole,
  type CreateMailboxInput,
  type MailboxFilters,
} from "@/lib/server/mailboxes.server";
import {
  addPrivateDomain,
  deletePrivateDomain,
  getAvailableDomains,
  listPrivateDomains,
  verifyPrivateDomainMock,
} from "@/lib/server/domains.server";
import {
  createApiKey,
  listApiKeys,
  regenerateApiKey,
  renameApiKey,
  revokeApiKey,
} from "@/lib/server/api-keys.server";
import {
  getApiUsageStats,
  getDashboardStats,
  getEmailUsageHistory,
} from "@/lib/server/usage.server";
import {
  getEmailUsageHistorySchema,
  getMailboxesSchema,
  createMailboxSchema,
  mailboxIdSchema,
  mailboxPublicIdSchema,
  setTokenEnabledSchema,
  getEmailsSchema,
  emailDetailSchema,
  inviteMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  privateDomainSchema,
  domainIdSchema,
  apiKeyNameSchema,
  apiKeyIdSchema,
  apiKeyRenameSchema,
} from "@/lib/validation-schemas";

// Dashboard
export const getDashboardStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  return getDashboardStats(user.id);
});

export const getEmailUsageHistoryFn = createServerFn({ method: "POST" })
  .validator(getEmailUsageHistorySchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return getEmailUsageHistory(user.id, data.days ?? 7);
  });

// Mailboxes
export const getMailboxesFn = createServerFn({ method: "POST" })
  .validator(getMailboxesSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return listMailboxes(user.id, data as MailboxFilters);
  });

export const createMailboxFn = createServerFn({ method: "POST" })
  .validator(createMailboxSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return createMailbox(user.id, data as CreateMailboxInput);
  });

export const deleteMailboxFn = createServerFn({ method: "POST" })
  .validator(mailboxIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    await deleteMailbox(user.id, data.id);
    return { success: true };
  });

export const regenerateMailboxTokenFn = createServerFn({ method: "POST" })
  .validator(mailboxIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return regenerateMailboxToken(user.id, data.id);
  });

export const setTokenEnabledFn = createServerFn({ method: "POST" })
  .validator(setTokenEnabledSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    await setTokenEnabled(user.id, data.id, data.enabled);
    return { success: true };
  });

export const getMailboxDetailFn = createServerFn({ method: "POST" })
  .validator(mailboxPublicIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return getMailboxByPublicId(data.publicId, user.id);
  });

// Emails
export const getEmailsFn = createServerFn({ method: "POST" })
  .validator(getEmailsSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    return listEmails(access.mailbox.id, data.options ?? {});
  });

export const getEmailDetailFn = createServerFn({ method: "POST" })
  .validator(emailDetailSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    return getEmail(data.emailId, access.mailbox.id);
  });

export const markEmailReadFn = createServerFn({ method: "POST" })
  .validator(emailDetailSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    await markEmailRead(user.id, data.emailId, access.mailbox.id);
    return { success: true };
  });

// Mailbox members
export const getMailboxMembersFn = createServerFn({ method: "POST" })
  .validator(mailboxPublicIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    return getMailboxMembers(access.mailbox.id);
  });

export const inviteMailboxMemberFn = createServerFn({ method: "POST" })
  .validator(inviteMemberSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    await inviteMailboxMember(
      user.id,
      access.mailbox.id,
      data.email,
      data.role,
      data.canRegenerate,
    );
    return { success: true };
  });

export const removeMailboxMemberFn = createServerFn({ method: "POST" })
  .validator(removeMemberSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    await removeMailboxMember(user.id, access.mailbox.id, data.memberId);
    return { success: true };
  });

export const updateMailboxMemberRoleFn = createServerFn({ method: "POST" })
  .validator(updateMemberRoleSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const access = await getMailboxAccess(data.publicId, { userId: user.id });
    await updateMailboxMemberRole(
      user.id,
      access.mailbox.id,
      data.memberId,
      data.role,
      data.canRegenerate,
    );
    return { success: true };
  });

// Domains
export const getAvailableDomainsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  return getAvailableDomains(user.id);
});

export const getPrivateDomainsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  return listPrivateDomains(user.id);
});

export const addPrivateDomainFn = createServerFn({ method: "POST" })
  .validator(privateDomainSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return addPrivateDomain(user.id, data.domain);
  });

export const deletePrivateDomainFn = createServerFn({ method: "POST" })
  .validator(domainIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    await deletePrivateDomain(user.id, data.id);
    return { success: true };
  });

export const verifyPrivateDomainFn = createServerFn({ method: "POST" })
  .validator(domainIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return verifyPrivateDomainMock(user.id, data.id);
  });

// API keys
export const getApiKeysFn = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  return listApiKeys(user.id);
});

export const createApiKeyFn = createServerFn({ method: "POST" })
  .validator(apiKeyNameSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return createApiKey(user.id, data.name);
  });

export const revokeApiKeyFn = createServerFn({ method: "POST" })
  .validator(apiKeyIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    await revokeApiKey(user.id, data.id);
    return { success: true };
  });

export const regenerateApiKeyFn = createServerFn({ method: "POST" })
  .validator(apiKeyIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    return regenerateApiKey(user.id, data.id);
  });

export const renameApiKeyFn = createServerFn({ method: "POST" })
  .validator(apiKeyRenameSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    await renameApiKey(user.id, data.id, data.name);
    return { success: true };
  });

// API usage
export const getApiUsageFn = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireUser();
  return getApiUsageStats(user.id);
});
