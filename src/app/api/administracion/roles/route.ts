import {
  and,
  asc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

import {
  memberProductRoles,
  rolePermissions,
  roles,
  tenantMembers,
} from "@/db/schema";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
  getPermissionModules,
  permissionModules,
} from "@/lib/administration/permission-modules";

export const dynamic = "force-dynamic";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type PermissionPayload = {
  moduleId?: unknown;
  canView?: unknown;
  canCreate?: unknown;
  canEdit?: unknown;
  canDelete?: unknown;
  canManage?: unknown;
};

type RolePayload = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  product?: unknown;
  permissions?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function getBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function createRoleKey(
  name: string,
): string {
  const normalized =
    name
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .slice(0, 60);

  return (
    normalized ||
    `rol-${crypto.randomUUID().slice(0, 8)}`
  );
}

function getProduct(
  value: unknown,
): Product | null {
  if (value === null) {
    return null;
  }

  if (
    value === "crm" ||
    value === "analytics" ||
    value === "cloud"
  ) {
    return value;
  }

  throw new ApiError(
    "Selecciona un producto válido para el rol.",
    400,
  );
}

function getPermissions(
  value: unknown,
): Array<{
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
}> {
  if (!Array.isArray(value)) {
    throw new ApiError(
      "La configuración de permisos no es válida.",
      400,
    );
  }

  const permissions =
    value.map(
      (item) => {
        if (!isRecord(item)) {
          throw new ApiError(
            "Uno de los permisos no tiene un formato válido.",
            400,
          );
        }

        const permission =
          item as PermissionPayload;

        const moduleId =
          getOptionalString(
            permission.moduleId,
          );

        if (!moduleId) {
          throw new ApiError(
            "Cada permiso debe indicar un módulo.",
            400,
          );
        }

        const canManage =
          getBoolean(
            permission.canManage,
          );

        const canDelete =
          canManage ||
          getBoolean(
            permission.canDelete,
          );

        const canEdit =
          canDelete ||
          getBoolean(
            permission.canEdit,
          );

        const canCreate =
          canEdit ||
          getBoolean(
            permission.canCreate,
          );

        const canView =
          canCreate ||
          getBoolean(
            permission.canView,
          );

        return {
          moduleId,
          canView,
          canCreate,
          canEdit,
          canDelete,
          canManage,
        };
      },
    );

  const moduleIds =
    new Set(
      permissions.map(
        (permission) =>
          permission.moduleId,
      ),
    );

  if (
    moduleIds.size !==
    permissions.length
  ) {
    throw new ApiError(
      "No se puede repetir un módulo dentro del mismo rol.",
      400,
    );
  }

  return permissions;
}

