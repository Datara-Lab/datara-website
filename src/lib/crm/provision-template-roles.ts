import {
  and,
  eq,
} from "drizzle-orm";

import {
  db,
} from "@/db";

import {
  rolePermissions,
  roles,
} from "@/db/schema";

import {
  getCRMIndustryConfig,
} from "@/lib/crm-config";

export async function provisionCRMTemplateRoles(
  tenantId: string,
  tenantName: string,
  industry: string,
) {
  const tenantConfig =
    getCRMIndustryConfig(
      industry,
      tenantId,
      tenantName,
    );

  const templateRoles =
    tenantConfig?.defaultRoles ??
    [];

  if (
    templateRoles.length ===
    0
  ) {
    return;
  }

  const now =
    new Date();

  for (
    const templateRole of
    templateRoles
  ) {
    await db
      .insert(roles)
      .values({
        tenantId,

        key:
          templateRole.key,

        name:
          templateRole.name,

        description:
          templateRole
            .description,

        product:
          templateRole.product,

        isSystem: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          roles.tenantId,
          roles.key,
        ],

        set: {
          name:
            templateRole.name,

          description:
            templateRole
              .description,

          product:
            templateRole.product,

          isSystem: true,
          updatedAt: now,
        },
      });

    const [role] =
      await db
        .select({
          id:
            roles.id,
        })
        .from(roles)
        .where(
          and(
            eq(
              roles.tenantId,
              tenantId,
            ),
            eq(
              roles.key,
              templateRole.key,
            ),
          ),
        )
        .limit(1);

    if (!role) {
      throw new Error(
        `No fue posible aprovisionar el rol ${templateRole.name}.`,
      );
    }

    for (
      const permission of
      templateRole.permissions
    ) {
      await db
        .insert(
          rolePermissions,
        )
        .values({
          roleId:
            role.id,

          moduleId:
            permission.moduleId,

          canView:
            permission.canView ??
            false,

          canCreate:
            permission.canCreate ??
            false,

          canEdit:
            permission.canEdit ??
            false,

          canDelete:
            permission.canDelete ??
            false,

          canManage:
            permission.canManage ??
            false,

          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            rolePermissions
              .roleId,
            rolePermissions
              .moduleId,
          ],

          set: {
            canView:
              permission.canView ??
              false,

            canCreate:
              permission.canCreate ??
              false,

            canEdit:
              permission.canEdit ??
              false,

            canDelete:
              permission.canDelete ??
              false,

            canManage:
              permission.canManage ??
              false,

            updatedAt: now,
          },
        });
    }
  }
}

export default provisionCRMTemplateRoles;