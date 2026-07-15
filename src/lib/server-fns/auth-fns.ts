import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSessionUser, requireUser } from "@/lib/server/auth.server";
import { getUserClientFromServerFn } from "@/lib/server/supabase.server";
import { AppError } from "@/lib/server/errors.server";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionUser();
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .validator(updateProfileSchema)
  .handler(async ({ data }) => {
    const { user } = await requireUser();
    const name = data.name.trim();
    if (!name) throw new AppError("Nama tidak boleh kosong");

    // Use the user-context client so RLS enforces that the caller can only update
    // their own profile.
    const client = getUserClientFromServerFn();
    const { error } = await client.from("profiles").update({ name }).eq("id", user.id);

    if (error) throw new AppError("Gagal memperbarui profil");
    return { success: true };
  });
