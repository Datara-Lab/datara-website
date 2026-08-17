import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    desc,
    eq,
    isNotNull,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import Stripe from "stripe";

import {
    createStripeClient,
} from "@/lib/commercial/create-stripe-client";

import {
    db,
} from "@/db";

import {
    subscriptions,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic =
    "force-dynamic";

type StripePortalEnvironment = {
    STRIPE_SECRET_KEY?: string;
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

function getEnvironment():
    StripePortalEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        StripePortalEnvironment;
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError ||
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
        "No fue posible abrir el portal de pagos:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible abrir el portal de pagos.",
        },
        {
            status: 500,
        },
    );
}

export async function POST(
    request: Request,
) {
    try {
        const {
            tenantId,
        } = await requireAdminContext();

        const environment =
            getEnvironment();

        const stripeSecretKey =
            environment
                .STRIPE_SECRET_KEY ??
            process.env
                .STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            throw new ApiError(
                "El servicio de pagos no está configurado.",
                500,
            );
        }

        const [subscription] =
            await db
                .select({
                    providerCustomerId:
                        subscriptions
                            .providerCustomerId,
                })
                .from(
                    subscriptions,
                )
                .where(
                    and(
                        eq(
                            subscriptions.tenantId,
                            tenantId,
                        ),

                        eq(
                            subscriptions.provider,
                            "stripe",
                        ),

                        isNotNull(
                            subscriptions
                                .providerCustomerId,
                        ),
                    ),
                )
                .orderBy(
                    desc(
                        subscriptions.createdAt,
                    ),
                )
                .limit(1);

        if (
            !subscription
                ?.providerCustomerId
        ) {
            throw new ApiError(
                "Esta empresa todavía no tiene una cuenta de facturación en Stripe.",
                409,
            );
        }

        const stripe =
            createStripeClient(
                stripeSecretKey,
            );

        const requestUrl =
            new URL(
                request.url,
            );

        const portalSession =
            await stripe
                .billingPortal
                .sessions
                .create({
                    customer:
                        subscription
                            .providerCustomerId,

                    return_url:
                        `${requestUrl.origin}/administracion/suscripcion`,
                });

        return NextResponse.json({
            success: true,

            data: {
                portalUrl:
                    portalSession.url,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}