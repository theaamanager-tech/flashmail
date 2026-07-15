import { getServiceClient } from "./supabase.server";
import { getServerEnv } from "./env.server";
import { AppError, ForbiddenError, NotFoundError } from "./errors.server";
import { auditLog } from "./audit.server";
import { getAvailableDomains, getDomainByName } from "./domains.server";
import { getMailboxAccess } from "./access.server";
import { generateMailboxToken, generateToken, hashToken } from "@/lib/security";
import { sanitizeEmailHtml, sanitizeEmailSubject } from "@/lib/email-sanitizer";
import type { Database } from "@/lib/database.types";

type Mailbox = Database["public"]["Tables"]["mailboxes"]["Row"];
type Email = Database["public"]["Tables"]["emails"]["Row"];

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export type CreateMailboxInput = {
  username?: string;
  domain?: string;
  randomDomain?: boolean;
  domainScope?: "public" | "private" | "all";
  tokenEnabled?: boolean;
};

async function checkMailboxCreationLimits(userId: string) {
  const env = getServerEnv();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: activeCount }, { count: recentCount }] = await Promise.all([
    getServiceClient()
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "deleted"),
    getServiceClient()
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo),
  ]);

  if ((activeCount ?? 0) >= env.MAX_MAILBOXES_PER_USER) {
    throw new AppError("Batas maksimum mailbox tercapai");
  }
  if ((recentCount ?? 0) >= env.MAX_MAILBOX_CREATIONS_PER_HOUR) {
    throw new AppError("Terlalu banyak mailbox dibuat dalam 1 jam terakhir");
  }
}

export async function createMailbox(userId: string, input: CreateMailboxInput) {
  await checkMailboxCreationLimits(userId);

  const {
    username,
    domain,
    randomDomain = false,
    domainScope = "all",
    tokenEnabled = false,
  } = input;

  let resolvedUsername = (username ?? "").trim().toLowerCase();
  if (!resolvedUsername) {
    resolvedUsername = generateRandomUsername();
  }

  if (!USERNAME_RE.test(resolvedUsername)) {
    throw new AppError("Username 3–32 karakter (a-z, 0-9, . _ -)");
  }

  const { publicDomains, privateDomains, all } = await getAvailableDomains(userId);
  let resolvedDomain: { id: string; name: string; type: "public" | "private" } | null = null;

  if (randomDomain) {
    const pool =
      domainScope === "public" ? publicDomains : domainScope === "private" ? privateDomains : all;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) throw new AppError("Tidak ada domain yang tersedia");
    resolvedDomain = { id: pick.id, name: pick.name, type: pick.type };
  } else if (domain) {
    const found = await getDomainByName(domain, userId);
    if (!found) throw new AppError("Domain tidak tersedia atau tidak dimiliki");
    resolvedDomain = {
      id: found.id,
      name: "name" in found ? found.name : found.domain,
      type: "name" in found ? "public" : "private",
    };
  } else {
    throw new AppError("Pilih domain atau aktifkan random domain");
  }

  const emailAddress = `${resolvedUsername}@${resolvedDomain.name}`;

  // Verify address uniqueness
  const existing = await getServiceClient()
    .from("mailboxes")
    .select("id")
    .eq("email_address", emailAddress)
    .neq("status", "deleted")
    .maybeSingle();
  if (existing.data) throw new AppError("Alamat email sudah digunakan");

  function getTokenExpiry() {
    const hours = getServerEnv().MAILBOX_TOKEN_EXPIRY_HOURS;
    return hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
  }

  let accessTokenHash: string | null = null;
  let accessTokenExpiresAt: string | null = null;
  let plaintextToken: string | null = null;
  if (tokenEnabled) {
    const gen = generateMailboxToken();
    plaintextToken = gen.plaintext;
    accessTokenHash = await gen.hash;
    accessTokenExpiresAt = getTokenExpiry();
  }

  const { data: mailbox, error } = await getServiceClient()
    .from("mailboxes")
    .insert({
      user_id: userId,
      username: resolvedUsername,
      email_address: emailAddress,
      domain_type: resolvedDomain.type,
      domain_id: resolvedDomain.id,
      domain_name: resolvedDomain.name,
      access_token_hash: accessTokenHash,
      access_token_expires_at: accessTokenExpiresAt,
      token_enabled: tokenEnabled,
      status: "active",
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !mailbox) throw new AppError("Gagal membuat mailbox");

  // Create owner member record
  await getServiceClient().from("mailbox_members").insert({
    mailbox_id: mailbox.id,
    user_id: userId,
    role: "owner",
    can_regenerate_token: true,
  });

  await auditLog(userId, "mailbox.created", "mailbox", mailbox.id, {
    email: emailAddress,
    token_enabled: tokenEnabled,
  });

  return { mailbox, plaintextToken };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function listMailboxes(userId: string, filters: MailboxFilters = {}) {
  const { search, domain, status, domainType, tokenEnabled, sortBy = "newest" } = filters;

  // Securely collect mailbox IDs the user can access without SQL interpolation.
  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    getServiceClient()
      .from("mailboxes")
      .select("id")
      .eq("user_id", userId)
      .neq("status", "deleted"),
    getServiceClient().from("mailbox_members").select("mailbox_id").eq("user_id", userId),
  ]);

  const accessibleIds = new Set<string>([
    ...(owned ?? []).map((m) => m.id),
    ...(memberRows ?? []).map((m) => m.mailbox_id),
  ]);

  if (accessibleIds.size === 0) {
    return { items: [], total: 0 };
  }

  let query = getServiceClient()
    .from("mailboxes")
    .select("*", { count: "exact" })
    .in("id", Array.from(accessibleIds))
    .neq("status", "deleted");

  if (search) {
    const q = escapeLikePattern(search.trim().toLowerCase());
    query = query.or(`email_address.ilike.%${q}%,username.ilike.%${q}%`);
  }
  if (domain) {
    query = query.eq("domain_name", domain);
  }
  if (domainType) {
    query = query.eq("domain_type", domainType);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (tokenEnabled !== undefined) {
    query = query.eq("token_enabled", tokenEnabled);
  }

  switch (sortBy) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "most_emails":
      // Cannot sort by aggregate in this simple query; fallback to newest
      query = query.order("created_at", { ascending: false });
      break;
    case "last_activity":
      query = query.order("last_activity_at", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) throw new AppError("Gagal memuat mailbox");

  // Fetch email counts
  const mailboxes = data ?? [];
  const counts = await getEmailCounts(mailboxes.map((m) => m.id));

  return {
    items: mailboxes.map((m) => ({
      ...m,
      email_count: counts[m.id] ?? 0,
    })),
    total: count ?? 0,
  };
}

