import { z } from "zod";

export const getEmailUsageHistorySchema = z.object({
  days: z.number().int().min(1).max(90).optional(),
});

export const getMailboxesSchema = z.object({
  search: z.string().max(100).optional(),
  domain: z.string().max(100).optional(),
  status: z.enum(["active", "expired", "deleted"]).optional(),
  domainType: z.enum(["public", "private"]).optional(),
  tokenEnabled: z.boolean().optional(),
  sortBy: z.enum(["newest", "oldest", "most_emails", "last_activity"]).optional(),
});

export const createMailboxSchema = z.object({
  username: z.string().max(32).optional(),
  domain: z.string().max(100).optional(),
  randomDomain: z.boolean().optional(),
  domainScope: z.enum(["public", "private", "all"]).optional(),
  tokenEnabled: z.boolean().optional(),
});

export const mailboxIdSchema = z.object({
  id: z.string().uuid(),
});

export const mailboxPublicIdSchema = z.object({
  publicId: z.string().min(1).max(100),
});

export const setTokenEnabledSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
});

export const getEmailsSchema = z.object({
  publicId: z.string().min(1).max(100),
  options: z
    .object({
      search: z.string().max(100).optional(),
      isRead: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    })
    .optional(),
});

export const emailDetailSchema = z.object({
  publicId: z.string().min(1).max(100),
  emailId: z.string().uuid(),
});

export const inviteMemberSchema = z.object({
  publicId: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: z.enum(["member", "viewer"]),
  canRegenerate: z.boolean(),
});

export const removeMemberSchema = z.object({
  publicId: z.string().min(1).max(100),
  memberId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  publicId: z.string().min(1).max(100),
  memberId: z.string().uuid(),
  role: z.enum(["member", "viewer"]),
  canRegenerate: z.boolean(),
});

export const privateDomainSchema = z.object({
  domain: z.string().min(3).max(100),
});

export const domainIdSchema = z.object({
  id: z.string().uuid(),
});

export const apiKeyNameSchema = z.object({
  name: z.string().min(1).max(100),
});

export const apiKeyIdSchema = z.object({
  id: z.string().uuid(),
});

export const apiKeyRenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const publicInboxSchema = z.object({
  publicId: z.string().min(1).max(100),
  token: z.string().max(200).optional(),
});

export const setUserSuspendedSchema = z.object({
  userId: z.string().uuid(),
  suspended: z.boolean(),
});

export const setUserAdminSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean(),
});

export const systemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(5000),
});

export const publicDomainNameSchema = z.object({
  name: z.string().min(3).max(100),
});

export const publicDomainIdSchema = z.object({
  id: z.string().uuid(),
});
