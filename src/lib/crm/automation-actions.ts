import {
    and,
    eq,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmActivities,
    crmCustomers,
    crmDeals,
    crmLeads,
    crmNotifications,
    tenantMembers,
    type CRMAutomationAction,
    type CRMAutomationEntityType,
} from "@/db/schema";

import {
    sendAutomationEmail,
} from "@/lib/crm/automation-email";

type AutomationRecord =
    Record<string, unknown>;

export type AutomationActionContext = {
    tenantId: string;
    ruleId: string;
    executionId: string;

    entityType:
    CRMAutomationEntityType;

    entityId: string;
    actorClerkUserId: string;

    record:
    AutomationRecord;
};

export type AutomationActionResult = {
    message: string;
    record:
    AutomationRecord;
};

class AutomationActionError
    extends Error { }

function getTextValue(
    value: unknown,
    fieldName: string,
    allowNull = false,
): string | null {
    if (
        allowNull &&
        (
            value === null ||
            value === undefined ||
            value === ""
        )
    ) {
        return null;
    }

    if (
        typeof value !==
        "string" ||
        !value.trim()
    ) {
        throw new AutomationActionError(
            `${fieldName} requiere un texto válido.`,
        );
    }

    return value.trim();
}

function getBooleanValue(
    value: unknown,
    fieldName: string,
): boolean {
    if (
        typeof value !==
        "boolean"
    ) {
        throw new AutomationActionError(
            `${fieldName} requiere un valor verdadero o falso.`,
        );
    }

    return value;
}

function getRecordValue(
    record:
        AutomationRecord,
    fieldPath: string,
): unknown {
    return fieldPath
        .split(".")
        .reduce<unknown>(
            (
                currentValue,
                field,
            ) => {
                if (
                    typeof currentValue !==
                    "object" ||
                    currentValue ===
                    null ||
                    Array.isArray(
                        currentValue,
                    )
                ) {
                    return undefined;
                }

                return (
                    currentValue as
                    AutomationRecord
                )[field];
            },
            record,
        );
}

function renderTemplate(
    template: string,
    record:
        AutomationRecord,
): string {
    return template.replace(
        /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g,
        (
            _match,
            fieldPath: string,
        ) => {
            const value =
                getRecordValue(
                    record,
                    fieldPath,
                );

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            if (
                typeof value ===
                "object"
            ) {
                return JSON.stringify(
                    value,
                );
            }

            return String(value);
        },
    );
}

async function getMemberSnapshot(
    tenantId: string,
    clerkUserId: string,
) {
    const [member] =
        await db
            .select({
                clerkUserId:
                    tenantMembers
                        .clerkUserId,

                firstName:
                    tenantMembers
                        .firstName,

                lastName:
                    tenantMembers
                        .lastName,

                email:
                    tenantMembers.email,
            })
            .from(tenantMembers)
            .where(
                and(
                    eq(
                        tenantMembers
                            .tenantId,
                        tenantId,
                    ),

                    eq(
                        tenantMembers
                            .clerkUserId,
                        clerkUserId,
                    ),

                    eq(
                        tenantMembers.status,
                        "active",
                    ),
                ),
            )
            .limit(1);

    if (!member) {
        throw new AutomationActionError(
            "El usuario seleccionado ya no pertenece a la empresa.",
        );
    }

    return {
        clerkUserId:
            member.clerkUserId,

        name:
            [
                member.firstName,
                member.lastName,
            ]
                .filter(Boolean)
                .join(" ") ||
            member.email,

        email:
            member.email,
    };
}

async function assignOwner(
    context:
        AutomationActionContext,
    clerkUserId: string,
): Promise<
    AutomationActionResult
