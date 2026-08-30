import { auth } from "@clerk/nextjs/server";

import {
  desc,
  eq,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import { db } from "@/db";

import {
  fiscalProviderRequests,
  fiscalStampLedgerEntries,
  fiscalTenantAccounts,
  tenants,
} from "@/db/schema";

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

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError ||
    error instanceof CRMPermissionError
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
    "No fue posible consultar el consumo fiscal:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible consultar el consumo fiscal.",
    },
    {
      status: 500,
    },
  );
}

export async function GET() {
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
          id: tenants.id,
        })
        .from(tenants)
        .where(
          eq(
            tenants.clerkOrganizationId,
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

    await requireCRMModulePermission(
      tenant.id,
      userId,
      "invoice-control",
      "view",
    );

    let canManage = false;

    try {
      await requireCRMModulePermission(
        tenant.id,
        userId,
        "invoice-control",
        "manage",
      );

      canManage = true;
    } catch (permissionError) {
      if (
        !(permissionError instanceof
          CRMPermissionError)
      ) {
        throw permissionError;
      }
    }

    const [
      accountRows,
      movementRows,
      requestRows,
    ] = await Promise.all([
      db
        .select()
        .from(
          fiscalTenantAccounts,
        )
        .where(
          eq(
            fiscalTenantAccounts.tenantId,
            tenant.id,
          ),
        )
        .limit(1),

      db
        .select({
          id:
            fiscalStampLedgerEntries.id,
          invoiceId:
            fiscalStampLedgerEntries.invoiceId,
          entryType:
            fiscalStampLedgerEntries.entryType,
          stampDelta:
            fiscalStampLedgerEntries.stampDelta,
          monthlyRemainingAfter:
            fiscalStampLedgerEntries
              .monthlyRemainingAfter,
          topUpRemainingAfter:
            fiscalStampLedgerEntries
              .topUpRemainingAfter,
          providerCost:
            fiscalStampLedgerEntries.providerCost,
          currency:
            fiscalStampLedgerEntries.currency,
          createdAt:
            fiscalStampLedgerEntries.createdAt,
        })
        .from(
          fiscalStampLedgerEntries,
        )
        .where(
          eq(
            fiscalStampLedgerEntries.tenantId,
            tenant.id,
          ),
        )
        .orderBy(
          desc(
            fiscalStampLedgerEntries.createdAt,
          ),
        )
        .limit(100),

      db
        .select({
          id:
            fiscalProviderRequests.id,
          invoiceId:
            fiscalProviderRequests.invoiceId,
          operation:
            fiscalProviderRequests.operation,
          status:
            fiscalProviderRequests.status,
          provider:
            fiscalProviderRequests.provider,
          fiscalUuid:
            fiscalProviderRequests.fiscalUuid,
          errorMessage:
            fiscalProviderRequests.errorMessage,
          createdAt:
            fiscalProviderRequests.createdAt,
        })
        .from(
          fiscalProviderRequests,
        )
        .where(
          eq(
            fiscalProviderRequests.tenantId,
            tenant.id,
          ),
        )
        .orderBy(
          desc(
            fiscalProviderRequests.createdAt,
          ),
        )
        .limit(50),
    ]);

    const account =
      accountRows[0];

    const includedMonthlyStamps =
      account?.includedMonthlyStamps ?? 0;

    const usedMonthlyStamps =
      account?.usedMonthlyStamps ?? 0;

    const monthlyRemaining =
      Math.max(
        0,
        includedMonthlyStamps -
          usedMonthlyStamps,
      );

    const topUpRemaining =
      account?.topUpStampBalance ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        account: {
          configured:
            Boolean(account),
          enabled:
            account?.enabled ?? false,
          status:
            account?.status ?? "active",
          includedMonthlyStamps,
          usedMonthlyStamps,
          monthlyRemaining,
          topUpRemaining,
          totalRemaining:
            monthlyRemaining +
            topUpRemaining,
          monthlyWindowStart:
            account?.monthlyWindowStart ?? null,
          monthlyWindowEnd:
            account?.monthlyWindowEnd ?? null,
        },
        movements:
          movementRows.map(
            (movement) => ({
              ...movement,
              providerCost:
                Number(
                  movement.providerCost,
                ),
            }),
          ),
        providerRequests:
          requestRows,
        permissions: {
          canView: true,
          canManage,
        },
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
