import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth.server";
import {
  getGlobalStats,
  getSystemSettings,
  listUsers,
  setUserAdmin,
  setUserSuspended,
  updateSystemSetting,
} from "@/lib/server/admin.server";
import {
  addPublicDomain,
  deletePublicDomain,
  listPublicDomains,
  togglePublicDomain,
} from "@/lib/server/domains.server";
import {
  setUserSuspendedSchema,
  setUserAdminSchema,
  systemSettingSchema,
  publicDomainNameSchema,
  publicDomainIdSchema,
} from "@/lib/validation-schemas";

export const getAdminStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getGlobalStats();
});

export const listUsersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return listUsers();
});

export const setUserSuspendedFn = createServerFn({ method: "POST" })
  .validator(setUserSuspendedSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    await setUserSuspended(user.id, data.userId, data.suspended);
    return { success: true };
  });

export const setUserAdminFn = createServerFn({ method: "POST" })
  .validator(setUserAdminSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    await setUserAdmin(user.id, data.userId, data.isAdmin);
    return { success: true };
  });

export const getSystemSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getSystemSettings();
});

export const updateSystemSettingFn = createServerFn({ method: "POST" })
  .validator(systemSettingSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    await updateSystemSetting(user.id, data.key, data.value);
    return { success: true };
  });

export const listPublicDomainsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return listPublicDomains();
});

export const addPublicDomainFn = createServerFn({ method: "POST" })
  .validator(publicDomainNameSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    return addPublicDomain(user.id, data.name);
  });

export const deletePublicDomainFn = createServerFn({ method: "POST" })
  .validator(publicDomainIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    await deletePublicDomain(user.id, data.id);
    return { success: true };
  });

export const togglePublicDomainFn = createServerFn({ method: "POST" })
  .validator(publicDomainIdSchema)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    return togglePublicDomain(user.id, data.id);
  });
