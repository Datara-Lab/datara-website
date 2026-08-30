import {
    auth,
    currentUser,
} from "@clerk/nextjs/server";

import {
    sql,
} from "drizzle-orm";

import {
    NextResponse,
} from "next/server";

import {
    db,
} from "@/db";

import {
    getCRMBranchAccess,
    type CRMBranchAccessContext,
} from "@/lib/crm/branch-access";

import {
    CRMIndustryCapabilityError,
    requireCRMIndustryCapability,
} from "@/lib/crm/industry-capabilities";

import {
    CRMPermissionError,
    requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
    "force-dynamic";

type RouteContext = {
    params:
        Promise<{
            id: string;
        }>;
};

type ReservationPayload = {
    inventoryUnitId?: unknown;
    salesOrderId?: unknown;
};

type EligibilityRow = {
    dealId: string;
    customerId: string | null;
    operationType: string;
    unitId: string;
    unitBranchId: string | null;
    vin: string | null;
    serialNumber: string | null;
    unitStatus: string;
    ruleId: string | null;
    ruleName: string | null;
    minimumDownPaymentPercent: string | null;
    minimumDownPaymentAmount: string | null;
    financingApprovalRequired: boolean | null;
    financingApplicationId: string | null;
    financingStatus: string | null;
    unitPrice: string;
    requiredAmount: string;
    eligiblePaymentAmount: string;
    eligible: boolean;
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

function getString(
    value: unknown,
): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim();

    return normalized || undefined;
}

function canAccessBranch(
    branchId: string | null,
    branchAccess: CRMBranchAccessContext,
) {
    return (
        branchAccess.allBranches ||
        (
            Boolean(branchId) &&
            branchAccess.branchIds.includes(
                branchId as string,
            )
        )
    );
}

async function getContext() {
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

    const tenants = await db.execute<{
        id: string;
    }>(sql`
        SELECT id
        FROM tenants
        WHERE clerk_organization_id = ${orgId}
        LIMIT 1
    `);

    const tenantId =
        tenants.rows[0]?.id;

    if (!tenantId) {
        throw new ApiError(
            "La empresa aún no está sincronizada.",
            404,
        );
    }

    await requireCRMIndustryCapability(

      tenantId,

      "motorcycle_commercial_cycle",

    );


    const [branchAccess] =
        await Promise.all([
            getCRMBranchAccess(
                tenantId,
                userId,
            ),

            requireCRMModulePermission(
                tenantId,
                userId,
                "inventory",
                "edit",
            ),
        ]);

    return {
        tenantId,
        userId,
        branchAccess,
    };
}

async function getEligibility(
    tenantId: string,
    dealId: string,
    inventoryUnitId: string,
) {
    const rows =
        await db.execute<EligibilityRow>(sql`
            WITH selected_deal AS (
                SELECT
                    deal.id,
                    deal.customer_id,
                    deal.operation_type
                FROM crm_deals AS deal
                WHERE
                    deal.tenant_id = ${tenantId}
                    AND deal.id = ${dealId}
                LIMIT 1
            ),
            selected_unit AS (
                SELECT
                    unit.id,
                    unit.branch_id,
                    unit.vin,
                    unit.serial_number,
                    unit.status,
                    COALESCE(unit.list_price, 0) AS list_price
                FROM inventory_units AS unit
                WHERE
                    unit.tenant_id = ${tenantId}
                    AND unit.id = ${inventoryUnitId}
                LIMIT 1
            ),
            financing AS (
                SELECT
                    application.id,
                    application.provider_id,
                    application.product_id,
                    application.status,
                    application.unit_price
                FROM financing_applications AS application
                WHERE
                    application.tenant_id = ${tenantId}
                    AND application.deal_id = ${dealId}
                    AND application.status <> 'cancelled'
                ORDER BY
                    CASE application.status
                        WHEN 'approved' THEN 0
                        WHEN 'under_review' THEN 1
                        WHEN 'submitted' THEN 2
                        ELSE 3
                    END,
                    application.updated_at DESC
                LIMIT 1
            ),
            selected_rule AS (
                SELECT rule.*
                FROM commercial_reservation_rules AS rule
                CROSS JOIN selected_deal AS deal
                LEFT JOIN financing ON TRUE
                WHERE
                    rule.tenant_id = ${tenantId}
                    AND rule.active = TRUE
                    AND (
                        rule.operation_type IS NULL OR
                        rule.operation_type = deal.operation_type
                    )
                    AND (
                        rule.financing_provider_id IS NULL OR
                        rule.financing_provider_id = financing.provider_id
                    )
                    AND (
                        rule.financing_product_id IS NULL OR
                        rule.financing_product_id = financing.product_id
                    )
                ORDER BY
                    (
                        (rule.operation_type IS NOT NULL)::integer +
                        (rule.financing_provider_id IS NOT NULL)::integer +
                        (rule.financing_product_id IS NOT NULL)::integer
                    ) DESC,
                    rule.priority ASC,
                    rule.created_at ASC
                LIMIT 1
            ),
            received_payments AS (
                SELECT
                    COALESCE(SUM(payment.amount), 0) AS amount
                FROM commercial_payments AS payment
                WHERE
                    payment.tenant_id = ${tenantId}
                    AND payment.deal_id = ${dealId}
                    AND payment.status = 'received'
                    AND payment.payment_type IN ('down_payment', 'payment')
            ),
            calculation AS (
                SELECT
                    deal.id AS deal_id,
                    deal.customer_id,
                    deal.operation_type,
                    unit.id AS unit_id,
                    unit.branch_id AS unit_branch_id,
                    unit.vin,
                    unit.serial_number,
                    unit.status AS unit_status,
                    rule.id AS rule_id,
                    rule.name AS rule_name,
                    rule.minimum_down_payment_percent,
                    rule.minimum_down_payment_amount,
                    rule.financing_approval_required,
                    financing.id AS financing_application_id,
                    financing.status AS financing_status,
                    COALESCE(financing.unit_price, unit.list_price, 0) AS unit_price,
                    GREATEST(
                        COALESCE(rule.minimum_down_payment_amount, 0),
                        COALESCE(financing.unit_price, unit.list_price, 0) *
                            COALESCE(rule.minimum_down_payment_percent, 0) / 100
                    ) AS required_amount,
                    received_payments.amount AS eligible_payment_amount
                FROM selected_deal AS deal
                CROSS JOIN selected_unit AS unit
                LEFT JOIN financing ON TRUE
                LEFT JOIN selected_rule AS rule ON TRUE
                CROSS JOIN received_payments
            )
            SELECT
                deal_id AS "dealId",
                customer_id AS "customerId",
                operation_type AS "operationType",
                unit_id AS "unitId",
                unit_branch_id AS "unitBranchId",
                vin,
                serial_number AS "serialNumber",
                unit_status AS "unitStatus",
                rule_id AS "ruleId",
                rule_name AS "ruleName",
                minimum_down_payment_percent AS "minimumDownPaymentPercent",
                minimum_down_payment_amount AS "minimumDownPaymentAmount",
                financing_approval_required AS "financingApprovalRequired",
                financing_application_id AS "financingApplicationId",
                financing_status AS "financingStatus",
                unit_price AS "unitPrice",
                required_amount AS "requiredAmount",
                eligible_payment_amount AS "eligiblePaymentAmount",
                (
                    rule_id IS NOT NULL
                    AND unit_status = 'available'
                    AND eligible_payment_amount >= required_amount
                    AND (
                        financing_approval_required = FALSE OR
                        financing_status = 'approved'
                    )
                ) AS eligible
            FROM calculation
        `);

    return rows.rows[0];
}

function getIneligibilityMessage(
    eligibility: EligibilityRow,
) {
    if (!eligibility.ruleId) {
        return "No existe una regla de apartado aplicable a esta operación.";
    }

    if (eligibility.unitStatus !== "available") {
        return "La unidad seleccionada ya no está disponible.";
    }

    if (
        eligibility.financingApprovalRequired &&
        eligibility.financingStatus !== "approved"
    ) {
        return "La solicitud de financiamiento debe estar aprobada antes de apartar la unidad.";
    }

    const required =
        Number(eligibility.requiredAmount);
    const received =
        Number(eligibility.eligiblePaymentAmount);

    if (received < required) {
        const pending =
            Math.max(0, required - received);

        return "Faltan " + new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
        }).format(pending) + " para cubrir el enganche mínimo.";
    }

    return "La operación todavía no cumple las condiciones de apartado.";
}

