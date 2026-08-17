import type {
    CRMAutomationAction,
    CRMAutomationCondition,
    CRMAutomationEntityType,
    CRMAutomationTriggerType,
} from "@/db/schema";

export class AutomationValidationError
    extends Error {
    status = 400;
}

export type AutomationRulePayload = {
    name: string;
    description: string | null;
    branchId: string | null;

    entityType:
    CRMAutomationEntityType;

    triggerType:
    CRMAutomationTriggerType;

    conditions: {
        mode: "all" | "any";
        items:
        CRMAutomationCondition[];
    };

    actions:
    CRMAutomationAction[];

    enabled: boolean;
    stopOnError: boolean;
};

const entityTypes =
    new Set<
        CRMAutomationEntityType
    >([
        "lead",
        "customer",
        "deal",
        "activity",
    ]);

const triggerTypes =
    new Set<
        CRMAutomationTriggerType
    >([
        "record_created",
        "record_updated",
        "status_changed",
    ]);

const conditionOperators =
    new Set<
        CRMAutomationCondition[
        "operator"
        ]
    >([
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "is_empty",
        "is_not_empty",
        "greater_than",
        "less_than",
        "changed",
    ]);

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

function getRequiredString(
    value: unknown,
    fieldName: string,
    maximumLength: number,
): string {
    if (
        typeof value !==
        "string" ||
        !value.trim()
    ) {
        throw new AutomationValidationError(
            `${fieldName} es obligatorio.`,
        );
    }

    const normalized =
        value.trim();

    if (
        normalized.length >
        maximumLength
    ) {
        throw new AutomationValidationError(
            `${fieldName} supera la longitud permitida.`,
        );
    }

    return normalized;
}

function getOptionalString(
    value: unknown,
    fieldName: string,
    maximumLength: number,
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
        throw new AutomationValidationError(
            `${fieldName} no tiene un formato válido.`,
        );
    }

    const normalized =
        value.trim();

    if (!normalized) {
        return null;
    }

    if (
        normalized.length >
        maximumLength
    ) {
        throw new AutomationValidationError(
            `${fieldName} supera la longitud permitida.`,
        );
    }

    return normalized;
}

function getBoolean(
    value: unknown,
    defaultValue: boolean,
): boolean {
    if (value === undefined) {
        return defaultValue;
    }

    if (
        typeof value !==
        "boolean"
    ) {
        throw new AutomationValidationError(
            "Una opción de la automatización no tiene un formato válido.",
        );
    }

    return value;
}

function getBranchId(
    value: unknown,
): string | null {
    const branchId =
        getOptionalString(
            value,
            "La sucursal",
            36,
        );

    if (
        branchId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            branchId,
        )
    ) {
        throw new AutomationValidationError(
            "La sucursal no tiene un identificador válido.",
        );
    }

    return branchId;
}

function getConditions(
    value: unknown,
): AutomationRulePayload[
    "conditions"
    ] {
    if (!isRecord(value)) {
        throw new AutomationValidationError(
            "Las condiciones no tienen un formato válido.",
        );
    }

    const mode =
        value.mode;

    if (
        mode !== "all" &&
        mode !== "any"
    ) {
        throw new AutomationValidationError(
            "La combinación de condiciones no es válida.",
        );
    }

    if (
        !Array.isArray(
            value.items,
        )
    ) {
        throw new AutomationValidationError(
            "Las condiciones no tienen un formato válido.",
        );
    }

    if (
        value.items.length >
        20
    ) {
        throw new AutomationValidationError(
            "Una automatización no puede tener más de 20 condiciones.",
        );
    }

    const items =
        value.items.map(
            (
                item,
                index,
            ): CRMAutomationCondition => {
                if (!isRecord(item)) {
                    throw new AutomationValidationError(
                        `La condición ${index + 1} no tiene un formato válido.`,
                    );
                }

                const field =
                    getRequiredString(
                        item.field,
                        `El campo de la condición ${index + 1}`,
                        80,
                    );

                if (
                    !/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(
                        field,
                    )
                ) {
                    throw new AutomationValidationError(
                        `El campo de la condición ${index + 1} no es válido.`,
                    );
                }

                const operator =
                    item.operator;

                if (
                    typeof operator !==
                    "string" ||
                    !conditionOperators.has(
                        operator as
                        CRMAutomationCondition[
                        "operator"
                        ],
                    )
                ) {
                    throw new AutomationValidationError(
                        `El operador de la condición ${index + 1} no es válido.`,
                    );
                }

                return {
                    field,

                    operator:
                        operator as
                        CRMAutomationCondition[
                        "operator"
                        ],

                    value:
                        item.value,
                };
            },
        );

    return {
        mode,
        items,
    };
}

