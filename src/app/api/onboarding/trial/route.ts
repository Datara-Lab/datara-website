import {
    auth,
    clerkClient,
} from "@clerk/nextjs/server";

import {
    and,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import { db } from "@/db";

import {
    trialRedemptions,
} from "@/db/schema";

import {
    resolveCRMModuleIds,
    CRMModuleProvisioningError,
} from "@/lib/crm/provision-module-entitlements";

import type {
    CRMIndustry,
} from "@/types/crm-config";

export const dynamic =
    "force-dynamic";

type TrialPayload = {
    companyName?: unknown;
    ownerEmail?: unknown;
    taxId?: unknown;
    industry?: unknown;
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
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getCompanyName(
    value: unknown,
): string {
    if (typeof value !== "string") {
        throw new ApiError(
            "Escribe el nombre de tu empresa.",
            400,
        );
    }

    const companyName =
        value.trim();

    if (
        companyName.length < 2 ||
        companyName.length > 100
    ) {
        throw new ApiError(
            "El nombre de la empresa debe tener entre 2 y 100 caracteres.",
            400,
        );
    }

    return companyName;
}

function getOwnerEmail(
    value: unknown,
): string {
    if (typeof value !== "string") {
        throw new ApiError(
            "Escribe el correo del propietario.",
            400,
        );
    }

    const ownerEmail =
        value
            .trim()
            .toLowerCase();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailPattern.test(
            ownerEmail,
        )
    ) {
        throw new ApiError(
            "El correo del propietario no tiene un formato válido.",
            400,
        );
    }

    return ownerEmail;
}

function getTaxId(
    value: unknown,
): string {
    if (typeof value !== "string") {
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
            "El RFC genérico no puede utilizarse para activar un demo.",
            400,
        );
    }

    return taxId;
}