function createErrorResponse(
    error: unknown,
) {
    if (
        error instanceof ApiError ||
        error instanceof CRMIndustryCapabilityError ||
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

    const databaseError = error as {
        code?: string;
        cause?: {
            code?: string;
        };
    };

    if (
        databaseError.code === "23505" ||
        databaseError.cause?.code === "23505"
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "La unidad fue apartada por otra operación. Actualiza la información e intenta con otra unidad.",
            },
            {
                status: 409,
            },
        );
    }

    console.error(
        "No fue posible procesar el apartado de la unidad:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error: "No fue posible procesar el apartado de la unidad.",
        },
        {
            status: 500,
        },
    );
}

export async function GET(
    request: Request,
    context: RouteContext,
) {
    try {
        const {
            id: dealId,
        } = await context.params;

        const inventoryUnitId =
            new URL(request.url)
                .searchParams
                .get("inventoryUnitId")
                ?.trim();

        if (!inventoryUnitId) {
            throw new ApiError(
                "Selecciona una unidad para consultar si puede apartarse.",
                400,
            );
        }

        const {
            tenantId,
            branchAccess,
        } = await getContext();

        const eligibility =
            await getEligibility(
                tenantId,
                dealId,
                inventoryUnitId,
            );

        if (!eligibility) {
            throw new ApiError(
                "No encontramos la operación o la unidad seleccionada.",
                404,
            );
        }

        if (!canAccessBranch(
            eligibility.unitBranchId,
            branchAccess,
        )) {
            throw new ApiError(
                "No tienes acceso a la sucursal de esta unidad.",
                403,
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...eligibility,
                reason:
                    eligibility.eligible
                        ? null
                        : getIneligibilityMessage(
                              eligibility,
                          ),
            },
        });
    } catch (error) {
        return createErrorResponse(error);
    }
}