function getActions(
    value: unknown,
): CRMAutomationAction[] {
    if (
        !Array.isArray(value) ||
        value.length === 0
    ) {
        throw new AutomationValidationError(
            "Agrega al menos una acción.",
        );
    }

    if (value.length > 10) {
        throw new AutomationValidationError(
            "Una automatización no puede tener más de 10 acciones.",
        );
    }

    return value.map(
        (
            action,
            index,
        ): CRMAutomationAction => {
            if (!isRecord(action)) {
                throw new AutomationValidationError(
                    `La acción ${index + 1} no tiene un formato válido.`,
                );
            }

            switch (action.type) {
                case "assign_owner":
                    return {
                        type:
                            "assign_owner",

                        clerkUserId:
                            getRequiredString(
                                action.clerkUserId,
                                `El responsable de la acción ${index + 1}`,
                                255,
                            ),
                    };

                case "update_field":
                    return {
                        type:
                            "update_field",

                        field:
                            getRequiredString(
                                action.field,
                                `El campo de la acción ${index + 1}`,
                                80,
                            ),

                        value:
                            action.value,
                    };

                case "change_status":
                    return {
                        type:
                            "change_status",

                        status:
                            getRequiredString(
                                action.status,
                                `El estado de la acción ${index + 1}`,
                                120,
                            ),
                    };

                case "create_activity": {
                    const dueInMinutes =
                        action.dueInMinutes;

                    if (
                        dueInMinutes !==
                        undefined &&
                        (
                            typeof dueInMinutes !==
                            "number" ||
                            !Number.isInteger(
                                dueInMinutes,
                            ) ||
                            dueInMinutes < 0 ||
                            dueInMinutes >
                            525_600
                        )
                    ) {
                        throw new AutomationValidationError(
                            `El vencimiento de la acción ${index + 1} no es válido.`,
                        );
                    }

                    return {
                        type:
                            "create_activity",

                        activityType:
                            getRequiredString(
                                action.activityType,
                                `El tipo de actividad de la acción ${index + 1}`,
                                80,
                            ),

                        subject:
                            getRequiredString(
                                action.subject,
                                `El asunto de la acción ${index + 1}`,
                                200,
                            ),

                        description:
                            getOptionalString(
                                action.description,
                                `La descripción de la acción ${index + 1}`,
                                2_000,
                            ) ??
                            undefined,

                        priority:
                            getOptionalString(
                                action.priority,
                                `La prioridad de la acción ${index + 1}`,
                                80,
                            ) ??
                            undefined,

                        dueInMinutes,

                        ownerClerkUserId:
                            getOptionalString(
                                action.ownerClerkUserId,
                                `El responsable de la acción ${index + 1}`,
                                255,
                            ) ??
                            undefined,
                    };
                }

                case "create_notification":
                    return {
                        type:
                            "create_notification",

                        title:
                            getRequiredString(
                                action.title,
                                `El título de la acción ${index + 1}`,
                                160,
                            ),

                        message:
                            getRequiredString(
                                action.message,
                                `El mensaje de la acción ${index + 1}`,
                                2_000,
                            ),

                        recipientClerkUserId:
                            getOptionalString(
                                action.recipientClerkUserId,
                                `El destinatario de la acción ${index + 1}`,
                                255,
                            ) ??
                            undefined,
                    };

                default:
                    throw new AutomationValidationError(
                        `El tipo de la acción ${index + 1} no es válido.`,
                    );
            }
        },
    );
}

export function getAutomationRulePayload(
    value: unknown,
): AutomationRulePayload {
    if (!isRecord(value)) {
        throw new AutomationValidationError(
            "La automatización no tiene un formato válido.",
        );
    }

    const entityType =
        value.entityType;

    if (
        typeof entityType !==
        "string" ||
        !entityTypes.has(
            entityType as
            CRMAutomationEntityType,
        )
    ) {
        throw new AutomationValidationError(
            "La entidad seleccionada no es válida.",
        );
    }

    const triggerType =
        value.triggerType;

    if (
        typeof triggerType !==
        "string" ||
        !triggerTypes.has(
            triggerType as
            CRMAutomationTriggerType,
        )
    ) {
        throw new AutomationValidationError(
            "El disparador seleccionado no es válido.",
        );
    }

    return {
        name:
            getRequiredString(
                value.name,
                "El nombre",
                120,
            ),

        description:
            getOptionalString(
                value.description,
                "La descripción",
                500,
            ),

        branchId:
            getBranchId(
                value.branchId,
            ),

        entityType:
            entityType as
            CRMAutomationEntityType,

        triggerType:
            triggerType as
            CRMAutomationTriggerType,

        conditions:
            getConditions(
                value.conditions,
            ),

        actions:
            getActions(
                value.actions,
            ),

        enabled:
            getBoolean(
                value.enabled,
                false,
            ),

        stopOnError:
            getBoolean(
                value.stopOnError,
                true,
            ),
    };
}