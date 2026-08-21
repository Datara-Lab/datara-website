import {
    auth,
    clerkClient,
    currentUser,
} from "@clerk/nextjs/server";

import {
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    getCRMIndustryTemplates,
} from "@/config/crm/industries";

import {
    db,
} from "@/db";

import {
    commercialPurchases,
} from "@/db/schema";

import {
    CRM_MODULE_PACKAGES,
    type CRMModulePackageKey,
} from "@/lib/crm/module-catalog";

import {
    resolveCRMModuleIds,
} from "@/lib/crm/provision-module-entitlements";

export const dynamic =
    "force-dynamic";

type PurchasePayload = {
    checkoutSessionId?: unknown;
    companyName?: unknown;
    taxId?: unknown;
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
        typeof value ===
        "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getCheckoutSessionId(
    value: unknown,
): string {
    if (
        typeof value !==
        "string" ||
        !value.startsWith(
            "cs_",
        )
    ) {
        throw new ApiError(
            "La sesión de pago no es válida.",
            400,
        );
    }

    return value;
}

function getCompanyName(
    value: unknown,
): string {
    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            "Escribe el nombre de tu empresa.",
            400,
        );
    }

    const companyName =
        value.trim();

    if (
        companyName.length <
        2 ||
        companyName.length >
        100
    ) {
        throw new ApiError(
            "El nombre de la empresa debe tener entre 2 y 100 caracteres.",
            400,
        );
    }

    return companyName;
}