> {
    const owner =
        await getMemberSnapshot(
            context.tenantId,
            clerkUserId,
        );

    const updateValues = {
        ownerClerkUserId:
            owner.clerkUserId,

        ownerName:
            owner.name,

        ownerEmail:
            owner.email,

        updatedAt:
            new Date(),
    };

    switch (
    context.entityType
    ) {
        case "lead":
            await db
                .update(crmLeads)
                .set(updateValues)
                .where(
                    and(
                        eq(
                            crmLeads.id,
                            context.entityId,
                        ),

                        eq(
                            crmLeads.tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;

        case "customer":
            await db
                .update(crmCustomers)
                .set(updateValues)
                .where(
                    and(
                        eq(
                            crmCustomers.id,
                            context.entityId,
                        ),

                        eq(
                            crmCustomers.tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;

        case "deal":
            await db
                .update(crmDeals)
                .set(updateValues)
                .where(
                    and(
                        eq(
                            crmDeals.id,
                            context.entityId,
                        ),

                        eq(
                            crmDeals.tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;

        case "activity":
            await db
                .update(crmActivities)
                .set(updateValues)
                .where(
                    and(
                        eq(
                            crmActivities.id,
                            context.entityId,
                        ),

                        eq(
                            crmActivities
                                .tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;

        case "sales_order":
            throw new AutomationActionError(
                "El responsable de una orden de venta no puede cambiarse mediante automatizaciones.",
            );
    }

    return {
        message:
            `Responsable asignado: ${owner.name}.`,

        record: {
            ...context.record,
            ...updateValues,
        },
    };
}

async function updateField(
    context:
        AutomationActionContext,
    field: string,
    value: unknown,
): Promise<
    AutomationActionResult
> {
    const updatedAt =
        new Date();

    switch (
    context.entityType
    ) {
        case "lead": {
            const values:
                Partial<
                    typeof crmLeads
                    .$inferInsert
                > = {
                updatedAt,
            };

            switch (field) {
                case "status":
                    values.status =
                        getTextValue(
                            value,
                            "El estado",
                        )!;
                    break;

                case "source":
                    values.source =
                        getTextValue(
                            value,
                            "El origen",
                            true,
                        );
                    break;

                case "notes":
                    values.notes =
                        getTextValue(
                            value,
                            "Las notas",
                            true,
                        );
                    break;

                case "commercialConsent":
                    values
                        .commercialConsent =
                        getBooleanValue(
                            value,
                            "El consentimiento comercial",
                        );
                    break;

                default:
                    throw new AutomationActionError(
                        `El campo ${field} no puede modificarse automáticamente en prospectos.`,
                    );
            }

            await db
                .update(crmLeads)
                .set(values)
                .where(
                    and(
                        eq(
                            crmLeads.id,
                            context.entityId,
                        ),

                        eq(
                            crmLeads.tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;
        }

        case "customer": {
            const values:
                Partial<
                    typeof crmCustomers
                    .$inferInsert
                > = {
                updatedAt,
            };

            switch (field) {
                case "status":
                    values.status =
                        getTextValue(
                            value,
                            "El estado",
                        )!;
                    break;

                case "notes":
                    values.notes =
                        getTextValue(
                            value,
                            "Las notas",
                            true,
                        );
                    break;

                case "commercialConsent":
                    values
                        .commercialConsent =
                        getBooleanValue(
                            value,
                            "El consentimiento comercial",
                        );
                    break;

                default:
                    throw new AutomationActionError(
                        `El campo ${field} no puede modificarse automáticamente en clientes.`,
                    );
            }

            await db
                .update(crmCustomers)
                .set(values)
                .where(
                    and(
                        eq(
                            crmCustomers.id,
                            context.entityId,
                        ),

                        eq(
                            crmCustomers
                                .tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;
        }

        case "deal": {
            const values:
                Partial<
                    typeof crmDeals
                    .$inferInsert
                > = {
                updatedAt,
            };

            switch (field) {
                case "status":
                    values.status =
                        getTextValue(
                            value,
                            "El estado",
                        )!;
                    break;

                case "stage":
                    values.stage =
                        getTextValue(
                            value,
                            "La etapa",
                        )!;
                    break;

                case "acquisitionChannel":
                    values
                        .acquisitionChannel =
                        getTextValue(
                            value,
                            "El canal de adquisición",
                            true,
                        );
                    break;

                case "paymentMethod":
                    values.paymentMethod =
                        getTextValue(
                            value,
                            "El método de pago",
                            true,
                        );
                    break;

                default:
                    throw new AutomationActionError(
                        `El campo ${field} no puede modificarse automáticamente en oportunidades.`,
                    );
            }

            await db
                .update(crmDeals)
                .set(values)
                .where(
                    and(
                        eq(
                            crmDeals.id,
                            context.entityId,
                        ),

                        eq(
                            crmDeals.tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;
        }

        case "activity": {
            const values:
                Partial<
                    typeof crmActivities
                    .$inferInsert
                > = {
                updatedAt,
            };

            switch (field) {
                case "status":
                    values.status =
                        getTextValue(
                            value,
                            "El estado",
                        )!;
                    break;

                case "priority":
                    values.priority =
                        getTextValue(
                            value,
                            "La prioridad",
                        )!;
                    break;

                case "subject":
                    values.subject =
                        getTextValue(
                            value,
                            "El asunto",
                        )!;
                    break;

                case "description":
                    values.description =
                        getTextValue(
                            value,
                            "La descripción",
                            true,
                        );
                    break;

                default:
                    throw new AutomationActionError(
                        `El campo ${field} no puede modificarse automáticamente en actividades.`,
                    );

        case "sales_order":
            throw new AutomationActionError(
                "Los campos operativos de una orden de venta no pueden modificarse mediante automatizaciones.",
            );
            }

            await db
                .update(crmActivities)
                .set(values)
                .where(
                    and(
                        eq(
                            crmActivities.id,
                            context.entityId,
                        ),

                        eq(
                            crmActivities
                                .tenantId,
                            context.tenantId,
                        ),
                    ),
                );
            break;
        }
    }

    return {
        message:
            `Campo actualizado: ${field}.`,

        record: {
            ...context.record,
            [field]:
                value,
            updatedAt,
        },
    };
}

async function createActivity(
    context:
        AutomationActionContext,
    action: Extract<
        CRMAutomationAction,
        {
            type:
            "create_activity";
        }
    >,
): Promise<
    AutomationActionResult
> {
    const requestedOwnerId =
        action.ownerClerkUserId ??
        (
            typeof context.record
                .ownerClerkUserId ===
                "string"
                ? context.record
                    .ownerClerkUserId
                : context
                    .actorClerkUserId
        );

    const owner =
        await getMemberSnapshot(
            context.tenantId,
            requestedOwnerId,
        );

    const dueAt =
        action.dueInMinutes ===
            undefined
            ? null
            : new Date(
                Date.now() +
                action
                    .dueInMinutes *
                60_000,
            );

    const [activity] =
        await db
            .insert(crmActivities)
            .values({
                tenantId:
                    context.tenantId,

                type:
                    action.activityType,

                subject:
                    renderTemplate(
                        action.subject,
                        context.record,
                    ),

                description:
                    action.description
                        ? renderTemplate(
                            action.description,
                            context.record,
                        )
                        : null,

                priority:
                    action.priority ??
                    "Normal",

                ownerClerkUserId:
                    owner.clerkUserId,

                ownerName:
                    owner.name,

                ownerEmail:
                    owner.email,

                leadId:
                    context.entityType ===
                        "lead"
                        ? context.entityId
                        : null,

                customerId:
                    context.entityType ===
                        "customer"
                        ? context.entityId
                        : null,

                dealId:
                    context.entityType ===
                        "deal"
                        ? context.entityId
                        : null,

                dueAt,

                metadata: {
                    automationRuleId:
                        context.ruleId,

                    automationExecutionId:
                        context.executionId,

                    sourceEntityType:
                        context.entityType,

                    sourceEntityId:
                        context.entityId,
                },
            })
            .returning({
                id:
                    crmActivities.id,
            });

    if (!activity) {
        throw new AutomationActionError(
            "No fue posible crear la actividad automática.",
        );
    }

    return {
        message:
            `Actividad creada: ${activity.id}.`,

        record:
            context.record,
    };
}

async function createNotification(
    context:
        AutomationActionContext,
    action: Extract<
        CRMAutomationAction,
        {
            type:
            "create_notification";
        }
    >,
): Promise<
    AutomationActionResult
> {
    const recipientClerkUserId =
        action
            .recipientClerkUserId ??
        (
            typeof context.record
                .ownerClerkUserId ===
                "string"
                ? context.record
                    .ownerClerkUserId
                : context
                    .actorClerkUserId
        );

    await getMemberSnapshot(
        context.tenantId,
        recipientClerkUserId,
    );

    const [notification] =
        await db
            .insert(
                crmNotifications,
            )
            .values({
                tenantId:
                    context.tenantId,

                recipientClerkUserId,

                title:
                    renderTemplate(
                        action.title,
                        context.record,
                    ),

                message:
                    renderTemplate(
                        action.message,
                        context.record,
                    ),

                entityType:
                    context.entityType,

                entityId:
                    context.entityId,

                automationRuleId:
                    context.ruleId,

                automationExecutionId:
                    context.executionId,

                metadata: {},
            })
            .returning({
                id:
                    crmNotifications.id,
            });

    if (!notification) {
        throw new AutomationActionError(
            "No fue posible crear la notificación automática.",
        );
    }

    return {
        message:
            `Notificación creada: ${notification.id}.`,

        record:
            context.record,
    };
}

export async function executeAutomationAction(
    context:
        AutomationActionContext,
    action:
        CRMAutomationAction,
): Promise<
    AutomationActionResult
> {
    switch (action.type) {
        case "assign_owner":
            return assignOwner(
                context,
                action.clerkUserId,
            );

        case "update_field":
            return updateField(
                context,
                action.field,
                action.value,
            );

        case "change_status":
            return updateField(
                context,
                "status",
                action.status,
            );

        case "create_activity":
            return createActivity(
                context,
                action,
            );

        case "create_notification":
            return createNotification(
                context,
                action,
            );
        case "send_email": {
            const message =
                await sendAutomationEmail({
                    tenantId:
                        context.tenantId,

                    entityType:
                        context.entityType,

                    record:
                        context.record,

                    action,
                });

            return {
                message,

                record:
                    context.record,
            };
        }
    }
}