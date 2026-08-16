import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  crmProducts,
  inventoryAuditLogs,
  inventoryLocations,
  tenantBranches,
  tenants,
} from "@/db/schema";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

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

function getString(
  value:
    | string
    | null,
) {
  const normalized =
    value?.trim();

  return normalized ||
    undefined;
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof
      CRMBranchAccessError ||
    error instanceof
      CRMPermissionError
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
    "No fue posible consultar la auditoría de inventario:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible consultar la auditoría de inventario.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const {
      userId,
      orgId,
    } = await auth();

    if (!userId) {
      throw new ApiError(
        "No autenticado.",
        401,
      );
    }

    if (!orgId) {
      throw new ApiError(
        "No hay una organización activa.",
        400,
      );
    }

    const [tenant] =
      await db
        .select({
          id:
            tenants.id,
        })
        .from(tenants)
        .where(
          eq(
            tenants
              .clerkOrganizationId,
            orgId,
          ),
        )
        .limit(1);

    if (!tenant) {
      throw new ApiError(
        "La empresa aún no está sincronizada.",
        404,
      );
    }

    const [
      branchAccess,
    ] = await Promise.all([
      getCRMBranchAccess(
        tenant.id,
        userId,
      ),

      requireCRMModulePermission(
        tenant.id,
        userId,
        "inventory",
        "manage",
      ),
    ]);

    const url =
      new URL(request.url);

    const entityType =
      getString(
        url.searchParams.get(
          "entityType",
        ),
      );

    const action =
      getString(
        url.searchParams.get(
          "action",
        ),
      );

    const productId =
      getString(
        url.searchParams.get(
          "productId",
        ),
      );

    const locationId =
      getString(
        url.searchParams.get(
          "locationId",
        ),
      );

    const requestedLimit =
      Number(
        url.searchParams.get(
          "limit",
        ),
      );

    const limit =
      Number.isInteger(
        requestedLimit,
      ) &&
      requestedLimit > 0
        ? Math.min(
            requestedLimit,
            500,
          )
        : 250;

    const branchCondition =
      branchAccess.allBranches
        ? sql<boolean>`true`
        : branchAccess
              .branchIds
              .length > 0
          ? inArray(
              inventoryAuditLogs
                .branchId,
              branchAccess
                .branchIds,
            )
          : sql<boolean>`false`;

    const records =
      await db
        .select({
          id:
            inventoryAuditLogs.id,

          entityType:
            inventoryAuditLogs
              .entityType,

          entityId:
            inventoryAuditLogs
              .entityId,

          action:
            inventoryAuditLogs
              .action,

          summary:
            inventoryAuditLogs
              .summary,

          reason:
            inventoryAuditLogs
              .reason,

          actorClerkUserId:
            inventoryAuditLogs
              .actorClerkUserId,

          actorName:
            inventoryAuditLogs
              .actorName,

          before:
            inventoryAuditLogs
              .before,

          after:
            inventoryAuditLogs
              .after,

          metadata:
            inventoryAuditLogs
              .metadata,

          createdAt:
            inventoryAuditLogs
              .createdAt,

          branchId:
            inventoryAuditLogs
              .branchId,

          branchName:
            tenantBranches.name,

          branchCode:
            tenantBranches.code,

          locationId:
            inventoryAuditLogs
              .locationId,

          locationName:
            inventoryLocations.name,

          locationCode:
            inventoryLocations.code,

          productId:
            inventoryAuditLogs
              .productId,

          productName:
            crmProducts.name,

          productCode:
            crmProducts.code,
        })
        .from(
          inventoryAuditLogs,
        )
        .leftJoin(
          tenantBranches,
          and(
            eq(
              inventoryAuditLogs
                .branchId,
              tenantBranches.id,
            ),
            eq(
              tenantBranches
                .tenantId,
              tenant.id,
            ),
          ),
        )
        .leftJoin(
          inventoryLocations,
          and(
            eq(
              inventoryAuditLogs
                .locationId,
              inventoryLocations.id,
            ),
            eq(
              inventoryLocations
                .tenantId,
              tenant.id,
            ),
          ),
        )
        .leftJoin(
          crmProducts,
          and(
            eq(
              inventoryAuditLogs
                .productId,
              crmProducts.id,
            ),
            eq(
              crmProducts
                .tenantId,
              tenant.id,
            ),
          ),
        )
        .where(
          and(
            eq(
              inventoryAuditLogs
                .tenantId,
              tenant.id,
            ),

            branchCondition,

            entityType
              ? eq(
                  inventoryAuditLogs
                    .entityType,
                  entityType,
                )
              : sql<boolean>`true`,

            action
              ? eq(
                  inventoryAuditLogs
                    .action,
                  action,
                )
              : sql<boolean>`true`,

            productId
              ? eq(
                  inventoryAuditLogs
                    .productId,
                  productId,
                )
              : sql<boolean>`true`,

            locationId
              ? eq(
                  inventoryAuditLogs
                    .locationId,
                  locationId,
                )
              : sql<boolean>`true`,
          ),
        )
        .orderBy(
          desc(
            inventoryAuditLogs
              .createdAt,
          ),
        )
        .limit(limit);

    return NextResponse.json({
      success: true,

      data:
        records.map(
          (record) => ({
            ...record,

            branchLabel:
              record.branchName
                ? record.branchCode
                  ? `${record.branchName} (${record.branchCode})`
                  : record.branchName
                : "Sin sucursal",

            locationLabel:
              record.locationName
                ? record.locationCode
                  ? `${record.locationName} (${record.locationCode})`
                  : record.locationName
                : "Sin ubicación",

            productLabel:
              record.productName
                ? record.productCode
                  ? `${record.productName} (${record.productCode})`
                  : record.productName
                : "No aplica",

            createdAt:
              record.createdAt
                .toISOString(),
          }),
        ),

      meta: {
        count:
          records.length,

        limit,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}