import { getServiceClient } from "./supabase.server";
import { captureException } from "./error-tracker.server";
import type { Json } from "@/lib/database.types";

export type AuditAction =
  | "api_key.created"
  | "api_key.revoked"
  | "api_key.regenerated"
  | "mailbox_token.generated"
  | "mailbox_token.regenerated"
  | "mailbox_token.disabled"
  | "mailbox_token.enabled"
  | "mailbox_member.added"
  | "mailbox_member.removed"
  | "mailbox_member.role_changed"
  | "private_domain.added"
  | "private_domain.deleted"
  | "private_domain.verified"
  | "mailbox.deleted"
  | "mailbox.created"
  | "inbound_webhook.auth_failed"
  | "inbound_webhook.delivered";

export async function auditLog(
  userId: string | null,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata: Json = {},
) {
  try {
    await getServiceClient().from("audit_logs").insert({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    });
  } catch (err) {
    // Audit logging must never break user-facing operations.
    captureException(err instanceof Error ? err : new Error(String(err)), {
      source: "auditLog",
      action,
      targetType,
    });
  }
}