function createErrorResponse(
  error: unknown,
) {
    if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }
  if (
    error instanceof
    AdministrationAuthError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(
    "No fue posible cargar los roles:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cargar los roles.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
  try {
    const {
      tenantId,
    } = await requireAdminContext();

    const availableRoles = await db
      .select({
        id: roles.id,
        key: roles.key,
        name: roles.name,
        description:
          roles.description,
        product: roles.product,
        isSystem:
          roles.isSystem,
      })
      .from(roles)
      .where(
        eq(
          roles.tenantId,
          tenantId,
        ),
      )
      .orderBy(
        asc(roles.product),
        asc(roles.name),
      );

    const permissionRecords =
      await db
        .select({
          roleId:
            rolePermissions.roleId,
          moduleId:
            rolePermissions.moduleId,
          canView:
            rolePermissions.canView,
          canCreate:
            rolePermissions.canCreate,
          canEdit:
            rolePermissions.canEdit,
          canDelete:
            rolePermissions.canDelete,
          canManage:
            rolePermissions.canManage,
        })
        .from(rolePermissions)
        .innerJoin(
          roles,
          eq(
            rolePermissions.roleId,
            roles.id,
          ),
        )
        .where(
          eq(
            roles.tenantId,
            tenantId,
          ),
        )
        .orderBy(
          asc(
            rolePermissions.moduleId,
          ),
        );

    const rolesWithPermissions =
      availableRoles.map(
        (role) => ({
          ...role,

          permissions:
            permissionRecords.filter(
              (permission) =>
                permission.roleId ===
                role.id,
            ),
        }),
      );

    const globalRoles =
      rolesWithPermissions.filter(
        (role) =>
          role.product === null,
      );

    const productRoles = {
      crm:
        rolesWithPermissions.filter(
          (role) =>
            role.product === "crm",
        ),

      analytics:
        rolesWithPermissions.filter(
          (role) =>
            role.product ===
            "analytics",
        ),

      cloud:
        rolesWithPermissions.filter(
          (role) =>
            role.product === "cloud",
        ),
    };

    return NextResponse.json({
      success: true,

      data: {
        globalRoles,
        productRoles,
        permissionModules,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await requireAdminContext();

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información del rol no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as RolePayload;

    const name =
      getOptionalString(
        values.name,
      );

    if (!name) {
      throw new ApiError(
        "El nombre del rol es obligatorio.",
        400,
      );
    }

    if (name.length > 100) {
      throw new ApiError(
        "El nombre del rol no puede superar los 100 caracteres.",
        400,
      );
    }

    const description =
      getOptionalString(
        values.description,
      ) ?? null;

    const product =
      getProduct(
        values.product,
      );

    const permissions =
      getPermissions(
        values.permissions,
      );

        const allowedModuleIds =
      new Set(
        getPermissionModules(
          product,
        ).map(
          (module) =>
            module.id,
        ),
      );

    const invalidPermission =
      permissions.find(
        (permission) =>
          !allowedModuleIds.has(
            permission.moduleId,
          ),
      );

    if (invalidPermission) {
      throw new ApiError(
        `El módulo "${invalidPermission.moduleId}" no corresponde al producto seleccionado.`,
        400,
      );
    }

    const key =
      `${createRoleKey(name)}-${crypto.randomUUID().slice(0, 8)}`;

    const [createdRole] =
      await db
        .insert(roles)
        .values({
          tenantId,
          key,
          name,
          description,
          product,
          isSystem: false,
        })
        .returning({
          id: roles.id,
          key: roles.key,
          name: roles.name,
          description:
            roles.description,
          product: roles.product,
          isSystem:
            roles.isSystem,
        });

    if (!createdRole) {
      throw new ApiError(
        "No fue posible crear el rol.",
        500,
      );
    }

    try {
      if (
        permissions.length > 0
      ) {
        await db
          .insert(
            rolePermissions,
          )
          .values(
            permissions.map(
              (permission) => ({
                roleId:
                  createdRole.id,

                ...permission,
              }),
            ),
          );
      }
    } catch (permissionError) {
      await db
        .delete(roles)
        .where(
          eq(
            roles.id,
            createdRole.id,
          ),
        );

      throw permissionError;
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "El rol fue creado correctamente.",

        data: {
          ...createdRole,
          permissions,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await requireAdminContext();

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información del rol no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as RolePayload;

    const roleId =
      getOptionalString(
        values.id,
      );

    if (!roleId) {
      throw new ApiError(
        "No fue posible identificar el rol.",
        400,
      );
    }

    const [existingRole] =
      await db
        .select({
          id: roles.id,
          key: roles.key,
          name: roles.name,
          description:
            roles.description,
          product: roles.product,
          isSystem:
            roles.isSystem,
        })
        .from(roles)
        .where(
          and(
            eq(
              roles.id,
              roleId,
            ),
            eq(
              roles.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existingRole) {
      throw new ApiError(
        "El rol no existe.",
        404,
      );
    }

    const requestedName =
      getOptionalString(
        values.name,
      );

    const name =
      existingRole.isSystem
        ? existingRole.name
        : requestedName;

    if (!name) {
      throw new ApiError(
        "El nombre del rol es obligatorio.",
        400,
      );
    }

    if (name.length > 100) {
      throw new ApiError(
        "El nombre del rol no puede superar los 100 caracteres.",
        400,
      );
    }

    const description =
      existingRole.isSystem
        ? existingRole.description
        : getOptionalString(
            values.description,
          ) ?? null;

    const permissions =
      getPermissions(
        values.permissions,
      );

    const allowedModuleIds =
      new Set(
        getPermissionModules(
          existingRole.product,
        ).map(
          (module) =>
            module.id,
        ),
      );

    const invalidPermission =
      permissions.find(
        (permission) =>
          !allowedModuleIds.has(
            permission.moduleId,
          ),
      );

    if (invalidPermission) {
      throw new ApiError(
        `El módulo "${invalidPermission.moduleId}" no corresponde al producto del rol.`,
        400,
      );
    }

    await db
      .update(roles)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            roles.id,
            roleId,
          ),
          eq(
            roles.tenantId,
            tenantId,
          ),
        ),
      );

    await db
      .delete(
        rolePermissions,
      )
      .where(
        eq(
          rolePermissions.roleId,
          roleId,
        ),
      );

    if (permissions.length > 0) {
      await db
        .insert(
          rolePermissions,
        )
        .values(
          permissions.map(
            (permission) => ({
              roleId,
              ...permission,
            }),
          ),
        );
    }

    return NextResponse.json({
      success: true,

      message:
        "El rol y sus permisos fueron actualizados correctamente.",

      data: {
        ...existingRole,
        name,
        description,
        permissions,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await requireAdminContext();

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const roleId =
      getOptionalString(
        requestBody.id,
      );

    if (!roleId) {
      throw new ApiError(
        "No fue posible identificar el rol.",
        400,
      );
    }

    const [role] =
      await db
        .select({
          id: roles.id,
          name: roles.name,
          isSystem:
            roles.isSystem,
        })
        .from(roles)
        .where(
          and(
            eq(
              roles.id,
              roleId,
            ),
            eq(
              roles.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!role) {
      throw new ApiError(
        "El rol no existe.",
        404,
      );
    }

    if (role.isSystem) {
      throw new ApiError(
        "Los roles del sistema no se pueden eliminar.",
        400,
      );
    }

    const [
      globalAssignment,
    ] = await db
      .select({
        id: tenantMembers.id,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(
            tenantMembers.tenantId,
            tenantId,
          ),
          eq(
            tenantMembers.roleId,
            roleId,
          ),
        ),
      )
      .limit(1);

    const [
      productAssignment,
    ] = await db
      .select({
        memberId:
          memberProductRoles.memberId,
      })
      .from(
        memberProductRoles,
      )
      .where(
        and(
          eq(
            memberProductRoles.tenantId,
            tenantId,
          ),
          eq(
            memberProductRoles.roleId,
            roleId,
          ),
        ),
      )
      .limit(1);

    if (
      globalAssignment ||
      productAssignment
    ) {
      throw new ApiError(
        "No puedes eliminar un rol que está asignado a uno o más usuarios.",
        409,
      );
    }

    await db
      .delete(roles)
      .where(
        and(
          eq(
            roles.id,
            roleId,
          ),
          eq(
            roles.tenantId,
            tenantId,
          ),
        ),
      );

    return NextResponse.json({
      success: true,

      message:
        `El rol "${role.name}" fue eliminado correctamente.`,
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}