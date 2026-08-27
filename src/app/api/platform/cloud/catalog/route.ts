import {
    and,
    asc,
    eq,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    cloudCatalogAuditLogs,
    cloudCatalogItems,
} from "@/db/schema";

import {
    PlatformAuthorizationError,
    requireCloudAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
    "force-dynamic";

type CloudCatalogItemPayload = {
    id?: unknown;
    itemKey?: unknown;
    itemType?: unknown;
    billingMode?: unknown;
    name?: unknown;
    description?: unknown;

    monthlyPrice?: unknown;
    annualPrice?: unknown;
    oneTimePrice?: unknown;
    currency?: unknown;

    providerName?: unknown;
    providerCost?: unknown;
    providerCostCurrency?: unknown;

    vcpu?: unknown;
    ramGb?: unknown;
    storageGb?: unknown;
    transferTb?: unknown;

    serviceCategory?: unknown;

    features?: unknown;

    recommended?: unknown;
    requiresQuote?: unknown;
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

function getRequiredText(
    value: unknown,
    fieldName: string,
    maximumLength = 120,
): string {
    if (
        typeof value !==
        "string"
    ) {
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

    if (
        typeof value !==
        "string"
    ) {
        throw new ApiError(
            "El texto no tiene un formato válido.",
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
            `El texto no puede exceder ${maximumLength} caracteres.`,
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
        typeof value ===
            "number"
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

    if (
        !Number.isInteger(
            number,
        )
    ) {
        throw new ApiError(
            `${fieldName} debe ser un número entero.`,
            400,
        );
    }

    return number;
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
            `${fieldName} no tiene un formato válido.`,
            400,
        );
    }

    return value;
}

function getStringList(
    value: unknown,
): string[] {
    if (!Array.isArray(value)) {
        throw new ApiError(
            "Las características no tienen un formato válido.",
            400,
        );
    }

    return value
        .map(
            (item) =>
                typeof item ===
                    "string"
                    ? item.trim()
                    : "",
        )
        .filter(Boolean)
        .slice(
            0,
            100,
        );
}

function getItemType(
    value: unknown,
):
    | "server"
    | "service"
    | "addon" {
    if (
        value === "server" ||
        value === "service" ||
        value === "addon"
    ) {
        return value;
    }

    throw new ApiError(
        "El tipo de elemento Cloud no es válido.",
        400,
    );
}

function getBillingMode(
    value: unknown,
):
    | "monthly"
    | "annual"
    | "one_time" {
    if (
        value === "monthly" ||
        value === "annual" ||
        value === "one_time"
    ) {
        return value;
    }

    throw new ApiError(
        "La modalidad de cobro no es válida.",
        400,
    );
}

function getCatalogValues(
    payload:
        CloudCatalogItemPayload,
) {
    const itemType =
        getItemType(
            payload.itemType,
        );

    const billingMode =
        getBillingMode(
            payload.billingMode,
        );

    const itemKey =
        getRequiredText(
            payload.itemKey,
            "La clave",
            80,
        )
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-",
            )
            .replace(
                /^-+|-+$/g,
                "",
            );

    const name =
        getRequiredText(
            payload.name,
            "El nombre",
            160,
        );

    const description =
        getOptionalText(
            payload.description,
            2_000,
        );

    const monthlyPrice =
        getNonNegativeNumber(
            payload.monthlyPrice,
            "El precio mensual",
        );

    const annualPrice =
        getNonNegativeNumber(
            payload.annualPrice,
            "El precio anual",
        );

    const oneTimePrice =
        getNonNegativeNumber(
            payload.oneTimePrice,
            "El precio único",
        );

    const currency =
        getRequiredText(
            payload.currency,
            "La moneda",
            10,
        ).toLowerCase();

    const providerName =
        getOptionalText(
            payload.providerName,
            160,
        );

    const providerCost =
        getNonNegativeNumber(
            payload.providerCost,
            "El costo del proveedor",
        );

    const providerCostCurrency =
        getRequiredText(
            payload.providerCostCurrency,
            "La moneda del proveedor",
            10,
        ).toLowerCase();

    const vcpu =
        getNonNegativeInteger(
            payload.vcpu,
            "Los vCPU",
        );

    const ramGb =
        getNonNegativeNumber(
            payload.ramGb,
            "La memoria RAM",
        );

    const storageGb =
        getNonNegativeNumber(
            payload.storageGb,
            "El almacenamiento",
        );

    const transferTb =
        getNonNegativeNumber(
            payload.transferTb,
            "La transferencia",
        );

    const serviceCategory =
        getOptionalText(
            payload.serviceCategory,
            80,
        );

    if (
        itemType === "server" &&
        (
            vcpu <= 0 ||
            ramGb <= 0 ||
            storageGb <= 0
        )
    ) {
        throw new ApiError(
            "Un servidor debe tener vCPU, RAM y almacenamiento mayores que cero.",
            400,
        );
    }

    if (
        itemType !== "server" &&
        (
            vcpu > 0 ||
            ramGb > 0 ||
            storageGb > 0 ||
            transferTb > 0
        )
    ) {
        throw new ApiError(
            "Las capacidades técnicas solo aplican a servidores.",
            400,
        );
    }

    return {
        itemKey,
        itemType,
        billingMode,
        name,
        description,

        monthlyPrice:
            monthlyPrice.toFixed(
                2,
            ),

        annualPrice:
            annualPrice.toFixed(
                2,
            ),

        oneTimePrice:
            oneTimePrice.toFixed(
                2,
            ),

        currency,

        providerName,

        providerCost:
            providerCost.toFixed(
                2,
            ),

        providerCostCurrency,

        vcpu,

        ramGb:
            ramGb.toFixed(
                2,
            ),

        storageGb:
            storageGb.toFixed(
                2,
            ),

        transferTb:
            transferTb.toFixed(
                2,
            ),

        serviceCategory,

        features:
            getStringList(
                payload.features,
            ),

        recommended:
            getBoolean(
                payload.recommended,
                "Recomendado",
            ),

        requiresQuote:
            getBoolean(
                payload.requiresQuote,
                "Requiere cotización",
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

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof
        ApiError ||
        error instanceof
        PlatformAuthorizationError
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
        "No fue posible administrar el catálogo Cloud:",
        error,
    );

    return NextResponse.json(
        {
            success: false,

            error:
                "No fue posible administrar el catálogo Cloud.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        await requireCloudAdministrator();

        const items =
            await db
                .select()
                .from(
                    cloudCatalogItems,
                )
                .orderBy(
                    asc(
                        cloudCatalogItems
                            .sortOrder,
                    ),
                    asc(
                        cloudCatalogItems
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

export async function POST(
    request: Request,
) {
    try {
        const administrator =
            await requireCloudAdministrator();

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
                CloudCatalogItemPayload,
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
                        cloudCatalogItems.id,
                })
                .from(
                    cloudCatalogItems,
                )
                .where(
                    eq(
                        cloudCatalogItems
                            .itemKey,
                        values.itemKey,
                    ),
                )
                .limit(1);

        if (existingItem) {
            throw new ApiError(
                "Ya existe un elemento Cloud con esa clave.",
                409,
            );
        }

        const now =
            new Date();

        const [createdItem] =
            await db
                .insert(
                    cloudCatalogItems,
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
                "No fue posible crear el elemento Cloud.",
                500,
            );
        }

        await db
            .insert(
                cloudCatalogAuditLogs,
            )
            .values({
                catalogItemId:
                    createdItem.id,

                action:
                    "created",

                nextValues:
                    createdItem,

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
                        createdItem,
                },

                message:
                    "El elemento Cloud fue creado correctamente.",
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
            await requireCloudAdministrator();

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
            CloudCatalogItemPayload;

        const id =
            getRequiredText(
                payload.id,
                "El identificador",
                36,
            );

        const uuidPattern =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (
            !uuidPattern.test(
                id,
            )
        ) {
            throw new ApiError(
                "El identificador del elemento no es válido.",
                400,
            );
        }

        const values =
            getCatalogValues(
                payload,
            );

        const [currentItem] =
            await db
                .select()
                .from(
                    cloudCatalogItems,
                )
                .where(
                    eq(
                        cloudCatalogItems
                            .id,
                        id,
                    ),
                )
                .limit(1);

        if (!currentItem) {
            throw new ApiError(
                "El elemento Cloud no existe.",
                404,
            );
        }

        const [duplicateItem] =
            await db
                .select({
                    id:
                        cloudCatalogItems.id,
                })
                .from(
                    cloudCatalogItems,
                )
                .where(
                    eq(
                        cloudCatalogItems
                            .itemKey,
                        values.itemKey,
                    ),
                )
                .limit(1);

        if (
            duplicateItem &&
            duplicateItem.id !==
            id
        ) {
            throw new ApiError(
                "Ya existe otro elemento Cloud con esa clave.",
                409,
            );
        }

        const now =
            new Date();

        const [updatedItem] =
            await db
                .update(
                    cloudCatalogItems,
                )
                .set({
                    ...values,

                    updatedByClerkUserId:
                        administrator
                            .userId,

                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        cloudCatalogItems
                            .id,
                        id,
                    ),
                )
                .returning();

        if (!updatedItem) {
            throw new ApiError(
                "No fue posible actualizar el elemento Cloud.",
                500,
            );
        }

        await db
            .insert(
                cloudCatalogAuditLogs,
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
                "El catálogo Cloud fue actualizado correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}