export type MailboxFilters = {
  search?: string;
  domain?: string;
  status?: "active" | "expired" | "deleted";
  domainType?: "public" | "private";
  tokenEnabled?: boolean;
  sortBy?: "newest" | "oldest" | "most_emails" | "last_activity";
};

async function getEmailCounts(mailboxIds: string[]) {
  if (mailboxIds.length === 0) return {};
  const { data } = await getServiceClient()
    .from("emails")
    .select("mailbox_id")
    .in("mailbox_id", mailboxIds);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((e) => {
    counts[e.mailbox_id] = (counts[e.mailbox_id] ?? 0) + 1;
  });
  return counts;
}

export async function getMailboxByPublicId(publicId: string, userId: string) {
  // Enforce authorization server-side; do not expose a mailbox merely by its public id.
  const access = await getMailboxAccess(publicId, { userId });
  return access.mailbox;
}

export async function getMailboxByEmailAddress(emailAddress: string) {
  const { data } = await getServiceClient()
    .from("mailboxes")
    .select("id, user_id")
    .eq("email_address", emailAddress.toLowerCase())
    .neq("status", "deleted")
    .single();
  return data ?? null;
}

export async function deleteMailbox(userId: string, mailboxId: string) {
  await requireMailboxOwner(mailboxId, userId);

  const { error } = await getServiceClient()
    .from("mailboxes")
    .update({
      status: "deleted",
      access_token_hash: null,
      access_token_expires_at: null,
      token_enabled: false,
    })
    .eq("id", mailboxId);

  if (error) throw new AppError("Gagal menghapus mailbox");
  await auditLog(userId, "mailbox.deleted", "mailbox", mailboxId, {});
}

export async function regenerateMailboxToken(userId: string, mailboxId: string) {
  const access = await requireMailboxOwnerOrRegenPermission(mailboxId, userId);
  const gen = generateMailboxToken();
  const hash = await gen.hash;
  const hours = getServerEnv().MAILBOX_TOKEN_EXPIRY_HOURS;
  const expiresAt = hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;

  const { error } = await getServiceClient()
    .from("mailboxes")
    .update({ access_token_hash: hash, access_token_expires_at: expiresAt, token_enabled: true })
    .eq("id", mailboxId);

  if (error) throw new AppError("Gagal regenerate token");

  await auditLog(userId, "mailbox_token.regenerated", "mailbox", mailboxId, {
    role: access.role,
  });

  return { plaintextToken: gen.plaintext };
}

