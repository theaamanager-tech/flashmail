import { getServiceClient } from "./supabase.server";
import { AppError, ForbiddenError, NotFoundError } from "./errors.server";
import { auditLog } from "./audit.server";
import { generateDomainVerificationToken, verifyDomainDns } from "./dns-verification.server";
import type { Database } from "@/lib/database.types";

export type DomainOption = {
  id: string;
  name: string;
  type: "public" | "private";
  active: boolean;
  verification_status: string;
};

export async function getAvailableDomains(userId: string) {
  const [publicRes, privateRes] = await Promise.all([
    getServiceClient().from("public_domains").select("*").eq("active", true),
    getServiceClient()
      .from("private_domains")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("verification_status", "verified")
      .eq("routing_status", "enabled"),
  ]);

  const publicDomains: DomainOption[] = (publicRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    type: "public",
    active: d.active,
    verification_status: d.dns_status,
  }));

  const privateDomains: DomainOption[] = (privateRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.domain,
    type: "private",
    active: d.is_active,
    verification_status: d.verification_status,
  }));

  return { publicDomains, privateDomains, all: [...publicDomains, ...privateDomains] };
}

export async function getDomainByName(name: string, userId: string) {
  const clean = name.trim().toLowerCase();
  const [publicRes, privateRes] = await Promise.all([
    getServiceClient()
      .from("public_domains")
      .select("*")
      .eq("name", clean)
      .eq("active", true)
      .single(),
    getServiceClient()
      .from("private_domains")
      .select("*")
      .eq("domain", clean)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single(),
  ]);

  if (publicRes.data) {
    return { ...publicRes.data, type: "public" as const };
  }
  if (privateRes.data) {
    return { ...privateRes.data, type: "private" as const };
  }
  return null;
}

export async function addPrivateDomain(userId: string, domain: string) {
  const clean = domain.trim().toLowerCase().replace(/^@/, "");
  if (!clean || clean.length < 3 || !clean.includes(".")) {
    throw new AppError("Domain tidak valid");
  }

  const [publicConflict, privateConflict] = await Promise.all([
    getServiceClient().from("public_domains").select("id").eq("name", clean).maybeSingle(),
    getServiceClient().from("private_domains").select("id").eq("domain", clean).maybeSingle(),
  ]);

  if (publicConflict.data || privateConflict.data) {
    throw new AppError("Domain sudah digunakan");
  }

  const verificationToken = generateDomainVerificationToken();

  const { data, error } = await getServiceClient()
    .from("private_domains")
    .insert({ user_id: userId, domain: clean, verification_token: verificationToken })
    .select()
    .single();

  if (error || !data) throw new AppError("Gagal menambahkan domain");

  await auditLog(userId, "private_domain.added", "private_domain", data.id, {
    domain: clean,
    verification_token_prefix: verificationToken.slice(0, 8),
  });
  return data;
}

export async function deletePrivateDomain(userId: string, domainId: string) {
  const existing = await getServiceClient()
    .from("private_domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", userId)
    .single();

  if (!existing.data) throw new NotFoundError("Domain tidak ditemukan");

  const { error } = await getServiceClient().from("private_domains").delete().eq("id", domainId);
  if (error) throw new AppError("Gagal menghapus domain");

  await auditLog(userId, "private_domain.deleted", "private_domain", domainId, {
    domain: existing.data.domain,
  });
}

export async function verifyPrivateDomainMock(userId: string, domainId: string) {
  const existing = await getServiceClient()
    .from("private_domains")
    .select("*")
    .eq("id", domainId)
    .eq("user_id", userId)
    .single();

  if (!existing.data) throw new NotFoundError("Domain tidak ditemukan");

  const domain = existing.data.domain;
  const token = existing.data.verification_token ?? undefined;
  const dnsResult = await verifyDomainDns(domain, token ?? undefined);

  if (!dnsResult.verified) {
    await getServiceClient()
      .from("private_domains")
      .update({ verification_status: "error" })
      .eq("id", domainId);
    throw new AppError(dnsResult.reason ?? "Verifikasi DNS gagal");
  }

  const { data, error } = await getServiceClient()
    .from("private_domains")
    .update({ verification_status: "verified", routing_status: "enabled", is_active: true })
    .eq("id", domainId)
    .select()
    .single();

  if (error || !data) throw new AppError("Gagal memverifikasi domain");

  await auditLog(userId, "private_domain.verified", "private_domain", domainId, {
    domain: data.domain,
  });
  return data;
}

export async function listPrivateDomains(userId: string) {
  const { data, error } = await getServiceClient()
    .from("private_domains")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("Gagal memuat domain");
  return data ?? [];
}

export async function listPublicDomains() {
  const { data, error } = await getServiceClient()
    .from("public_domains")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new AppError("Gagal memuat domain publik");
  return data ?? [];
}

export async function togglePublicDomain(adminId: string, domainId: string) {
  const existing = await getServiceClient()
    .from("public_domains")
    .select("*")
    .eq("id", domainId)
    .single();
  if (!existing.data) throw new NotFoundError("Domain tidak ditemukan");

  const { data, error } = await getServiceClient()
    .from("public_domains")
    .update({ active: !existing.data.active })
    .eq("id", domainId)
    .select()
    .single();

  if (error || !data) throw new AppError("Gagal mengubah status domain");
  return data;
}

export async function addPublicDomain(adminId: string, name: string) {
  const clean = name.trim().toLowerCase().replace(/^@/, "");
  const { data, error } = await getServiceClient()
    .from("public_domains")
    .insert({ name: clean })
    .select()
    .single();
  if (error || !data) throw new AppError("Gagal menambahkan domain publik");
  return data;
}

export async function deletePublicDomain(adminId: string, domainId: string) {
  const { error } = await getServiceClient().from("public_domains").delete().eq("id", domainId);
  if (error) throw new AppError("Gagal menghapus domain publik");
}