export async function POST(
    request: Request,
    context: RouteContext,
) {
    try {
        const {
            id: dealId,
        } = await context.params;

        const payload =
            (await request.json()) as
                ReservationPayload;

        const inventoryUnitId =
            getString(
                payload.inventoryUnitId,
            );

        const salesOrderId =
            getString(
                payload.salesOrderId,
            );

        if (!inventoryUnitId) {
            throw new ApiError(
                "Selecciona la unidad que deseas apartar.",
                400,
            );
        }

        const {
            tenantId,
            userId,
            branchAccess,
        } = await getContext();

        const eligibility =
            await getEligibility(
                tenantId,
                dealId,
                inventoryUnitId,
            );

        if (!eligibility) {
            throw new ApiError(
                "No encontramos la operación o la unidad seleccionada.",
                404,
            );
        }

        if (!canAccessBranch(
            eligibility.unitBranchId,
            branchAccess,
        )) {
            throw new ApiError(
                "No tienes acceso a la sucursal de esta unidad.",
                403,
            );
        }

        if (!eligibility.eligible) {
            throw new ApiError(
                getIneligibilityMessage(
                    eligibility,
                ),
                409,
            );
        }

        const user =
            await currentUser();

        const actorName =
            [
                user?.firstName,
                user?.lastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
            user?.emailAddresses[0]
                ?.emailAddress ||
            "Usuario";

        const result =
            await db.execute<{
                reservationId: string;
                inventoryUnitId: string;
                requiredAmount: string;
                eligiblePaymentAmount: string;
            }>(sql`
                WITH locked_deal AS MATERIALIZED (
                    SELECT
                        deal.id,
                        deal.customer_id,
                        deal.operation_type
                    FROM crm_deals AS deal
                    WHERE
                        deal.tenant_id = ${tenantId}
                        AND deal.id = ${dealId}
                    FOR UPDATE
                ),
                locked_unit AS MATERIALIZED (
                    SELECT
                        unit.id,
                        unit.branch_id,
                        unit.vin,
                        unit.serial_number,
                        COALESCE(unit.list_price, 0) AS list_price
                    FROM inventory_units AS unit
                    WHERE
                        unit.tenant_id = ${tenantId}
                        AND unit.id = ${inventoryUnitId}
                        AND unit.status = 'available'
                    FOR UPDATE
                ),
                financing AS MATERIALIZED (
                    SELECT
                        application.id,
                        application.provider_id,
                        application.product_id,
                        application.status,
                        application.unit_price
                    FROM financing_applications AS application
                    WHERE
                        application.tenant_id = ${tenantId}
                        AND application.deal_id = ${dealId}
                        AND application.status <> 'cancelled'
                    ORDER BY
                        CASE application.status
                            WHEN 'approved' THEN 0
                            WHEN 'under_review' THEN 1
                            WHEN 'submitted' THEN 2
                            ELSE 3
                        END,
                        application.updated_at DESC
                    LIMIT 1
                ),
                selected_rule AS MATERIALIZED (
                    SELECT rule.*
                    FROM commercial_reservation_rules AS rule
                    CROSS JOIN locked_deal AS deal
                    LEFT JOIN financing ON TRUE
                    WHERE
                        rule.tenant_id = ${tenantId}
                        AND rule.active = TRUE
                        AND (
                            rule.operation_type IS NULL OR
                            rule.operation_type = deal.operation_type
                        )
                        AND (
                            rule.financing_provider_id IS NULL OR
                            rule.financing_provider_id = financing.provider_id
                        )
                        AND (
                            rule.financing_product_id IS NULL OR
                            rule.financing_product_id = financing.product_id
                        )
                    ORDER BY
                        (
                            (rule.operation_type IS NOT NULL)::integer +
                            (rule.financing_provider_id IS NOT NULL)::integer +
                            (rule.financing_product_id IS NOT NULL)::integer
                        ) DESC,
                        rule.priority ASC,
                        rule.created_at ASC
                    LIMIT 1
                ),
                eligible_payments AS MATERIALIZED (
                    SELECT
                        payment.id,
                        payment.amount
                    FROM commercial_payments AS payment
                    WHERE
                        payment.tenant_id = ${tenantId}
                        AND payment.deal_id = ${dealId}
                        AND payment.status = 'received'
                        AND payment.payment_type IN ('down_payment', 'payment')
                    ORDER BY payment.received_at ASC, payment.id ASC
                ),
                eligibility AS MATERIALIZED (
                    SELECT
                        deal.id AS deal_id,
                        deal.customer_id,
                        unit.id AS unit_id,
                        unit.vin,
                        unit.serial_number,
                        rule.id AS rule_id,
                        rule.name AS rule_name,
                        rule.minimum_down_payment_percent,
                        rule.minimum_down_payment_amount,
                        rule.financing_approval_required,
                        financing.id AS financing_application_id,
                        financing.status AS financing_status,
                        COALESCE(financing.unit_price, unit.list_price, 0) AS unit_price,
                        GREATEST(
                            COALESCE(rule.minimum_down_payment_amount, 0),
                            COALESCE(financing.unit_price, unit.list_price, 0) *
                                COALESCE(rule.minimum_down_payment_percent, 0) / 100
                        ) AS required_amount,
                        COALESCE((SELECT SUM(amount) FROM eligible_payments), 0) AS paid_amount
                    FROM locked_deal AS deal
                    CROSS JOIN locked_unit AS unit
                    CROSS JOIN selected_rule AS rule
                    LEFT JOIN financing ON TRUE
                    WHERE
                        (
                            rule.financing_approval_required = FALSE OR
                            financing.status = 'approved'
                        )
                ),
                qualified AS MATERIALIZED (
                    SELECT *
                    FROM eligibility
                    WHERE paid_amount >= required_amount
                ),
                created_reservation AS (
                    INSERT INTO inventory_unit_reservations (
                        tenant_id,
                        deal_id,
                        customer_id,
                        sales_order_id,
                        inventory_unit_id,
                        rule_id,
                        status,
                        required_down_payment_amount,
                        eligible_payment_amount,
                        rule_snapshot,
                        reserved_by_clerk_user_id,
                        reserved_by_name,
                        metadata,
                        reserved_at,
                        created_at,
                        updated_at
                    )
                    SELECT
                        ${tenantId},
                        qualified.deal_id,
                        qualified.customer_id,
                        ${salesOrderId ?? null},
                        qualified.unit_id,
                        qualified.rule_id,
                        'active',
                        qualified.required_amount,
                        qualified.paid_amount,
                        jsonb_build_object(
                            'name', qualified.rule_name,
                            'minimumDownPaymentPercent', qualified.minimum_down_payment_percent,
                            'minimumDownPaymentAmount', qualified.minimum_down_payment_amount,
                            'financingApprovalRequired', qualified.financing_approval_required,
                            'financingApplicationId', qualified.financing_application_id,
                            'unitPrice', qualified.unit_price
                        ),
                        ${userId},
                        ${actorName},
                        jsonb_build_object(
                            'vin', qualified.vin,
                            'serialNumber', qualified.serial_number
                        ),
                        NOW(),
                        NOW(),
                        NOW()
                    FROM qualified
                    RETURNING
                        id,
                        inventory_unit_id,
                        required_down_payment_amount,
                        eligible_payment_amount
                ),
                reserved_unit AS (
                    UPDATE inventory_units AS unit
                    SET
                        status = 'reserved',
                        updated_at = NOW()
                    FROM created_reservation AS reservation
                    WHERE
                        unit.tenant_id = ${tenantId}
                        AND unit.id = reservation.inventory_unit_id
                        AND unit.status = 'available'
                    RETURNING unit.id
                ),
                linked_payments AS (
                    INSERT INTO inventory_unit_reservation_payments (
                        reservation_id,
                        payment_id,
                        tenant_id,
                        applied_amount,
                        created_at
                    )
                    SELECT
                        reservation.id,
                        payment.id,
                        ${tenantId},
                        payment.amount,
                        NOW()
                    FROM created_reservation AS reservation
                    CROSS JOIN eligible_payments AS payment
                    RETURNING payment_id
                ),
                created_event AS (
                    INSERT INTO commercial_operation_events (
                        tenant_id,
                        deal_id,
                        event_type,
                        entity_type,
                        entity_id,
                        summary,
                        source,
                        actor_clerk_user_id,
                        actor_name,
                        idempotency_key,
                        payload,
                        occurred_at,
                        created_at
                    )
                    SELECT
                        ${tenantId},
                        ${dealId},
                        'inventory_unit_reserved',
                        'inventory_unit_reservation',
                        reservation.id::text,
                        CONCAT(
                            'Unidad ',
                            COALESCE(qualified.vin, qualified.serial_number, qualified.unit_id::text),
                            ' apartada.'
                        ),
                        'user',
                        ${userId},
                        ${actorName},
                        CONCAT('inventory-unit-reserved:', reservation.id::text),
                        jsonb_build_object(
                            'inventoryUnitId', qualified.unit_id,
                            'vin', qualified.vin,
                            'serialNumber', qualified.serial_number,
                            'ruleId', qualified.rule_id,
                            'requiredDownPaymentAmount', qualified.required_amount,
                            'eligiblePaymentAmount', qualified.paid_amount,
                            'financingApplicationId', qualified.financing_application_id
                        ),
                        NOW(),
                        NOW()
                    FROM created_reservation AS reservation
                    CROSS JOIN qualified
                    WHERE EXISTS (
                        SELECT 1
                        FROM reserved_unit
                    )
                    RETURNING id
                )
                SELECT
                    reservation.id AS "reservationId",
                    reservation.inventory_unit_id AS "inventoryUnitId",
                    reservation.required_down_payment_amount AS "requiredAmount",
                    reservation.eligible_payment_amount AS "eligiblePaymentAmount"
                FROM created_reservation AS reservation
                WHERE
                    EXISTS (SELECT 1 FROM reserved_unit)
                    AND EXISTS (SELECT 1 FROM created_event)
            `);

        const reservation =
            result.rows[0];

        if (!reservation) {
            throw new ApiError(
                "La unidad dejó de estar disponible o la operación ya no cumple las condiciones de apartado.",
                409,
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "La unidad fue apartada correctamente.",
                data: reservation,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        return createErrorResponse(error);
    }
}
