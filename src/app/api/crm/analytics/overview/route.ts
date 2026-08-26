import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  gte,
  inArray,
  lt,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/db";

import {
  crmDeals,
  crmLeads,
  crmQuotes,
  crmSalesOrders,
  tenants,
} from "@/db/schema";

import {
  getAITopUpSummary,
} from "@/lib/ai/credits";

import {
  getTenantAIConfiguration,
  getTenantAIUsage,
} from "@/lib/ai/entitlements";

import {
  CRMBranchAccessError,
  getCRMBranchAccess,
  validateCRMBranchId,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

const DAY_IN_MILLISECONDS =
  86_400_000;

const MAXIMUM_PERIOD_DAYS =
  366;

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

function formatDate(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(
      0,
      10,
    );
}

function parseDate(
  value: string,
  fieldName: string,
): Date {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new ApiError(
      `${fieldName} debe tener el formato AAAA-MM-DD.`,
      400,
    );
  }

  const parsedDate =
    new Date(
      `${value}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    ) ||
    formatDate(
      parsedDate,
    ) !== value
  ) {
    throw new ApiError(
      `${fieldName} no es una fecha válida.`,
      400,
    );
  }

  return parsedDate;
}

function getPeriod(
  requestUrl: URL,
) {
  const requestedFrom =
    requestUrl.searchParams
      .get("from")
      ?.trim() ??
    null;

  const requestedTo =
    requestUrl.searchParams
      .get("to")
      ?.trim() ??
    null;

  const today =
    new Date();

  const defaultTo =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );

  const to =
    requestedTo
      ? parseDate(
          requestedTo,
          "La fecha final",
        )
      : defaultTo;

  const from =
    requestedFrom
      ? parseDate(
          requestedFrom,
          "La fecha inicial",
        )
      : new Date(
          to.getTime() -
            (
              29 *
              DAY_IN_MILLISECONDS
            ),
        );

  const toExclusive =
    new Date(
      to.getTime() +
        DAY_IN_MILLISECONDS,
    );

  if (
    from >=
    toExclusive
  ) {
    throw new ApiError(
      "La fecha inicial debe ser anterior o igual a la fecha final.",
      400,
    );
  }

  const periodDays =
    Math.ceil(
      (
        toExclusive.getTime() -
        from.getTime()
      ) /
        DAY_IN_MILLISECONDS,
    );

  if (
    periodDays >
    MAXIMUM_PERIOD_DAYS
  ) {
    throw new ApiError(
      `El periodo no puede superar ${MAXIMUM_PERIOD_DAYS} días.`,
      400,
    );
  }

  return {
    from,
    to,
    toExclusive,
    periodDays,
  };
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
      ApiError ||
    error instanceof
      CRMBranchAccessError ||
    error instanceof
      CRMPermissionError
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status:
          error.status,
      },
    );
  }

  console.error(
    "No fue posible generar Analytics del CRM:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible generar Analytics del CRM.",
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
      permissions,
    ] =
      await Promise.all([
        getCRMBranchAccess(
          tenant.id,
          userId,
        ),

        requireCRMModulePermission(
          tenant.id,
          userId,
          "crm-analytics",
          "view",
        ),
      ]);

    const requestUrl =
      new URL(
        request.url,
      );

    const period =
      getPeriod(
        requestUrl,
      );

    const requestedBranchId =
      requestUrl.searchParams
        .get("branchId")
        ?.trim() ??
      null;

    const selectedBranchId =
      requestedBranchId
        ? await validateCRMBranchId(
            tenant.id,
            branchAccess,
            requestedBranchId,
          )
        : null;

    const scopedBranchIds:
      string[] |
      null =
      selectedBranchId
        ? [
            selectedBranchId,
          ]
        : branchAccess
            .allBranches
          ? null
          : branchAccess
              .branchIds;

    const noBranchAccess =
      scopedBranchIds !==
        null &&
      scopedBranchIds.length ===
        0;

    const leadScope =
      and(
        eq(
          crmLeads.tenantId,
          tenant.id,
        ),

        scopedBranchIds ===
          null
          ? undefined
          : noBranchAccess
            ? sql<boolean>`false`
            : inArray(
                crmLeads.branchId,
                scopedBranchIds,
              ),
      );

    const dealScope =
      and(
        eq(
          crmDeals.tenantId,
          tenant.id,
        ),

        scopedBranchIds ===
          null
          ? undefined
          : noBranchAccess
            ? sql<boolean>`false`
            : inArray(
                crmDeals.branchId,
                scopedBranchIds,
              ),
      );

    const quoteScope =
      and(
        eq(
          crmQuotes.tenantId,
          tenant.id,
        ),

        scopedBranchIds ===
          null
          ? undefined
          : noBranchAccess
            ? sql<boolean>`false`
            : inArray(
                crmQuotes.branchId,
                scopedBranchIds,
              ),
      );

    const orderScope =
      and(
        eq(
          crmSalesOrders
            .tenantId,
          tenant.id,
        ),

        scopedBranchIds ===
          null
          ? undefined
          : noBranchAccess
            ? sql<boolean>`false`
            : inArray(
                crmSalesOrders
                  .branchId,
                scopedBranchIds,
              ),
      );

    const leadMonth =
      sql<string>`
        to_char(
          date_trunc(
            'month',
            ${crmLeads.createdAt}
          ),
          'YYYY-MM'
        )
      `;

    const dealMonth =
      sql<string>`
        to_char(
          date_trunc(
            'month',
            ${crmDeals.createdAt}
          ),
          'YYYY-MM'
        )
      `;

    const orderMonth =
      sql<string>`
        to_char(
          date_trunc(
            'month',
            ${crmSalesOrders.deliveredAt}
          ),
          'YYYY-MM'
        )
      `;

    const [
      leadMetrics,
      openDealMetrics,
      dealMetrics,
      quoteMetrics,
      confirmedOrderMetrics,
      deliveredOrderMetrics,
      leadTrend,
      dealTrend,
      orderTrend,
    ] =
      await Promise.all([
        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,
          })
          .from(crmLeads)
          .where(
            and(
              leadScope,
              gte(
                crmLeads.createdAt,
                period.from,
              ),
              lt(
                crmLeads.createdAt,
                period.toExclusive,
              ),
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,

            value:
              sql<number>`
                coalesce(
                  sum(
                    ${crmDeals.totalAmount}
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmDeals)
          .where(
            and(
              dealScope,

              gte(
                crmDeals.createdAt,
                period.from,
              ),

              lt(
                crmDeals.createdAt,
                period.toExclusive,
              ),
            ),
          ),

        db
          .select({
            createdCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmDeals.createdAt} >= ${period.from}
                    and
                    ${crmDeals.createdAt} < ${period.toExclusive}
                )::integer
              `,

            closedCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmDeals.closedAt} >= ${period.from}
                    and
                    ${crmDeals.closedAt} < ${period.toExclusive}
                )::integer
              `,

            wonCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmDeals.closedAt} >= ${period.from}
                    and
                    ${crmDeals.closedAt} < ${period.toExclusive}
                    and (
                      lower(
                        ${crmDeals.stage}
                      ) like '%ganada%'
                      or
                      lower(
                        ${crmDeals.status}
                      ) = 'ganada'
                    )
                )::integer
              `,

            wonValue:
              sql<number>`
                coalesce(
                  sum(
                    ${crmDeals.totalAmount}
                  ) filter (
                    where
                      ${crmDeals.closedAt} >= ${period.from}
                      and
                      ${crmDeals.closedAt} < ${period.toExclusive}
                      and (
                        lower(
                          ${crmDeals.stage}
                        ) like '%ganada%'
                        or
                        lower(
                          ${crmDeals.status}
                        ) = 'ganada'
                      )
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmDeals)
          .where(dealScope),

        db
          .select({
            createdCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmQuotes.createdAt} >= ${period.from}
                    and
                    ${crmQuotes.createdAt} < ${period.toExclusive}
                )::integer
              `,

            sentCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmQuotes.sentAt} >= ${period.from}
                    and
                    ${crmQuotes.sentAt} < ${period.toExclusive}
                )::integer
              `,

            acceptedCount:
              sql<number>`
                count(*) filter (
                  where
                    ${crmQuotes.acceptedAt} >= ${period.from}
                    and
                    ${crmQuotes.acceptedAt} < ${period.toExclusive}
                )::integer
              `,

            acceptedValue:
              sql<number>`
                coalesce(
                  sum(
                    ${crmQuotes.totalAmount}
                  ) filter (
                    where
                      ${crmQuotes.acceptedAt} >= ${period.from}
                      and
                      ${crmQuotes.acceptedAt} < ${period.toExclusive}
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmQuotes)
          .where(quoteScope),

        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,

            value:
              sql<number>`
                coalesce(
                  sum(
                    ${crmSalesOrders.totalAmount}
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmSalesOrders)
          .where(
            and(
              orderScope,

              gte(
                crmSalesOrders.confirmedAt,
                period.from,
              ),

              lt(
                crmSalesOrders.confirmedAt,
                period.toExclusive,
              ),
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)::integer
              `,

            value:
              sql<number>`
                coalesce(
                  sum(
                    ${crmSalesOrders.totalAmount}
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmSalesOrders)
          .where(
            and(
              orderScope,

              gte(
                crmSalesOrders.deliveredAt,
                period.from,
              ),

              lt(
                crmSalesOrders.deliveredAt,
                period.toExclusive,
              ),
            ),
          ),

        db
          .select({
            month:
              leadMonth,

            count:
              sql<number>`
                count(*)::integer
              `,
          })
          .from(crmLeads)
          .where(
            and(
              leadScope,

              gte(
                crmLeads.createdAt,
                period.from,
              ),

              lt(
                crmLeads.createdAt,
                period.toExclusive,
              ),
            ),
          )
          .groupBy(
            leadMonth,
          )
          .orderBy(
            leadMonth,
          ),

        db
          .select({
            month:
              dealMonth,

            count:
              sql<number>`
                count(*)::integer
              `,
          })
          .from(crmDeals)
          .where(
            and(
              dealScope,

              gte(
                crmDeals.createdAt,
                period.from,
              ),

              lt(
                crmDeals.createdAt,
                period.toExclusive,
              ),
            ),
          )
          .groupBy(
            dealMonth,
          )
          .orderBy(
            dealMonth,
          ),

        db
          .select({
            month:
              orderMonth,

            count:
              sql<number>`
                count(*)::integer
              `,

            value:
              sql<number>`
                coalesce(
                  sum(
                    ${crmSalesOrders.totalAmount}
                  ),
                  0
                )::double precision
              `,
          })
          .from(crmSalesOrders)
          .where(
            and(
              orderScope,

              gte(
                crmSalesOrders.deliveredAt,
                period.from,
              ),

              lt(
                crmSalesOrders.deliveredAt,
                period.toExclusive,
              ),
            ),
          )
          .groupBy(
            orderMonth,
          )
          .orderBy(
            orderMonth,
          ),
      ]);

    const leads =
      Number(
        leadMetrics[0]
          ?.count ?? 0,
      );

    const dealsCreated =
      Number(
        dealMetrics[0]
          ?.createdCount ?? 0,
      );

    const dealsWon =
      Number(
        dealMetrics[0]
          ?.wonCount ?? 0,
      );

    const dealsClosed =
      Number(
        dealMetrics[0]
          ?.closedCount ?? 0,
      );

    const quotesCreated =
      Number(
        quoteMetrics[0]
          ?.createdCount ?? 0,
      );

    const quotesSent =
      Number(
        quoteMetrics[0]
          ?.sentCount ?? 0,
      );

    const quotesAccepted =
      Number(
        quoteMetrics[0]
          ?.acceptedCount ?? 0,
      );

    const confirmedOrders =
      Number(
        confirmedOrderMetrics[0]
          ?.count ?? 0,
      );

    const deliveredOrders =
      Number(
        deliveredOrderMetrics[0]
          ?.count ?? 0,
      );

    const conversionRate =
      dealsClosed > 0
        ? Number(
            (
              (
                dealsWon /
                dealsClosed
              ) *
              100
            ).toFixed(2),
          )
        : 0;

    const quoteAcceptanceRate =
      quotesSent > 0
        ? Number(
            (
              (
                quotesAccepted /
                quotesSent
              ) *
              100
            ).toFixed(2),
          )
        : 0;

    const monthMap =
      new Map<
        string,
        {
          month: string;
          leads: number;
          deals: number;
          deliveredOrders: number;
          revenue: number;
        }
      >();

    const getMonthRecord = (
      month: string,
    ) => {
      const existing =
        monthMap.get(
          month,
        );

      if (existing) {
        return existing;
      }

      const created = {
        month,
        leads: 0,
        deals: 0,
        deliveredOrders: 0,
        revenue: 0,
      };

      monthMap.set(
        month,
        created,
      );

      return created;
    };

    for (
      const record of
      leadTrend
    ) {
      getMonthRecord(
        record.month,
      ).leads =
        Number(
          record.count,
        );
    }

    for (
      const record of
      dealTrend
    ) {
      getMonthRecord(
        record.month,
      ).deals =
        Number(
          record.count,
        );
    }

    for (
      const record of
      orderTrend
    ) {
      const month =
        getMonthRecord(
          record.month,
        );

      month.deliveredOrders =
        Number(
          record.count,
        );

      month.revenue =
        Number(
          record.value,
        );
    }

    const trends =
      Array.from(
        monthMap.values(),
      ).sort(
        (
          first,
          second,
        ) =>
          first.month.localeCompare(
            second.month,
          ),
      );

    const [
      aiConfiguration,
      aiMessagesUsed,
      aiExtraCredits,
    ] =
      await Promise.all([
        getTenantAIConfiguration(
          tenant.id,
          "crm",
        ),

        getTenantAIUsage(
          tenant.id,
          "crm",
        ),

        getAITopUpSummary(
          tenant.id,
          "crm",
        ),
      ]);

    const aiUsage =
      aiConfiguration
        .monthlyMessageLimit >
        0 ||
      aiExtraCredits.original >
        0
        ? {
            assistantName:
              aiConfiguration
                .assistantName,

            monthly: {
              used:
                aiMessagesUsed,

              limit:
                aiConfiguration
                  .monthlyMessageLimit,

              remaining:
                Math.max(
                  0,

                  aiConfiguration
                    .monthlyMessageLimit -
                    aiMessagesUsed,
                ),
            },

            extra: {
              original:
                aiExtraCredits.original,

              used:
                aiExtraCredits.used,

              remaining:
                aiExtraCredits.remaining,

              nextExpiresAt:
                aiExtraCredits
                  .nextExpiresAt
                  ?.toISOString() ??
                null,
            },
          }
        : null;

    return NextResponse.json({
      success: true,

      data: {
        period: {
          from:
            formatDate(
              period.from,
            ),

          to:
            formatDate(
              period.to,
            ),

          days:
            period.periodDays,
        },

        scope: {
          branchId:
            selectedBranchId,

          allBranches:
            scopedBranchIds ===
            null,

          branchIds:
            scopedBranchIds ??
            [],
        },

      aiUsage,

        metrics: {
          leadsCreated:
            leads,

          openDeals:
            Number(
              openDealMetrics[0]
                ?.count ?? 0,
            ),

          openPipelineValue:
            Number(
              openDealMetrics[0]
                ?.value ?? 0,
            ),

          dealsCreated,

          dealsWon,

          dealsClosed,

          wonRevenue:
            Number(
              dealMetrics[0]
                ?.wonValue ?? 0,
            ),

          conversionRate,

          quotesCreated,

          quotesSent,

          quotesAccepted,

          acceptedQuoteValue:
            Number(
              quoteMetrics[0]
                ?.acceptedValue ?? 0,
            ),

          quoteAcceptanceRate,

          confirmedOrders,

          confirmedOrderValue:
            Number(
              confirmedOrderMetrics[0]
                ?.value ?? 0,
            ),

          deliveredOrders,

          deliveredRevenue:
            Number(
              deliveredOrderMetrics[0]
                ?.value ?? 0,
            ),
        },

        funnel: [
          {
            id: "leads",
            label: "Prospectos",
            count:
              leads,
          },
          {
            id: "deals",
            label: "Oportunidades",
            count:
              dealsCreated,
          },
          {
            id: "quotes",
            label: "Cotizaciones",
            count:
              quotesCreated,
          },
          {
            id: "confirmed-orders",
            label: "Órdenes confirmadas",
            count:
              confirmedOrders,
          },
          {
            id: "delivered-orders",
            label: "Órdenes entregadas",
            count:
              deliveredOrders,
          },
        ],

        trends,
      },

      permissions,
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