function getIndustry(
    value: unknown,
): CRMIndustry {
    const supportedIndustries:
        CRMIndustry[] = [
            "motorcycle_dealership",
            "automotive_dealership",
            "veterinary",
            "real_estate",
            "retail",
            "professional_services",
            "other",
        ];

    if (
        typeof value !== "string" ||
        !supportedIndustries.includes(
            value as CRMIndustry,
        )
    ) {
        throw new ApiError(
            "Selecciona una industria válida.",
            400,
        );
    }

    return value as CRMIndustry;
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError ||
        error instanceof
        CRMModuleProvisioningError
    ) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            {
                status:
                    error instanceof ApiError
                        ? error.status
                        : 400,
            },
        );
    }

    console.error(
        "No fue posible iniciar el demo:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible iniciar el demo. Intenta nuevamente.",
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
        if (
            process.env
                .DATARA_ENVIRONMENT
                ?.trim()
                .toLowerCase() ===
            "demo"
        ) {
            throw new ApiError(
                "La creación de pruebas está deshabilitada en este entorno.",
                403,
            );
        }

        const {
            userId,
        } = await auth();

        if (!userId) {
            throw new ApiError(
                "Inicia sesión para activar tu demo.",
                401,
            );
        }

        const requestBody: unknown =
            await request.json();

        if (!isRecord(requestBody)) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const payload =
            requestBody as TrialPayload;

        const companyName =
            getCompanyName(
                payload.companyName,
            );

        const ownerEmail =
            getOwnerEmail(
                payload.ownerEmail,
            );

        const taxId =
            getTaxId(
                payload.taxId,
            );

        const industry =
            getIndustry(
                payload.industry,
            );

        const clerk =
            await clerkClient();

        const authenticatedUser =
            await clerk.users
                .getUser(
                    userId,
                );

        const verifiedEmailAddresses =
            authenticatedUser
                .emailAddresses
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

        if (
            !verifiedEmailAddresses
                .includes(
                    ownerEmail,
                )
        ) {
            throw new ApiError(
                "El correo del propietario no corresponde a un correo verificado de la sesión actual. Inicia sesión con ese correo antes de crear la empresa.",
                403,
            );
        }

        /*
         * Valida que el template ya esté
         * disponible antes de crear la empresa.
         */
        resolveCRMModuleIds({
            industry,
            mode: "trial",
            packageKeys: [],
        });

        const trialStartsAt =
            new Date();

        const trialEndsAt =
            new Date(
                trialStartsAt.getTime() +
                14 *
                24 *
                60 *
                60 *
                1000,
            );

        const [trialRedemption] =
            await db
                .insert(
                    trialRedemptions,
                )
                .values({
                    clerkUserId:
                        userId,

                    taxId,

                    ownerEmail,

                    industry,

                    status:
                        "reserved",

                    trialStartsAt,

                    trialEndsAt,

                    updatedAt:
                        trialStartsAt,
                })
                .onConflictDoNothing()
                .returning({
                    id:
                        trialRedemptions.id,
                });

        if (!trialRedemption) {
            const [
                existingRedemption,
            ] = await db
                .select({
                    id:
                        trialRedemptions.id,

                    clerkOrganizationId:
                        trialRedemptions
                            .clerkOrganizationId,

                    industry:
                        trialRedemptions
                            .industry,

                    trialStartsAt:
                        trialRedemptions
                            .trialStartsAt,

                    trialEndsAt:
                        trialRedemptions
                            .trialEndsAt,
                })
                .from(
                    trialRedemptions,
                )
                .where(
                    and(
                        eq(
                            trialRedemptions
                                .clerkUserId,
                            userId,
                        ),
                        eq(
                            trialRedemptions
                                .taxId,
                            taxId,
                        ),
                    ),
                )
                .limit(1);

            if (
                !existingRedemption ||
                !existingRedemption
                    .clerkOrganizationId
            ) {
                throw new ApiError(
                    "Este usuario o RFC ya utilizó el demo gratuito de Datara.",
                    409,
                );
            }

            const existingOrganization =
                await clerk.organizations
                    .getOrganization({
                        organizationId:
                            existingRedemption
                                .clerkOrganizationId,
                    });

            return NextResponse.json({
                success: true,

                data: {
                    organizationId:
                        existingOrganization.id,

                    companyName:
                        existingOrganization.name,

                    industry:
                        existingRedemption
                            .industry,

                    trialStartsAt:
                        existingRedemption
                            .trialStartsAt
                            .toISOString(),

                    trialEndsAt:
                        existingRedemption
                            .trialEndsAt
                            .toISOString(),
                },

                message:
                    "Tu demo existente fue recuperado correctamente.",
            });
        }

        const organization =
            await (async () => {
                try {
                    return await clerk
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

                                industry,

                                dataraProvisioning: {
                                    mode:
                                        "trial",

                                    packageKeys:
                                        [],

                                    trialEndsAt:
                                        trialEndsAt
                                            .toISOString(),
                                },
                            },

                            privateMetadata: {
                                onboardingSource:
                                    "website_trial",

                                taxId,

                                trialRedemptionId:
                                    trialRedemption.id,

                                trialStartsAt:
                                    trialStartsAt
                                        .toISOString(),
                            },
                        });
                } catch (
                    creationError
                ) {
                    await db
                        .delete(
                            trialRedemptions,
                        )
                        .where(
                            eq(
                                trialRedemptions.id,
                                trialRedemption.id,
                            ),
                        );

                    throw creationError;
                }
            })();

        await db
            .update(
                trialRedemptions,
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
                    trialRedemptions.id,
                    trialRedemption.id,
                ),
            );

        return NextResponse.json(
            {
                success: true,

                data: {
                    organizationId:
                        organization.id,

                    companyName:
                        organization.name,

                    industry,

                    trialStartsAt:
                        trialStartsAt
                            .toISOString(),

                    trialEndsAt:
                        trialEndsAt
                            .toISOString(),
                },

                message:
                    "Tu demo de Datara CRM está listo para activarse.",
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
