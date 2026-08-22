import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    asc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import Stripe from "stripe";

import {
    createStripeClient,
} from "@/lib/commercial/create-stripe-client";

import { db } from "@/db";

import {
    commercialCatalogAuditLogs,
    commercialCatalogItems,
} from "@/db/schema";

import {
    isDataraProductKey,
} from "@/config/datara-products";

import {
    synchronizeStripeCatalogItem,
} from "@/lib/commercial/synchronize-stripe-catalog-item";

import {
    PlatformAuthorizationError,
    requirePlatformAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
    "force-dynamic";

type CommercialCatalogEnvironment = {
    STRIPE_SECRET_KEY?: string;
};

function getStripeClient():
    Stripe {
    const {
        env,
    } = getCloudflareContext();

    const environment =
        env as
        CommercialCatalogEnvironment;

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

    return createStripeClient(
        stripeSecretKey,
    );
}

type CatalogItemPayload = {
    id?: unknown;
    productKey?: unknown;
    itemKey?: unknown;
    itemType?: unknown;
    name?: unknown;
    description?: unknown;
    monthlyPrice?: unknown;
    annualPrice?: unknown;
    annualDiscountPercent?:
    unknown;
    installmentsEnabled?:
    unknown;
    installmentsDiscountPercent?:
    unknown;
    annualInstallmentsPrice?:
    unknown;
    currency?: unknown;
    includedUsers?: unknown;
    includedStorageGb?: unknown;
    includedAiMessages?: unknown;
    moduleIds?: unknown;
    features?: unknown;
    required?: unknown;
    recommended?: unknown;
    active?: unknown;
    sortOrder?: unknown;
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

function getRequiredText(
    value: unknown,
    fieldName: string,
    maximumLength = 120,
): string {
    if (typeof value !== "string") {
        throw new ApiError(
            `${fieldName} no tiene un formato válido.`,
            400,
        );
    }

    const text =
        value.trim();

    if (
        !text ||
        text.length >
        maximumLength
    ) {
        throw new ApiError(
            `${fieldName} es obligatorio y no puede exceder ${maximumLength} caracteres.`,
            400,
        );
    }

    return text;
}

function getOptionalText(
    value: unknown,
    maximumLength = 1000,
): string | null {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    if (typeof value !== "string") {
        throw new ApiError(
            "La descripción no tiene un formato válido.",
            400,
        );
    }

    const text =
        value.trim();

    if (
        text.length >
        maximumLength
    ) {
        throw new ApiError(
            `La descripción no puede exceder ${maximumLength} caracteres.`,
            400,
        );
    }

    return text || null;
}

function getNonNegativeNumber(
    value: unknown,
    fieldName: string,
): number {
    const number =
        typeof value === "number"
            ? value
            : typeof value ===
                "string"
                ? Number(value)
                : Number.NaN;

    if (
        !Number.isFinite(number) ||
        number < 0
    ) {
        throw new ApiError(
            `${fieldName} debe ser un número igual o mayor que cero.`,
            400,
        );
    }

    return number;
}

function getNonNegativeInteger(
    value: unknown,
    fieldName: string,
): number {
    const number =
        getNonNegativeNumber(
            value,
            fieldName,
        );

    if (!Number.isInteger(number)) {
        throw new ApiError(
            `${fieldName} debe ser un número entero.`,
            400,
        );
    }

    return number;
}

function getStringList(
    value: unknown,
    fieldName: string,
): string[] {
    if (!Array.isArray(value)) {
        throw new ApiError(
            `${fieldName} debe ser una lista.`,
            400,
        );
    }

    const items =
        value.map((item) => {
            if (
                typeof item !==
                "string"
            ) {
                throw new ApiError(
                    `${fieldName} contiene un valor inválido.`,
                    400,
                );
            }

            const text =
                item.trim();

            if (
                !text ||
                text.length > 160
            ) {
                throw new ApiError(
                    `${fieldName} contiene un valor vacío o demasiado largo.`,
                    400,
                );
            }

            return text;
        });

    if (items.length > 100) {
        throw new ApiError(
            `${fieldName} contiene demasiados elementos.`,
            400,
        );
    }

    return Array.from(
        new Set(items),
    );
}

function getBoolean(
    value: unknown,
    fieldName: string,
): boolean {
    if (
        typeof value !==
        "boolean"
    ) {
        throw new ApiError(
            `${fieldName} debe ser verdadero o falso.`,
            400,
        );
    }

    return value;
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError ||
        error instanceof
        PlatformAuthorizationError
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
        "No fue posible procesar el catálogo comercial:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible procesar el catálogo comercial.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        await requirePlatformAdministrator();

        const items =
            await db
                .select()
                .from(
                    commercialCatalogItems,
                )
                .orderBy(
                    asc(
                        commercialCatalogItems
                            .productKey,
                    ),
                    asc(
                        commercialCatalogItems
                            .sortOrder,
                    ),
                    asc(
                        commercialCatalogItems
                            .name,
                    ),
                );

        return NextResponse.json({
            success: true,

            data: {
                items,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

function getCatalogValues(
    payload: CatalogItemPayload,
) {
    if (
        !isDataraProductKey(
            payload.productKey,
        )
    ) {
        throw new ApiError(
            "Selecciona un producto válido.",
            400,
        );
    }

    const itemType =
        getRequiredText(
            payload.itemType,
            "El tipo",
            40,
        );

    if (
        itemType !== "package" &&
        itemType !== "expansion" &&
        itemType !== "addon"
    ) {
        throw new ApiError(
            "El tipo debe ser package, expansion o addon.",
            400,
        );
    }

    const currency =
        getRequiredText(
            payload.currency,
            "La moneda",
            3,
        )
            .toLowerCase();

    if (currency !== "mxn") {
        throw new ApiError(
            "Por ahora el catálogo comercial solo admite MXN.",
            400,
        );
    }

    const monthlyPrice =
        getNonNegativeNumber(
            payload.monthlyPrice,
            "El precio mensual",
        );

    const annualDiscountPercent =
        getNonNegativeInteger(
            payload
                .annualDiscountPercent,
            "El descuento anual",
        );

    if (
        annualDiscountPercent >
        100
    ) {
        throw new ApiError(
            "El descuento anual no puede exceder 100%.",
            400,
        );
    }

    const annualPrice =
        monthlyPrice *
        12 *
        (
            1 -
            annualDiscountPercent /
            100
        );

    const installmentsEnabled =
        getBoolean(
            payload
                .installmentsEnabled,
            "Meses sin intereses",
        );

    const installmentsDiscountPercent =
        getNonNegativeInteger(
            payload
                .installmentsDiscountPercent,
            "El descuento para MSI",
        );

    if (
        installmentsDiscountPercent >
        100
    ) {
        throw new ApiError(
            "El descuento para MSI no puede exceder 100%.",
            400,
        );
    }

    const annualInstallmentsPrice =
        installmentsEnabled
            ? monthlyPrice *
              12 *
              (
                  1 -
                  installmentsDiscountPercent /
                  100
              )
            : 0;

    return {
        productKey:
            payload.productKey,

        itemKey:
            getRequiredText(
                payload.itemKey,
                "La clave",
                80,
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9-]+/g,
                    "-",
                )
                .replace(
                    /^-+|-+$/g,
                    "",
                ),

        itemType,

        name:
            getRequiredText(
                payload.name,
                "El nombre",
            ),

        description:
            getOptionalText(
                payload.description,
            ),

        monthlyPrice:
            monthlyPrice.toFixed(
                2,
            ),

        annualPrice:
            annualPrice.toFixed(
                2,
            ),

        annualDiscountPercent,

        installmentsEnabled,

        installmentsDiscountPercent,

        annualInstallmentsPrice:
            annualInstallmentsPrice
                .toFixed(2),

        currency,

        includedUsers:
            getNonNegativeInteger(
                payload.includedUsers,
                "Los usuarios incluidos",
            ),

        includedStorageGb:
            getNonNegativeInteger(
                payload.includedStorageGb,
                "El almacenamiento incluido",
            )
                .toFixed(2),

        includedAiMessages:
            getNonNegativeInteger(
                payload.includedAiMessages,
                "Las consultas de IA incluidas",
            ),

        moduleIds:
            getStringList(
                payload.moduleIds,
                "Los módulos",
            ),

        features:
            getStringList(
                payload.features,
                "Las características",
            ),

        required:
            getBoolean(
                payload.required,
                "Obligatorio",
            ),

        recommended:
            getBoolean(
                payload.recommended,
                "Recomendado",
            ),

        active:
            getBoolean(
                payload.active,
                "Activo",
            ),

        sortOrder:
            getNonNegativeInteger(
                payload.sortOrder,
                "El orden",
            ),
    };
}

export async function POST(
    request: Request,
) {
    try {
        const administrator =
            await requirePlatformAdministrator();

        const requestBody: unknown =
            await request.json();

        if (!isRecord(requestBody)) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const values =
            getCatalogValues(
                requestBody as
                CatalogItemPayload,
            );

        if (!values.itemKey) {
            throw new ApiError(
                "La clave debe contener letras o números.",
                400,
            );
        }

        const [existingItem] =
            await db
                .select({
                    id:
                        commercialCatalogItems.id,
                })
                .from(
                    commercialCatalogItems,
                )
                .where(
                    and(
                        eq(
                            commercialCatalogItems
                                .productKey,
                            values.productKey,
                        ),
                        eq(
                            commercialCatalogItems
                                .itemKey,
                            values.itemKey,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            throw new ApiError(
                "Ya existe un elemento con esa clave para el producto seleccionado.",
                409,
            );
        }

        const now =
            new Date();

        const [createdItem] =
            await db
                .insert(
                    commercialCatalogItems,
                )
                .values({
                    ...values,

                    updatedByClerkUserId:
                        administrator
                            .userId,

                    createdAt:
                        now,

                    updatedAt:
                        now,
                })
                .returning();

        if (!createdItem) {
            throw new ApiError(
                "No fue posible crear el elemento comercial.",
                500,
            );
        }

        const stripeReferences =
            await synchronizeStripeCatalogItem({
                stripe:
                    getStripeClient(),

                item: {
                    id:
                        createdItem.id,

                    productKey:
                        createdItem.productKey,

                    itemKey:
                        createdItem.itemKey,

                    name:
                        createdItem.name,

                    description:
                        createdItem.description,

                    monthlyPrice:
                        createdItem.monthlyPrice,

                    annualPrice:
                        createdItem.annualPrice,

                    installmentsEnabled:
                        createdItem
                            .installmentsEnabled,

                    annualInstallmentsPrice:
                        createdItem
                            .annualInstallmentsPrice,

                    currency:
                        createdItem.currency,

                    active:
                        createdItem.active,

                    stripeProductId:
                        createdItem
                            .stripeProductId,

                    stripeMonthlyPriceId:
                        createdItem
                            .stripeMonthlyPriceId,

                    stripeAnnualPriceId:
                        createdItem
                            .stripeAnnualPriceId,

                    stripeAnnualInstallmentsPriceId:
                        createdItem
                            .stripeAnnualInstallmentsPriceId,
                },
            });

        const [synchronizedItem] =
            await db
                .update(
                    commercialCatalogItems,
                )
                .set({
                    ...stripeReferences,

                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        commercialCatalogItems.id,
                        createdItem.id,
                    ),
                )
                .returning();

        if (!synchronizedItem) {
            throw new ApiError(
                "El elemento fue creado, pero no fue posible guardar sus referencias de Stripe.",
                500,
            );
        }

        await db
            .insert(
                commercialCatalogAuditLogs,
            )
            .values({
                catalogItemId:
                    createdItem.id,

                action:
                    "created",

                nextValues:
                    synchronizedItem,

                changedByClerkUserId:
                    administrator
                        .userId,

                createdAt:
                    now,
            });

        return NextResponse.json(
            {
                success: true,

                data: {
                    item:
                        synchronizedItem,
                },

                message:
                    "El elemento comercial fue creado correctamente.",
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
        const administrator =
            await requirePlatformAdministrator();

        const requestBody: unknown =
            await request.json();

        if (!isRecord(requestBody)) {
            throw new ApiError(
                "La información enviada no tiene un formato válido.",
                400,
            );
        }

        const payload =
            requestBody as
            CatalogItemPayload;

        const id =
            getRequiredText(
                payload.id,
                "El identificador",
                36,
            );

        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidPattern.test(id)) {
            throw new ApiError(
                "El identificador del elemento no es válido.",
                400,
            );
        }

        const values =
            getCatalogValues(
                payload,
            );

        if (!values.itemKey) {
            throw new ApiError(
                "La clave debe contener letras o números.",
                400,
            );
        }

        const [currentItem] =
            await db
                .select()
                .from(
                    commercialCatalogItems,
                )
                .where(
                    eq(
                        commercialCatalogItems.id,
                        id,
                    ),
                )
                .limit(1);

        if (!currentItem) {
            throw new ApiError(
                "El elemento comercial no existe.",
                404,
            );
        }

        const [duplicateItem] =
            await db
                .select({
                    id:
                        commercialCatalogItems.id,
                })
                .from(
                    commercialCatalogItems,
                )
                .where(
                    and(
                        eq(
                            commercialCatalogItems
                                .productKey,
                            values.productKey,
                        ),
                        eq(
                            commercialCatalogItems
                                .itemKey,
                            values.itemKey,
                        ),
                    ),
                )
                .limit(1);

        if (
            duplicateItem &&
            duplicateItem.id !== id
        ) {
            throw new ApiError(
                "Ya existe otro elemento con esa clave para el producto seleccionado.",
                409,
            );
        }

        const now =
            new Date();

        const stripeReferences =
            await synchronizeStripeCatalogItem({
                stripe:
                    getStripeClient(),

                item: {
                    id:
                        currentItem.id,

                    productKey:
                        values.productKey,

                    itemKey:
                        values.itemKey,

                    name:
                        values.name,

                    description:
                        values.description,

                    monthlyPrice:
                        values.monthlyPrice,

                    annualPrice:
                        values.annualPrice,

                    installmentsEnabled:
                        values
                            .installmentsEnabled,

                    annualInstallmentsPrice:
                        values
                            .annualInstallmentsPrice,

                    currency:
                        values.currency,

                    active:
                        values.active,

                    stripeProductId:
                        currentItem
                            .stripeProductId,

                    stripeMonthlyPriceId:
                        currentItem
                            .stripeMonthlyPriceId,

                    stripeAnnualPriceId:
                        currentItem
                            .stripeAnnualPriceId,

                    stripeAnnualInstallmentsPriceId:
                        currentItem
                            .stripeAnnualInstallmentsPriceId,
                },
            });

        const [updatedItem] =
            await db
                .update(
                    commercialCatalogItems,
                )
                .set({
                    ...values,
                    ...stripeReferences,

                    updatedByClerkUserId:
                        administrator
                            .userId,

                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        commercialCatalogItems.id,
                        id,
                    ),
                )
                .returning();

        if (!updatedItem) {
            throw new ApiError(
                "No fue posible actualizar el elemento comercial.",
                500,
            );
        }

        await db
            .insert(
                commercialCatalogAuditLogs,
            )
            .values({
                catalogItemId:
                    updatedItem.id,

                action:
                    "updated",

                previousValues:
                    currentItem,

                nextValues:
                    updatedItem,

                changedByClerkUserId:
                    administrator
                        .userId,

                createdAt:
                    now,
            });

        return NextResponse.json({
            success: true,

            data: {
                item:
                    updatedItem,
            },

            message:
                "El catálogo comercial fue actualizado correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}