function getTaxId(
    value: unknown,
): string {
    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            "Escribe el RFC de tu empresa.",
            400,
        );
    }

    const taxId =
        value
            .trim()
            .toUpperCase()
            .replace(
                /[\s-]/g,
                "",
            );

    const taxIdPattern =
        /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

    if (
        !taxIdPattern.test(
            taxId,
        )
    ) {
        throw new ApiError(
            "El RFC no tiene un formato válido.",
            400,
        );
    }

    if (
        taxId ===
        "XAXX010101000" ||
        taxId ===
        "XEXX010101000"
    ) {
        throw new ApiError(
            "El RFC genérico no puede utilizarse para contratar Datara.",
            400,
        );
    }

    return taxId;
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
        "No fue posible completar la contratación:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible crear la empresa. Intenta nuevamente.",
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
            userId,
        } = await auth();

        if (!userId) {
            throw new ApiError(
                "Inicia sesión para completar la contratación.",
                401,
            );
        }

        const user =
            await currentUser();

        if (!user) {
            throw new ApiError(
                "No fue posible consultar tu cuenta.",
                404,
            );
        }

        let requestBody:
            unknown;

        try {
            requestBody =
                await request.json();
        } catch {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        if (
            !isRecord(
                requestBody,
            )
        ) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const payload =
            requestBody as
            PurchasePayload;

        const checkoutSessionId =
            getCheckoutSessionId(
                payload.checkoutSessionId,
            );

        const companyName =
            getCompanyName(
                payload.companyName,
            );

        const taxId =
            getTaxId(
                payload.taxId,
            );

        const [purchase] =
            await db
                .select({
                    id:
                        commercialPurchases.id,

                    status:
                        commercialPurchases.status,

                    purchaseType:
                        commercialPurchases
                            .purchaseType,

                    ownerEmail:
                        commercialPurchases
                            .ownerEmail,

                    industry:
                        commercialPurchases
                            .industry,

                    billingPeriod:
                        commercialPurchases
                            .billingPeriod,

                    lineItems:
                        commercialPurchases
                            .lineItems,

                    clerkUserId:
                        commercialPurchases
                            .clerkUserId,

                    clerkOrganizationId:
                        commercialPurchases
                            .clerkOrganizationId,

                    stripeCustomerId:
                        commercialPurchases
                            .stripeCustomerId,

                    stripeSubscriptionId:
                        commercialPurchases
                            .stripeSubscriptionId,
                })
                .from(
                    commercialPurchases,
                )
                .where(
                    eq(
                        commercialPurchases
                            .stripeCheckoutSessionId,
                        checkoutSessionId,
                    ),
                )
                .limit(1);

        if (!purchase) {
            throw new ApiError(
                "No encontramos la contratación pagada.",
                404,
            );
        }

        if (
            purchase.purchaseType !==
            "new_customer"
        ) {
            throw new ApiError(
                "Esta contratación utiliza un flujo diferente.",
                400,
            );
        }

        if (
            purchase.clerkUserId &&
            purchase.clerkUserId !==
            userId
        ) {
            throw new ApiError(
                "Esta contratación pertenece a otra cuenta.",
                403,
            );
        }

        const verifiedEmails =
            user.emailAddresses
                .filter(
                    (emailAddress) =>
                        emailAddress
                            .verification
                            ?.status ===
                        "verified",
                )
                .map(
                    (emailAddress) =>
                        emailAddress
                            .emailAddress
                            .trim()
                            .toLowerCase(),
                );

        const ownerEmail =
            purchase.ownerEmail
                ?.trim()
                .toLowerCase();

        if (
            !ownerEmail ||
            !verifiedEmails.includes(
                ownerEmail,
            )
        ) {
            throw new ApiError(
                "El correo de la cuenta no coincide con el correo utilizado durante el pago.",
                403,
            );
        }

        const isAnnualInstallments =
            purchase.billingPeriod ===
            "annual_installments";

        if (
            !isAnnualInstallments &&
            (
                !purchase
                    .stripeCustomerId ||
                !purchase
                    .stripeSubscriptionId
            )
        ) {
            throw new ApiError(
                "Stripe todavía no ha confirmado completamente la suscripción.",
                409,
            );
        }

        const selectedTemplate =
            getCRMIndustryTemplates()
                .filter(
                    (template) =>
                        template
                            .defaultModules
                            .length >
                        0,
                )
                .find(
                    (template) =>
                        template.id ===
                        purchase.industry,
                );

        if (!selectedTemplate) {
            throw new ApiError(
                "La industria contratada ya no está disponible.",
                400,
            );
        }

        const validPackageKeys =
            new Set(
                Object.keys(
                    CRM_MODULE_PACKAGES,
                ) as
                CRMModulePackageKey[],
            );

        const packageKeys =
            Array.from(
                new Set(
                    purchase.lineItems
                        .map(
                            (lineItem) =>
                                lineItem.itemKey,
                        )
                        .filter(
                            (
                                itemKey,
                            ): itemKey is
                                CRMModulePackageKey =>
                                validPackageKeys.has(
                                    itemKey as
                                    CRMModulePackageKey,
                                ),
                        ),
                ),
            );

        if (
            packageKeys.length ===
            0
        ) {
            throw new ApiError(
                "La contratación no contiene un paquete de CRM válido.",
                400,
            );
        }

        resolveCRMModuleIds({
            industry:
                selectedTemplate.id,

            mode:
                "subscription",

            packageKeys,
        });

        const clerk =
            await clerkClient();

        if (
            purchase
                .clerkOrganizationId
        ) {
            const existingOrganization =
                await clerk
                    .organizations
                    .getOrganization({
                        organizationId:
                            purchase
                                .clerkOrganizationId,
                    });

            return NextResponse.json({
                success: true,

                data: {
                    organizationId:
                        existingOrganization.id,

                    purchaseId:
                        purchase.id,
                },

                message:
                    "La empresa existente fue recuperada correctamente.",
            });
        }

        if (
            purchase.status !==
            "paid_pending_account" &&
            purchase.status !==
            "account_linked"
        ) {
            throw new ApiError(
                "La contratación no está disponible para crear una empresa.",
                409,
            );
        }

        const now =
            new Date();

        await db
            .update(
                commercialPurchases,
            )
            .set({
                clerkUserId:
                    userId,

                companyName,

                taxId,

                status:
                    "account_linked",

                updatedAt:
                    now,
            })
            .where(
                eq(
                    commercialPurchases.id,
                    purchase.id,
                ),
            );

        let organization:
            Awaited<
                ReturnType<
                    typeof clerk.organizations.createOrganization
                >
            >;

        try {
            organization =
                await clerk
                    .organizations
                    .createOrganization({
                        name:
                            companyName,

                        createdBy:
                            userId,

                        publicMetadata: {
                            products: [
                                "crm",
                            ],

                            industry:
                                selectedTemplate.id,

                            dataraProvisioning: {
                                mode:
                                    "subscription",

                                packageKeys,

                                trialEndsAt:
                                    null,
                            },
                        },

                        privateMetadata: {
                            onboardingSource:
                                "website_purchase",

                            taxId,

                            commercialPurchaseId:
                                purchase.id,
                        },
                    });
        } catch (
        creationError
        ) {
            await db
                .update(
                    commercialPurchases,
                )
                .set({
                    status:
                        "account_linked",

                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        commercialPurchases.id,
                        purchase.id,
                    ),
                );

            throw creationError;
        }

        await db
            .update(
                commercialPurchases,
            )
            .set({
                clerkOrganizationId:
                    organization.id,

                status:
                    "organization_created",

                updatedAt:
                    new Date(),
            })
            .where(
                eq(
                    commercialPurchases.id,
                    purchase.id,
                ),
            );

        return NextResponse.json(
            {
                success: true,

                data: {
                    organizationId:
                        organization.id,

                    purchaseId:
                        purchase.id,
                },

                message:
                    "La empresa fue creada correctamente.",
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