export async function setTokenEnabled(userId: string, mailboxId: string, enabled: boolean) {
  const mailbox = await requireMailboxOwner(mailboxId, userId);

  let accessTokenHash = mailbox.access_token_hash;
  let accessTokenExpiresAt = mailbox.access_token_expires_at;
  if (enabled && !accessTokenHash) {
    const gen = generateMailboxToken();
    accessTokenHash = await gen.hash;
    const hours = getServerEnv().MAILBOX_TOKEN_EXPIRY_HOURS;
    accessTokenExpiresAt =
      hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
  }

  const { error } = await getServiceClient()
    .from("mailboxes")
    .update({
      token_enabled: enabled,
      access_token_hash: enabled ? accessTokenHash : null,
      access_token_expires_at: enabled ? accessTokenExpiresAt : null,
    })
    .eq("id", mailboxId);

  if (error) throw new AppError("Gagal mengubah token");

  await auditLog(
    userId,
    enabled ? "mailbox_token.enabled" : "mailbox_token.disabled",
    "mailbox",
    mailboxId,
    {},
  );
}

export async function listEmails(
  mailboxId: string,
  options: { search?: string; isRead?: boolean; limit?: number; offset?: number } = {},
) {
  let query = getServiceClient()
    .from("emails")
    .select("*", { count: "exact" })
    .eq("mailbox_id", mailboxId)
    .order("received_at", { ascending: false });

  if (options.isRead !== undefined) {
    query = query.eq("is_read", options.isRead);
  }
  if (options.search) {
    const q = options.search.trim();
    query = query.or(`subject.ilike.%${q}%,sender.ilike.%${q}%,recipient.ilike.%${q}%`);
  }
  if (options.limit) {
    query = query.range(options.offset ?? 0, (options.offset ?? 0) + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new AppError("Gagal memuat email");
  return { items: (data ?? []) as Email[], total: count ?? 0 };
}

export async function getEmail(emailId: string, mailboxId: string) {
  const { data, error } = await getServiceClient()
    .from("emails")
    .select("*")
    .eq("id", emailId)
    .eq("mailbox_id", mailboxId)
    .single();

  if (error || !data) throw new NotFoundError("Email tidak ditemukan");
  return data as Email;
}

export async function markEmailRead(userId: string, emailId: string, mailboxId: string) {
  await requireMailboxOwner(mailboxId, userId);
  const { error } = await getServiceClient()
    .from("emails")
    .update({ is_read: true })
    .eq("id", emailId)
    .eq("mailbox_id", mailboxId);
  if (error) throw new AppError("Gagal menandai email");
}

const MAX_EMAIL_TEXT_BYTES = 1_048_576; // 1 MB
const MAX_EMAIL_HTML_BYTES = 1_048_576; // 1 MB

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export async function receiveIncomingEmail(
  mailboxId: string,
  payload: {
    sender: string;
    senderName?: string;
    recipient: string;
    subject: string;
    textBody?: string;
    htmlBody?: string;
  },
) {
  const textBody = payload.textBody ?? "";
  const htmlBody = payload.htmlBody ? sanitizeEmailHtml(payload.htmlBody) : "";

  if (byteLength(textBody) > MAX_EMAIL_TEXT_BYTES || byteLength(htmlBody) > MAX_EMAIL_HTML_BYTES) {
    throw new AppError("Email body exceeds maximum size", 413, "PAYLOAD_TOO_LARGE");
  }

  const { data, error } = await getServiceClient().rpc("try_receive_email", {
    p_mailbox_id: mailboxId,
    p_sender: payload.sender,
    p_sender_name: payload.senderName ?? payload.sender,
    p_recipient: payload.recipient,
    p_subject: sanitizeEmailSubject(payload.subject),
    p_text_body: textBody,
    p_html_body: htmlBody,
  });

  if (error) throw new AppError("Gagal menerima email");
  const result = (data as {
    success: boolean;
    received_count: number;
    daily_limit: number;
  } | null) ?? {
    success: false,
    received_count: 0,
    daily_limit: 500,
  };
  return result;
}

export async function getMailboxMembers(mailboxId: string) {
  const { data, error } = await getServiceClient()
    .from("mailbox_members")
    .select("*, profiles(name)")
    .eq("mailbox_id", mailboxId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("Gagal memuat anggota");
  return data ?? [];
}

export async function inviteMailboxMember(
  ownerId: string,
  mailboxId: string,
  email: string,
  role: "member" | "viewer",
  canRegenerate: boolean,
) {
  const mailbox = await requireMailboxOwner(mailboxId, ownerId);

  const cleanEmail = email.trim().toLowerCase();
  const userRes = await getServiceClient()
    .from("profiles")
    .select("id")
    .ilike("email", cleanEmail)
    .single();

  if (!userRes.data) throw new AppError("Pengguna dengan email tersebut tidak ditemukan");
  const invitedUserId = userRes.data.id;
  if (invitedUserId === ownerId) throw new AppError("Tidak bisa mengundang diri sendiri");

  const { error } = await getServiceClient().from("mailbox_members").upsert(
    {
      mailbox_id: mailboxId,
      user_id: invitedUserId,
      role,
      can_regenerate_token: canRegenerate,
    },
    { onConflict: "mailbox_id,user_id" },
  );

  if (error) throw new AppError("Gagal menambahkan anggota");

  await auditLog(ownerId, "mailbox_member.added", "mailbox_member", invitedUserId, {
    mailbox_id: mailboxId,
    role,
    can_regenerate: canRegenerate,
  });

  return mailbox;
}

export async function removeMailboxMember(ownerId: string, mailboxId: string, memberId: string) {
  await requireMailboxOwner(mailboxId, ownerId);

  const { error } = await getServiceClient()
    .from("mailbox_members")
    .delete()
    .eq("id", memberId)
    .neq("role", "owner");

  if (error) throw new AppError("Gagal menghapus anggota");
  await auditLog(ownerId, "mailbox_member.removed", "mailbox_member", memberId, {
    mailbox_id: mailboxId,
  });
}

export async function updateMailboxMemberRole(
  ownerId: string,
  mailboxId: string,
  memberId: string,
  role: "member" | "viewer",
  canRegenerate: boolean,
) {
  await requireMailboxOwner(mailboxId, ownerId);

  const { error } = await getServiceClient()
    .from("mailbox_members")
    .update({ role, can_regenerate_token: canRegenerate })
    .eq("id", memberId)
    .eq("mailbox_id", mailboxId)
    .neq("role", "owner");

  if (error) throw new AppError("Gagal mengubah peran anggota");
  await auditLog(ownerId, "mailbox_member.role_changed", "mailbox_member", memberId, {
    mailbox_id: mailboxId,
    role,
    can_regenerate: canRegenerate,
  });
}

function generateRandomUsername(): string {
  const adjectives = [
    "silent",
    "cosmic",
    "neon",
    "lunar",
    "misty",
    "pixel",
    "vivid",
    "atlas",
    "nova",
    "onyx",
    "ember",
    "aurora",
    "cobalt",
    "eclipse",
    "frost",
    "galaxy",
    "indigo",
    "jade",
    "solar",
    "topaz",
  ];
  const nouns = [
    "fox",
    "wave",
    "wolf",
    "byte",
    "fern",
    "harbor",
    "comet",
    "tiger",
    "raven",
    "otter",
    "atlas",
    "meadow",
    "echo",
    "phoenix",
    "cipher",
    "willow",
    "panther",
    "falcon",
    "lynx",
    "nebula",
  ];
  const adj = adjectives[randomInt(adjectives.length)];
  const noun = nouns[randomInt(nouns.length)];
  const num = randomInt(90) + 10;
  return `${adj}${noun}${num}`;
}

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

async function requireMailboxOwner(mailboxId: string, userId: string) {
  const { data: mailbox } = await getServiceClient()
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .neq("status", "deleted")
    .single();

  if (!mailbox) throw new NotFoundError("Mailbox tidak ditemukan");
  if (mailbox.user_id !== userId)
    throw new ForbiddenError("Hanya pemilik mailbox yang boleh melakukan ini");
  return mailbox;
}

async function requireMailboxOwnerOrRegenPermission(mailboxId: string, userId: string) {
  const mailboxRes = await getServiceClient()
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .neq("status", "deleted")
    .single();

  if (!mailboxRes.data) throw new NotFoundError("Mailbox tidak ditemukan");
  const mailbox = mailboxRes.data;

  if (mailbox.user_id === userId) {
    return { mailbox, role: "owner" as const, canRegenerate: true };
  }

  const memberRes = await getServiceClient()
    .from("mailbox_members")
    .select("*")
    .eq("mailbox_id", mailboxId)
    .eq("user_id", userId)
    .single();

  const member = memberRes.data;
  const canRegenerate = member?.role === "member" && member.can_regenerate_token;
  if (!canRegenerate) throw new ForbiddenError("Kamu tidak memiliki izin regenerate token");

  return { mailbox, role: member.role, canRegenerate: true };
}
