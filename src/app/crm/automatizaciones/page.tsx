"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import AutomationRuleEditor from "@/components/crm/AutomationRuleEditor";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import PageHeader from "@/components/shared/PageHeader";

import type {
    AutomationExecution,
    AutomationAction,
    AutomationCondition,
    AutomationPermissions,
    AutomationRule,
    AutomationRulePayload,
    BranchOption,
    MemberOption,
} from "@/components/crm/automation-types";

type RulesResponse = {
    success: boolean;

    data?: {
        rules:
        AutomationRule[];

        permissions:
        AutomationPermissions;
    };

    error?: string;
    message?: string;
};

type BranchesResponse = {
    success: boolean;
    data?: BranchOption[];
    error?: string;
};

type MembersResponse = {
    success: boolean;
    data?: MemberOption[];
    error?: string;
};

type HistoryResponse = {
    success: boolean;

    data?: {
        executions:
        AutomationExecution[];
    };

    error?: string;
};

const entityLabels = {
    lead: "Prospectos",
    customer: "Clientes",
    deal: "Oportunidades",
    activity: "Actividades",
    sales_order:
        "Órdenes de venta",
} as const;

const triggerLabels = {
    record_created:
        "Al crear",
    record_updated:
        "Al actualizar",
    status_changed:
        "Al cambiar estado",
} as const;

const conditionOperatorLabels = {
    equals: "es igual a",
    not_equals:
        "no es igual a",
    contains: "contiene",
    not_contains:
        "no contiene",
    is_empty: "está vacío",
    is_not_empty:
        "no está vacío",
    greater_than:
        "es mayor que",
    less_than:
        "es menor que",
    changed: "cambió",
} as const;

const fieldLabels:
    Record<string, string> = {
    status: "Estado",
    stage: "Etapa",
    source: "Origen",
    customerType:
        "Tipo de cliente",
    commercialConsent:
        "Consentimiento comercial",
    acquisitionChannel:
        "Canal de adquisición",
    paymentMethod:
        "Método de pago",
    priority: "Prioridad",
    type: "Tipo",
    customerName:
        "Nombre del cliente",
    customerEmail:
        "Correo del cliente",
    totalAmount: "Total",
    expectedCloseAt:
        "Fecha estimada de cierre",
    closedAt:
        "Fecha de cierre",
    confirmedAt:
        "Fecha de confirmación",
    deliveredAt:
        "Fecha de entrega",
    startAt: "Fecha de inicio",
    endAt: "Fecha de fin",
    dueAt: "Fecha de vencimiento",
    completedAt:
        "Fecha de conclusión",
    createdAt:
        "Fecha de creación",
    updatedAt:
        "Fecha de actualización",
};

const actionLabels = {
    assign_owner:
        "Asignar responsable",
    update_field:
        "Actualizar campo",
    change_status:
        "Cambiar estado",
    create_activity:
        "Crear actividad",
    create_notification:
        "Crear notificación",
    send_email:
        "Enviar correo",
} as const;

const delayUnitLabels = {
    minutes: "minuto(s)",
    hours: "hora(s)",
    days: "día(s)",
    months: "mes(es)",
} as const;

function formatCondition(
    condition:
        AutomationCondition,
) {
    const field =
        fieldLabels[
            condition.field
        ] ??
        condition.field;

    const operator =
        conditionOperatorLabels[
            condition.operator
        ];

    if (
        condition.operator ===
            "is_empty" ||
        condition.operator ===
            "is_not_empty" ||
        condition.operator ===
            "changed"
    ) {
        return `${field} ${operator}`;
    }

    return `${field} ${operator} “${String(
        condition.value ?? "",
    )}”`;
}

function formatAction(
    action:
        AutomationAction,
) {
    let description =
        actionLabels[
            action.type
        ];

    if (
        action.type ===
        "change_status"
    ) {
        description +=
            ` a “${action.status}”`;
    }

    if (
        action.type ===
        "update_field"
    ) {
        description +=
            `: ${fieldLabels[action.field] ?? action.field}`;
    }

    if (
        action.type ===
        "create_activity"
    ) {
        description +=
            `: ${action.subject}`;
    }

    if (
        action.type ===
        "create_notification"
    ) {
        description +=
            `: ${action.title}`;
    }

    if (
        action.type ===
        "send_email"
    ) {
        const recipient =
            action.recipientSource ===
                "related_customer"
                ? "al cliente relacionado"
                : action.recipientSource ===
                      "record"
                  ? "al correo del registro"
                  : action.recipientSource ===
                        "owner"
                    ? "al responsable"
                    : `a ${action.recipientEmail ?? "un correo fijo"}`;

        description +=
            ` ${recipient}: ${action.subject}`;
    }

    if (action.delay) {
        const base =
            action.delay
                .baseField
                ? fieldLabels[
                    action.delay
                        .baseField
                ] ??
                  action.delay
                      .baseField
                : "el momento del evento";

        description +=
            ` · ${action.delay.amount} ${
                delayUnitLabels[
                    action.delay.unit
                ]
            } después de ${base}`;
    } else {
        description +=
            " · Inmediatamente";
    }

    return description;
}

