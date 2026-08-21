import {
  auth,
} from "@clerk/nextjs/server";

import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/db";

import {
  crmActivities,
  crmCustomers,
  crmDeals,
  crmLeads,
  crmQuotes,
  tenants,
} from "@/db/schema";

export const dynamic =
  "force-dynamic";

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.status =
      status;
  }
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof ApiError
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
    "No fue posible cargar el resumen del CRM:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cargar el resumen del CRM.",
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

    if (
      !userId ||
      !orgId
    ) {
      throw new ApiError(
        "No hay una sesión activa.",
        401,
      );
    }

    const [tenant] =
      await db
        .select({
          id:
            tenants.id,
        })
        .from(
          tenants,
        )
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
      activeLeadsResult,
      openDealsResult,
      pipelineResult,
      convertedCustomersResult,
      totalLeadsResult,
      pipelineStagesResult,
      pendingFollowUpsResult,
      upcomingMeetingsResult,
      expiringQuotesResult,
      closingDealsResult,
      staleDealsResult,
      priorityDealsResult,
    ] =
      await Promise.all([
        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmLeads,
          )
          .where(
            and(
              eq(
                crmLeads
                  .tenantId,
                tenant.id,
              ),

              sql`
                lower(${crmLeads.status})
                not in (
                  'convertido',
                  'cerrado',
                  'perdido'
                )
              `,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmDeals,
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),
            ),
          ),

        db
          .select({
            total:
              sql<string>`
                coalesce(
                  sum(
                    ${crmDeals.totalAmount}
                  ),
                  0
                )
              `,
          })
          .from(
            crmDeals,
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmCustomers,
          )
          .where(
            and(
              eq(
                crmCustomers
                  .tenantId,
                tenant.id,
              ),

              sql`
                ${crmCustomers.sourceLeadId}
                is not null
              `,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmLeads,
          )
          .where(
            eq(
              crmLeads
                .tenantId,
              tenant.id,
            ),
          ),

        db
          .select({
            stage:
              crmDeals.stage,

            count:
              sql<number>`
                count(*)
              `,

            total:
              sql<string>`
                coalesce(
                  sum(
                    ${crmDeals.totalAmount}
                  ),
                  0
                )
              `,
          })
          .from(
            crmDeals,
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),
            ),
          )
          .groupBy(
            crmDeals.stage,
          ),
        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmActivities,
          )
          .where(
            and(
              eq(
                crmActivities
                  .tenantId,
                tenant.id,
              ),

              sql`
                lower(${crmActivities.status})
                not in (
                  'completada',
                  'completado',
                  'cancelada',
                  'cancelado'
                )
              `,

              sql`
                ${crmActivities.dueAt}
                is not null
              `,

              sql`
                ${crmActivities.dueAt}
                <= now()
              `,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmActivities,
          )
          .where(
            and(
              eq(
                crmActivities
                  .tenantId,
                tenant.id,
              ),

              sql`
                lower(${crmActivities.type})
                in (
                  'meeting',
                  'reunion',
                  'reunión'
                )
              `,

              sql`
                ${crmActivities.startAt}
                >= now()
              `,

              sql`
                ${crmActivities.startAt}
                < now() +
                interval '3 days'
              `,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmQuotes,
          )
          .where(
            and(
              eq(
                crmQuotes
                  .tenantId,
                tenant.id,
              ),

              sql`
                ${crmQuotes.validUntil}
                is not null
              `,

              sql`
                ${crmQuotes.validUntil}
                >= now()
              `,

              sql`
                ${crmQuotes.validUntil}
                < now() +
                interval '7 days'
              `,

              sql`
                lower(${crmQuotes.status})
                not in (
                  'aceptada',
                  'aceptado',
                  'rechazada',
                  'rechazado',
                  'convertida',
                  'convertido'
                )
              `,
            ),
          ),
        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmDeals,
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),

              sql`
                ${crmDeals.expectedCloseAt}
                is not null
              `,

              sql`
                ${crmDeals.expectedCloseAt}
                >= now()
              `,

              sql`
                ${crmDeals.expectedCloseAt}
                < now() +
                interval '7 days'
              `,
            ),
          ),

        db
          .select({
            count:
              sql<number>`
                count(*)
              `,
          })
          .from(
            crmDeals,
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),

              sql`
                ${crmDeals.updatedAt}
                < now() -
                interval '7 days'
              `,
            ),
          ),
                  db
          .select({
            id:
              crmDeals.id,

            name:
              crmDeals.name,

            stage:
              crmDeals.stage,

            probability:
              crmDeals.probability,

            totalAmount:
              crmDeals.totalAmount,

            currency:
              crmDeals.currency,

            customerId:
              crmDeals.customerId,

            customerName:
              crmCustomers.name,

            customerLastName:
              crmCustomers.lastName,

            customerCompanyName:
              crmCustomers.companyName,
          })
          .from(
            crmDeals,
          )
          .leftJoin(
            crmCustomers,
            and(
              eq(
                crmCustomers.id,
                crmDeals.customerId,
              ),

              eq(
                crmCustomers.tenantId,
                tenant.id,
              ),
            ),
          )
          .where(
            and(
              eq(
                crmDeals
                  .tenantId,
                tenant.id,
              ),

              eq(
                crmDeals.status,
                "Abierta",
              ),
            ),
          )
          .orderBy(
            sql`
              coalesce(
                ${crmDeals.probability},
                0
              ) desc
            `,

            sql`
              ${crmDeals.totalAmount}
              desc
            `,
          )
          .limit(5),
      ]);

    const activeLeads =
      Number(
        activeLeadsResult[
          0
        ]?.count ??
          0,
      );

    const openDeals =
      Number(
        openDealsResult[
          0
        ]?.count ??
          0,
      );

    const pipelineTotal =
      Number(
        pipelineResult[
          0
        ]?.total ??
          0,
      );

    const convertedCustomers =
      Number(
        convertedCustomersResult[
          0
        ]?.count ??
          0,
      );

    const totalLeads =
      Number(
        totalLeadsResult[
          0
        ]?.count ??
          0,
      );

    const conversionRate =
      totalLeads > 0
        ? (
            convertedCustomers /
            totalLeads
          ) *
          100
        : 0;

    const pipelineStages =
      pipelineStagesResult
        .map(
          (stage) => ({
            name:
              stage.stage,

            count:
              Number(
                stage.count ??
                  0,
              ),

            total:
              Number(
                stage.total ??
                  0,
              ),
          }),
        )
        .sort(
          (
            firstStage,
            secondStage,
          ) =>
            secondStage.total -
            firstStage.total,
        );

    const largestPipelineStage =
      pipelineStages.reduce(
        (
          largest,
          stage,
        ) =>
          Math.max(
            largest,
            stage.total,
          ),
        0,
      );

    const pipelineStagesWithWidth =
      pipelineStages.map(
        (stage) => ({
          ...stage,

          width:
            largestPipelineStage >
            0
              ? Math.max(
                  8,
                  Math.round(
                    (
                      stage.total /
                      largestPipelineStage
                    ) *
                      100,
                  ),
                )
              : 0,
        }),
      );

    const pendingFollowUps =
      Number(
        pendingFollowUpsResult[
          0
        ]?.count ??
          0,
      );

    const upcomingMeetings =
      Number(
        upcomingMeetingsResult[
          0
        ]?.count ??
          0,
      );

    const expiringQuotes =
      Number(
        expiringQuotesResult[
          0
        ]?.count ??
          0,
      );

    const closingDeals =
      Number(
        closingDealsResult[
          0
        ]?.count ??
          0,
      );

    const staleDeals =
      Number(
        staleDealsResult[
          0
        ]?.count ??
          0,
      );

    const priorityDeals =
      priorityDealsResult.map(
        (deal) => {
          const customerName =
            [
              deal.customerName,
              deal.customerLastName,
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

          const company =
            deal.customerCompanyName
              ?.trim() ||
            customerName ||
            "Sin cliente vinculado";

          return {
            id:
              deal.id,

            name:
              deal.name,

            stage:
              deal.stage,

            probability:
              deal.probability ??
              0,

            totalAmount:
              Number(
                deal.totalAmount ??
                  0,
              ),

            currency:
              deal.currency,

            customerId:
              deal.customerId,

            company,
          };
        },
      );

    const alerts = [
      pendingFollowUps > 0
        ? {
            id:
              "pending-follow-ups",

            title:
              `${pendingFollowUps} ${
                pendingFollowUps === 1
                  ? "actividad vencida"
                  : "actividades vencidas"
              }`,

            description:
              "Hay actividades pendientes cuya fecha límite ya pasó.",

            tone:
              "warning",
          }
        : null,

      closingDeals > 0
        ? {
            id:
              "closing-deals",

            title:
              `${closingDeals} ${
                closingDeals === 1
                  ? "oportunidad cerca del cierre"
                  : "oportunidades cerca del cierre"
              }`,

            description:
              "Tienen una fecha estimada de cierre dentro de los próximos siete días.",

            tone:
              "info",
          }
        : null,

      staleDeals > 0
        ? {
            id:
              "stale-deals",

            title:
              `${staleDeals} ${
                staleDeals === 1
                  ? "oportunidad requiere seguimiento"
                  : "oportunidades requieren seguimiento"
              }`,

            description:
              "No han sido actualizadas durante los últimos siete días.",

            tone:
              "danger",
          }
        : null,

      expiringQuotes > 0
        ? {
            id:
              "expiring-quotes",

            title:
              `${expiringQuotes} ${
                expiringQuotes === 1
                  ? "cotización por vencer"
                  : "cotizaciones por vencer"
              }`,

            description:
              "Su vigencia termina durante los próximos siete días.",

            tone:
              "warning",
          }
        : null,
    ].filter(
      (
        alert,
      ): alert is {
        id: string;
        title: string;
        description: string;
        tone:
          | "success"
          | "warning"
          | "danger"
          | "info";
      } =>
        alert !== null,
    );

    return NextResponse.json({
      success: true,

      data: {
        metrics: {
          activeLeads,
          openDeals,
          pipelineTotal,
          conversionRate,
        },

        pipelineStages:
          pipelineStagesWithWidth,

        activitySummary: {
          pendingFollowUps,
          upcomingMeetings,
          expiringQuotes,
        },

        alerts,

        priorityDeals,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}