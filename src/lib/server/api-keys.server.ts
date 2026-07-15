import { getServiceClient } from "./supabase.server";
import { AppError, NotFoundError } from "./errors.server";
import { auditLog } from "./audit.server";
import { generateApiKey, hashToken } from "@/lib/security";

export async function listApiKeys(userId: string) {
  const { data, error } = await getServiceClient()
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("Gagal memuat API keys");
  return data ?? [];
}

export async function createApiKey(userId: string, name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new AppError("Nama API key wajib diisi");

  const gen = generateApiKey();
  const hash = await gen.hash;

  const { data, error } = await getServiceClient()
    .from("api_keys")
    .insert({
      user_id: userId,
      name: cleanName,
      key_prefix: gen.prefix,
      key_hash: hash,
    })
    .select()
    .single();

  if (error || !data) throw new AppError("Gagal membuat API key");

  await auditLog(userId, "api_key.created", "api_key", data.id, { name: cleanName });
  return { apiKey: data, plaintext: gen.plaintext };
}

export async function revokeApiKey(userId: string, keyId: string) {
  const existing = await getServiceClient()
    .from("api_keys")
    .select("*")
    .eq("id", keyId)
    .eq("user_id", userId)
    .single();

  if (!existing.data) throw new NotFoundError("API key tidak ditemukan");

  const { error } = await getServiceClient()
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", keyId);
  if (error) throw new AppError("Gagal revoke API key");

  await auditLog(userId, "api_key.revoked", "api_key", keyId, { name: existing.data.name });
}

export async function regenerateApiKey(userId: string, keyId: string) {
  const existing = await getServiceClient()
    .from("api_keys")
    .select("*")
    .eq("id", keyId)
    .eq("user_id", userId)
    .single();

  if (!existing.data) throw new NotFoundError("API key tidak ditemukan");

  const gen = generateApiKey();
  const hash = await gen.hash;

  const { data, error } = await getServiceClient()
    .from("api_keys")
    .update({ key_hash: hash, key_prefix: gen.prefix, last_used_at: null })
    .eq("id", keyId)
    .select()
    .single();

  if (error || !data) throw new AppError("Gagal regenerate API key");

  await auditLog(userId, "api_key.regenerated", "api_key", keyId, { name: existing.data.name });
  return { apiKey: data, plaintext: gen.plaintext };
}

export async function renameApiKey(userId: string, keyId: string, name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new AppError("Nama tidak boleh kosong");

  const { error } = await getServiceClient()
    .from("api_keys")
    .update({ name: cleanName })
    .eq("id", keyId)
    .eq("user_id", userId);

  if (error) throw new AppError("Gagal rename API key");
}

export async function findApiKeyByPlaintext(plaintext: string) {
  const hash = await hashToken(plaintext);
  const { data, error } = await getServiceClient()
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}
