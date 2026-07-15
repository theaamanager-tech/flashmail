import { getServiceClient } from "./supabase.server";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors.server";
import { hashToken } from "@/lib/security";
import type { Database } from "@/lib/database.types";

type Mailbox = Database["public"]["Tables"]["mailboxes"]["Row"];
type Member = Database["public"]["Tables"]["mailbox_members"]["Row"];

export type MailboxAccess = {
  mailbox: Mailbox;
  role: "owner" | "member" | "viewer";
  canRegenerate: boolean;
};

export async function getMailboxAccess(
  publicId: string,
  options: { userId?: string; token?: string } = {},
): Promise<MailboxAccess> {
  const { userId, token } = options;

  const { data: mailbox, error } = await getServiceClient()
    .from("mailboxes")
    .select("*")
    .eq("public_id", publicId)
    .neq("status", "deleted")
    .single();

  if (error || !mailbox) throw new NotFoundError("Mailbox not found");

  // Owner
  if (userId && mailbox.user_id === userId) {
    return { mailbox, role: "owner", canRegenerate: true };
  }

  // Authenticated member / viewer
  let member: Member | null = null;
  if (userId) {
    const memberRes = await getServiceClient()
      .from("mailbox_members")
      .select("*")
      .eq("mailbox_id", mailbox.id)
      .eq("user_id", userId)
      .single();
    member = memberRes.data ?? null;
  }

  if (member) {
    return {
      mailbox,
      role: member.role,
      canRegenerate:
        member.role === "owner" || (member.role === "member" && member.can_regenerate_token),
    };
  }

  // Token-based access (viewer only)
  if (token && mailbox.token_enabled && mailbox.access_token_hash) {
    const hash = await hashToken(token);
    if (hash === mailbox.access_token_hash) {
      if (
        mailbox.access_token_expires_at &&
        new Date(mailbox.access_token_expires_at) < new Date()
      ) {
        throw new ForbiddenError("Access token expired");
      }
      return { mailbox, role: "viewer", canRegenerate: false };
    }
  }

  if (!userId) throw new UnauthorizedError();
  throw new ForbiddenError("You do not have access to this mailbox");
}

export async function requireMailboxOwner(mailboxId: string, userId: string) {
  const { data: mailbox } = await getServiceClient()
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .neq("status", "deleted")
    .single();

  if (!mailbox) throw new NotFoundError("Mailbox not found");
  if (mailbox.user_id !== userId) throw new ForbiddenError("Only the mailbox owner can do this");
  return mailbox;
}

export async function requireMailboxOwnerOrRegenPermission(
  mailboxId: string,
  userId: string,
): Promise<MailboxAccess> {
  const mailboxRes = await getServiceClient()
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .neq("status", "deleted")
    .single();

  if (!mailboxRes.data) throw new NotFoundError("Mailbox not found");
  const mailbox = mailboxRes.data;

  if (mailbox.user_id === userId) {
    return { mailbox, role: "owner", canRegenerate: true };
  }

  const memberRes = await getServiceClient()
    .from("mailbox_members")
    .select("*")
    .eq("mailbox_id", mailboxId)
    .eq("user_id", userId)
    .single();

  const member = memberRes.data;
  const canRegenerate = member?.role === "member" && member.can_regenerate_token;
  if (!canRegenerate) throw new ForbiddenError("You cannot regenerate this mailbox token");

  return { mailbox, role: member.role, canRegenerate: true };
}
