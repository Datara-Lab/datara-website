import {
    desc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    commercialPurchases,
    subscriptions,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic =
    "force-dynamic";

function createErrorResponse(
    error: unknown,
) {
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
        "No fue posible consultar la suscripción:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible consultar la suscripción.",
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

        const [subscription] =
            await db
                .select({
                    id:
                        subscriptions.id,

                    provider:
                        subscriptions.provider,

                    providerSubscriptionId:
                        subscriptions
                            .providerSubscriptionId,

                    providerScheduleId:
                        subscriptions
                            .providerScheduleId,

                    productKey:
                        subscriptions.productKey,

                    planKey:
                        subscriptions.planKey,

                    billingPeriod:
                        subscriptions
                            .billingPeriod,

                    catalogItemIds:
                        subscriptions
                            .catalogItemIds,

                    pendingBillingPeriod:
                        subscriptions
                            .pendingBillingPeriod,

                    pendingCatalogItemIds:
                        subscriptions
                            .pendingCatalogItemIds,

                    pendingChangeAt:
                        subscriptions
                            .pendingChangeAt,

                    status:
                        subscriptions.status,

                    seats:
                        subscriptions.seats,

                    currency:
                        subscriptions.currency,

                    currentPeriodStart:
                        subscriptions
                            .currentPeriodStart,

                    currentPeriodEnd:
                        subscriptions
                            .currentPeriodEnd,

                    cancelAtPeriodEnd:
                        subscriptions
                            .cancelAtPeriodEnd,

                    createdAt:
                        subscriptions.createdAt,

                    updatedAt:
                        subscriptions.updatedAt,
                })
                .from(
                    subscriptions,
                )
                .where(
                    eq(
                        subscriptions.tenantId,
                        tenantId,
                    ),
                )
                .orderBy(
                    desc(
                        subscriptions.createdAt,
                    ),
                )
                .limit(1);

        if (!subscription) {
            return NextResponse.json({
                success: true,

                data: {
                    subscription:
                        null,

                    purchase:
                        null,
                },
            });
        }

        const [purchase] =
            subscription
                .providerSubscriptionId
                ? await db
                    .select({
                        id:
                            commercialPurchases.id,

                        productKey:
                            commercialPurchases
                                .productKey,

                        industry:
                            commercialPurchases
                                .industry,

                        billingPeriod:
                            commercialPurchases
                                .billingPeriod,

                        lineItems:
                            commercialPurchases
                                .lineItems,

                        currency:
                            commercialPurchases
                                .currency,

                        totalAmount:
                            commercialPurchases
                                .totalAmount,

                        paidAt:
                            commercialPurchases
                                .paidAt,
                    })
                    .from(
                        commercialPurchases,
                    )
                    .where(
                        eq(
                            commercialPurchases
                                .stripeSubscriptionId,
                            subscription
                                .providerSubscriptionId,
                        ),
                    )
                    .orderBy(
                        desc(
                            commercialPurchases
                                .updatedAt,
                        ),
                    )
                    .limit(1)
                : [];

        return NextResponse.json({
            success: true,

            data: {
                subscription,

                purchase:
                    purchase ?? null,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}