function getNextScheduledDate(
    ruleId: string,
    executions:
        AutomationExecution[],
): string | null {
    const pendingDates =
        executions
            .filter(
                (
                    execution,
                ) =>
                    execution.ruleId ===
                    ruleId,
            )
            .flatMap(
                (
                    execution,
                ) =>
                    execution.scheduledJobs,
            )
            .filter(
                (job) =>
                    job.status ===
                        "pending" ||
                    job.status ===
                        "processing",
            )
            .map(
                (job) =>
                    job.scheduledFor,
            )
            .sort(
                (
                    first,
                    second,
                ) =>
                    new Date(
                        first,
                    ).getTime() -
                    new Date(
                        second,
                    ).getTime(),
            );

    return pendingDates[0] ??
        null;
}

const statusLabels = {
    running: "Procesando",
    succeeded: "Completada",
    partially_succeeded:
        "Parcial",
    failed: "Fallida",
    skipped: "Omitida",
    pending: "Pendiente",
    processing: "Procesando",
    cancelled: "Cancelada",
} as const;

function formatDate(
    value:
        string | null,
) {
    if (!value) {
        return "Nunca";
    }

    return new Intl
        .DateTimeFormat(
            "es-MX",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "short",
            },
        )
        .format(
            new Date(value),
        );
}

function getStatusClasses(
    status: string,
) {
    if (
        status ===
        "succeeded"
    ) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
        status ===
        "failed"
    ) {
        return "border-red-200 bg-red-50 text-red-700";
    }

    if (
        status ===
        "pending" ||
        status ===
        "processing" ||
        status ===
        "running"
    ) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
}

async function readJson<
    T extends {
        success: boolean;
        error?: string;
    },
>(
    response: Response,
): Promise<T> {
    const result =
        (await response.json()) as
        T;

    if (
        !response.ok ||
        !result.success
    ) {
        throw new Error(
            result.error ??
            "La solicitud no pudo completarse.",
        );
    }

    return result;
}

export default function AutomatizacionesPage() {
    const [
        rules,
        setRules,
    ] = useState<
        AutomationRule[]
    >([]);

    const [
        branches,
        setBranches,
    ] = useState<
        BranchOption[]
    >([]);

    const [
        members,
        setMembers,
    ] = useState<
        MemberOption[]
    >([]);

    const [
        executions,
        setExecutions,
    ] = useState<
        AutomationExecution[]
    >([]);

    const [
        permissions,
        setPermissions,
    ] = useState<
        AutomationPermissions | null
    >(null);

    const [
        activeTab,
        setActiveTab,
    ] = useState<
        "rules" | "history"
    >("rules");

    const [
        editingRule,
        setEditingRule,
    ] = useState<
        AutomationRule | null
    >(null);

    const [
        editorOpen,
        setEditorOpen,
    ] = useState(false);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(null);

    const [
        message,
        setMessage,
    ] = useState<
        string | null
    >(null);

    const loadData =
        useCallback(
            async () => {
                try {
                    setIsLoading(
                        true,
                    );

                    setError(
                        null,
                    );

                    const [
                        rulesResponse,
                        branchesResponse,
                        membersResponse,
                        historyResponse,
                    ] =
                        await Promise.all([
                            fetch(
                                "/api/crm/automations",
                                {
                                    cache:
                                        "no-store",
                                },
                            ),

                            fetch(
                                "/api/crm/branches/options",
                                {
                                    cache:
                                        "no-store",
                                },
                            ),

                            fetch(
                                "/api/crm/members/options",
                                {
                                    cache:
                                        "no-store",
                                },
                            ),

                            fetch(
                                "/api/crm/automations/history?limit=50",
                                {
                                    cache:
                                        "no-store",
                                },
                            ),
                        ]);

                    const [
                        rulesResult,
                        branchesResult,
                        membersResult,
                        historyResult,
                    ] =
                        await Promise.all([
                            readJson<
                                RulesResponse
                            >(
                                rulesResponse,
                            ),

                            readJson<
                                BranchesResponse
                            >(
                                branchesResponse,
                            ),

                            readJson<
                                MembersResponse
                            >(
                                membersResponse,
                            ),

                            readJson<
                                HistoryResponse
                            >(
                                historyResponse,
                            ),
                        ]);

                    setRules(
                        rulesResult
                            .data
                            ?.rules ??
                        [],
                    );

                    setPermissions(
                        rulesResult
                            .data
                            ?.permissions ??
                        null,
                    );

                    setBranches(
                        branchesResult
                            .data ??
                        [],
                    );

                    setMembers(
                        membersResult
                            .data ??
                        [],
                    );

                    setExecutions(
                        historyResult
                            .data
                            ?.executions ??
                        [],
                    );
                } catch (
                loadError
                ) {
                    setError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "No fue posible cargar las automatizaciones.",
                    );
                } finally {
                    setIsLoading(
                        false,
                    );
                }
            },
            [],
        );

    useEffect(() => {
        void loadData();
    }, [
        loadData,
    ]);

    function openCreate() {
        setEditingRule(
            null,
        );

        setEditorOpen(
            true,
        );

        setError(null);
        setMessage(null);
    }

    function openEdit(
        rule:
            AutomationRule,
    ) {
        setEditingRule(
            rule,
        );

        setEditorOpen(
            true,
        );

        setError(null);
        setMessage(null);
    }

    async function saveRule(
        payload:
            AutomationRulePayload,
    ) {
        try {
            setIsSaving(
                true,
            );

            const response =
                await fetch(
                    editingRule
                        ? `/api/crm/automations/${editingRule.id}`
                        : "/api/crm/automations",
                    {
                        method:
                            editingRule
                                ? "PATCH"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                payload,
                            ),
                    },
                );

            const result =
                await readJson<
                    RulesResponse
                >(response);

            setMessage(
                result.message ??
                "La automatización se guardó correctamente.",
            );

            setEditorOpen(
                false,
            );

            setEditingRule(
                null,
            );

            await loadData();
        } finally {
            setIsSaving(
                false,
            );
        }
    }

    async function toggleRule(
        rule:
            AutomationRule,
    ) {
        try {
            setError(null);
            setMessage(null);

            const response =
                await fetch(
                    `/api/crm/automations/${rule.id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                name:
                                    rule.name,

                                description:
                                    rule.description,

                                branchId:
                                    rule.branchId,

                                entityType:
                                    rule.entityType,

                                triggerType:
                                    rule.triggerType,

                                conditions:
                                    rule.conditions,

                                actions:
                                    rule.actions,

                                enabled:
                                    !rule.enabled,

                                stopOnError:
                                    rule.stopOnError,
                            }),
                    },
                );

            const result =
                await readJson<
                    RulesResponse
                >(response);

            setMessage(
                result.message ??
                "El estado se actualizó correctamente.",
            );

            await loadData();
        } catch (
        toggleError
        ) {
            setError(
                toggleError instanceof
                    Error
                    ? toggleError.message
                    : "No fue posible cambiar el estado.",
            );
        }
    }

    async function deleteRule(
        rule:
            AutomationRule,
    ) {
        if (
            !window.confirm(
                `¿Eliminar la automatización "${rule.name}"? También se cancelarán sus trabajos pendientes.`,
            )
        ) {
            return;
        }

        try {
            setError(null);
            setMessage(null);

            const response =
                await fetch(
                    `/api/crm/automations/${rule.id}`,
                    {
                        method:
                            "DELETE",
                    },
                );

            const result =
                await readJson<
                    RulesResponse
                >(response);

            setMessage(
                result.message ??
                "La automatización se eliminó correctamente.",
            );

            await loadData();
        } catch (
        deleteError
        ) {
            setError(
                deleteError instanceof
                    Error
                    ? deleteError.message
                    : "No fue posible eliminar la automatización.",
            );
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <PageHeader
                    eyebrow="Datara CRM"
                    title="Automatizaciones"
                    description="Ejecuta asignaciones, cambios, actividades, notificaciones y correos cuando ocurra un evento en el CRM."
                    action={
                        permissions
                            ?.canCreate ? (
                            <Button
                                type="button"
                                onClick={
                                    openCreate
                                }
                            >
                                Nueva automatización
                            </Button>
                        ) : null
                    }
                />

                {error ? (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                ) : null}

                {message ? (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                        {message}
                    </div>
                ) : null}

                <div className="mt-8 flex gap-2 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() =>
                            setActiveTab(
                                "rules",
                            )
                        }
                        className={[
                            "border-b-2 px-4 py-3 text-sm font-bold",
                            activeTab ===
                                "rules"
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500",
                        ].join(" ")}
                    >
                        Reglas ({rules.length})
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setActiveTab(
                                "history",
                            )
                        }
                        className={[
                            "border-b-2 px-4 py-3 text-sm font-bold",
                            activeTab ===
                                "history"
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500",
                        ].join(" ")}
                    >
                        Historial ({executions.length})
                    </button>
                </div>

                {isLoading ? (
                    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
                        Cargando automatizaciones...
                    </div>
                ) : activeTab ===
                    "rules" ? (
                    rules.length ===
                        0 ? (
                        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                            <h2 className="text-xl font-black text-slate-950">
                                Todavía no hay automatizaciones
                            </h2>

                            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                                Crea una regla para automatizar seguimientos, tareas, cambios de estado o correos programados.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-8 grid gap-5 lg:grid-cols-2">
                            {rules.map(
                                (
                                    rule,
                                ) => (
                                    <Card
                                        key={
                                            rule.id
                                        }
                                        className="p-6 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={[
                                                            "rounded-full border px-3 py-1 text-xs font-black",
                                                            rule.enabled
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "border-slate-200 bg-slate-50 text-slate-500",
                                                        ].join(" ")}
                                                    >
                                                        {rule.enabled
                                                            ? "Activa"
                                                            : "Inactiva"}
                                                    </span>

                                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                                        {
                                                            entityLabels[
                                                            rule.entityType
                                                            ]
                                                        }
                                                    </span>
                                                </div>

                                                <h2 className="mt-4 truncate text-xl font-black text-slate-950">
                                                    {
                                                        rule.name
                                                    }
                                                </h2>

                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    {rule.description ??
                                                        "Sin descripción."}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    !permissions
                                                        ?.canEdit
                                                }
                                                onClick={() =>
                                                    void toggleRule(
                                                        rule,
                                                    )
                                                }
                                                className={[
                                                    "relative h-7 w-12 rounded-full transition disabled:opacity-40",
                                                    rule.enabled
                                                        ? "bg-emerald-500"
                                                        : "bg-slate-300",
                                                ].join(" ")}
                                                aria-label={
                                                    rule.enabled
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }
                                            >
                                                <span
                                                    className={[
                                                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                                                        rule.enabled
                                                            ? "left-6"
                                                            : "left-1",
                                                    ].join(" ")}
                                                />
                                            </button>
                                        </div>

                                        <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    Disparador
                                                </dt>
                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {
                                                        triggerLabels[
                                                        rule.triggerType
                                                        ]
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    Sucursal
                                                </dt>
                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {rule.branchName ??
                                                        "Todas"}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    Condiciones
                                                </dt>
                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {
                                                        rule.conditions
                                                            .items
                                                            .length
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="font-bold text-slate-500">
                                                    Acciones
                                                </dt>
                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {
                                                        rule.actions
                                                            .length
                                                    }
                                                </dd>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <dt className="font-bold text-slate-500">
                                                    Última ejecución
                                                </dt>
                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {formatDate(
                                                        rule.lastRunAt,
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <dt className="font-bold text-slate-500">
                                                    Próxima acción programada
                                                </dt>

                                                <dd className="mt-1 font-semibold text-slate-900">
                                                    {formatDate(
                                                        getNextScheduledDate(
                                                            rule.id,
                                                            executions,
                                                        ),
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>

                                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                                    Se ejecuta cuando
                                                </p>

                                                <p className="mt-2 text-sm font-bold text-slate-900">
                                                    {
                                                        triggerLabels[
                                                            rule.triggerType
                                                        ]
                                                    }{" "}
                                                    un registro de{" "}
                                                    {
                                                        entityLabels[
                                                            rule.entityType
                                                        ]
                                                    }
                                                </p>

                                                {rule.conditions
                                                    .items
                                                    .length >
                                                0 ? (
                                                    <ul className="mt-3 space-y-2">
                                                        {rule.conditions.items.map(
                                                            (
                                                                condition,
                                                                conditionIndex,
                                                            ) => (
                                                                <li
                                                                    key={
                                                                        conditionIndex
                                                                    }
                                                                    className="text-sm leading-5 text-slate-600"
                                                                >
                                                                    <span className="font-bold text-blue-700">
                                                                        {conditionIndex ===
                                                                        0
                                                                            ? "Si"
                                                                            : rule.conditions.mode ===
                                                                                "all"
                                                                              ? "Y"
                                                                              : "O"}
                                                                    </span>{" "}
                                                                    {formatCondition(
                                                                        condition,
                                                                    )}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                ) : (
                                                    <p className="mt-3 text-sm text-slate-500">
                                                        Sin condiciones adicionales.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                                                    Acciones
                                                </p>

                                                <ol className="mt-3 space-y-2">
                                                    {rule.actions.map(
                                                        (
                                                            action,
                                                            actionIndex,
                                                        ) => (
                                                            <li
                                                                key={
                                                                    actionIndex
                                                                }
                                                                className="text-sm leading-5 text-slate-600"
                                                            >
                                                                <span className="font-bold text-blue-700">
                                                                    {actionIndex +
                                                                        1}.
                                                                </span>{" "}
                                                                {formatAction(
                                                                    action,
                                                                )}
                                                            </li>
                                                        ),
                                                    )}
                                                </ol>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex justify-end gap-3">
                                            {permissions
                                                ?.canDelete ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void deleteRule(
                                                            rule,
                                                        )
                                                    }
                                                    className="rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                                                >
                                                    Eliminar
                                                </button>
                                            ) : null}

                                            {permissions
                                                ?.canEdit ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEdit(
                                                            rule,
                                                        )
                                                    }
                                                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Editar
                                                </button>
                                            ) : null}
                                        </div>
                                    </Card>
                                ),
                            )}
                        </div>
                    )
                ) : executions.length ===
                    0 ? (
                    <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
                        Aún no hay ejecuciones registradas.
                    </div>
                ) : (
                    <div className="mt-8 space-y-4">
                        {executions.map(
                            (
                                execution,
                            ) => (
                                <Card
                                    key={
                                        execution.id
                                    }
                                    className="p-6 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-950">
                                                {
                                                    execution.ruleName
                                                }
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {
                                                    triggerLabels[
                                                    execution.triggerType
                                                    ]
                                                }{" "}
                                                ·{" "}
                                                {
                                                    entityLabels[
                                                    execution.entityType
                                                    ]
                                                }{" "}
                                                ·{" "}
                                                {formatDate(
                                                    execution.startedAt,
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "w-fit rounded-full border px-3 py-1 text-xs font-black",
                                                getStatusClasses(
                                                    execution.status,
                                                ),
                                            ].join(" ")}
                                        >
                                            {
                                                statusLabels[
                                                execution.status
                                                ]
                                            }
                                        </span>
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        {execution.actionResults.map(
                                            (
                                                actionResult,
                                            ) => (
                                                <div
                                                    key={
                                                        actionResult.actionIndex
                                                    }
                                                    className="rounded-xl bg-slate-50 px-4 py-3 text-sm"
                                                >
                                                    <span className="font-bold text-slate-900">
                                                        Acción{" "}
                                                        {actionResult.actionIndex +
                                                            1}
                                                    </span>

                                                    <span className="ml-2 text-slate-500">
                                                        {actionResult.message ??
                                                            actionResult.status}
                                                    </span>
                                                </div>
                                            ),
                                        )}

                                        {execution.scheduledJobs.map(
                                            (
                                                job,
                                            ) => (
                                                <div
                                                    key={
                                                        job.id
                                                    }
                                                    className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <span className="font-semibold text-blue-950">
                                                        Programada para{" "}
                                                        {formatDate(
                                                            job.scheduledFor,
                                                        )}
                                                    </span>

                                                    <span
                                                        className={[
                                                            "w-fit rounded-full border px-3 py-1 text-xs font-black",
                                                            getStatusClasses(
                                                                job.status,
                                                            ),
                                                        ].join(" ")}
                                                    >
                                                        {
                                                            statusLabels[
                                                            job.status
                                                            ]
                                                        }
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    {execution.errorMessage ? (
                                        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                            {
                                                execution.errorMessage
                                            }
                                        </p>
                                    ) : null}
                                </Card>
                            ),
                        )}
                    </div>
                )}
            </div>

            {editorOpen ? (
                <AutomationRuleEditor
                    key={
                        editingRule
                            ?.id ??
                        "new"
                    }
                    rule={
                        editingRule
                    }
                    branches={
                        branches
                    }
                    members={
                        members
                    }
                    isSaving={
                        isSaving
                    }
                    onCancel={() => {
                        setEditorOpen(
                            false,
                        );

                        setEditingRule(
                            null,
                        );
                    }}
                    onSave={
                        saveRule
                    }
                />
            ) : null}
        </main>
    );
}