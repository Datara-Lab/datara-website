"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";

import type {
    AutomationAction,
    AutomationCondition,
    AutomationEntity,
    AutomationRule,
    AutomationRulePayload,
    AutomationTrigger,
    BranchOption,
    ConditionOperator,
    DelayUnit,
    MemberOption,
} from "@/components/crm/automation-types";

import {
    useCRMConfig,
} from "@/hooks/useCRMConfig";

import type {
    CRMFieldConfig,
} from "@/types/crm-config";

type EditorProps = {
    rule:
    AutomationRule | null;

    branches:
    BranchOption[];

    members:
    MemberOption[];

    isSaving: boolean;

    onCancel: () => void;

    onSave: (
        payload:
            AutomationRulePayload,
    ) => Promise<void>;
};

type ActionType =
    AutomationAction["type"];

type DraftAction = {
    id: string;
    type: ActionType;

    clerkUserId: string;
    field: string;
    value: string;
    status: string;

    activityType: string;
    subject: string;
    description: string;
    priority: string;
    dueInMinutes: string;
    ownerClerkUserId: string;

    title: string;
    message: string;
    recipientClerkUserId: string;

    recipientSource:
    | "record"
    | "related_customer"
    | "owner"
    | "fixed";

    recipientEmail: string;
    replyTo: string;

    delayEnabled: boolean;
    delayAmount: string;
    delayUnit:
    DelayUnit;
    baseField: string;
};

const entityOptions:
    Array<{
        value:
        AutomationEntity;
        label: string;
    }> = [
        {
            value: "lead",
            label: "Prospectos",
        },
        {
            value: "customer",
            label: "Clientes",
        },
        {
            value: "deal",
            label: "Oportunidades",
        },
        {
            value: "activity",
            label: "Actividades",
        },
        {
            value:
                "sales_order",
            label:
                "Órdenes de venta",
        },
    ];

const triggerOptions:
    Array<{
        value:
        AutomationTrigger;
        label: string;
    }> = [
        {
            value:
                "record_created",
            label:
                "Al crear el registro",
        },
        {
            value:
                "record_updated",
            label:
                "Al actualizar el registro",
        },
        {
            value:
                "status_changed",
            label:
                "Al cambiar el estado",
        },
    ];

const operatorOptions:
    Array<{
        value:
        ConditionOperator;
        label: string;
    }> = [
        {
            value: "equals",
            label: "Es igual a",
        },
        {
            value: "not_equals",
            label: "No es igual a",
        },
        {
            value: "contains",
            label: "Contiene",
        },
        {
            value: "not_contains",
            label: "No contiene",
        },
        {
            value: "is_empty",
            label: "Está vacío",
        },
        {
            value: "is_not_empty",
            label: "No está vacío",
        },
        {
            value: "greater_than",
            label: "Es mayor que",
        },
        {
            value: "less_than",
            label: "Es menor que",
        },
        {
            value: "changed",
            label: "Cambió",
        },
    ];

const actionOptions:
    Array<{
        value:
        ActionType;
        label: string;
    }> = [
        {
            value: "assign_owner",
            label:
                "Asignar responsable",
        },
        {
            value: "update_field",
            label:
                "Actualizar campo",
        },
        {
            value: "change_status",
            label:
                "Cambiar estado",
        },
        {
            value: "create_activity",
            label:
                "Crear actividad",
        },
        {
            value:
                "create_notification",
            label:
                "Crear notificación",
        },
        {
            value: "send_email",
            label: "Enviar correo",
        },
    ];

function createDraftAction(
    action?:
        AutomationAction,
): DraftAction {
    const base:
        DraftAction = {
        id:
            crypto.randomUUID(),

        type:
            action?.type ??
            "create_notification",

        clerkUserId: "",
        field: "",
        value: "",
        status: "",
        activityType: "task",
        subject: "",
        description: "",
        priority: "Normal",
        dueInMinutes: "",
        ownerClerkUserId: "",
        title: "",
        message: "",
        recipientClerkUserId: "",
        recipientSource:
            "related_customer",
        recipientEmail: "",
        replyTo: "",
        delayEnabled:
            Boolean(
                action?.delay,
            ),
        delayAmount:
            action?.delay
                ?.amount
                .toString() ??
            "",
        delayUnit:
            action?.delay
                ?.unit ??
            "days",
        baseField:
            action?.delay
                ?.baseField ??
            "",
    };

    if (!action) {
        return base;
    }

    switch (action.type) {
        case "assign_owner":
            base.clerkUserId =
                action.clerkUserId;
            break;

        case "update_field":
            base.field =
                action.field;
            base.value =
                String(
                    action.value ??
                    "",
                );
            break;

        case "change_status":
            base.status =
                action.status;
            break;

        case "create_activity":
            base.activityType =
                action.activityType;
            base.subject =
                action.subject;
            base.description =
                action.description ??
                "";
            base.priority =
                action.priority ??
                "Normal";
            base.dueInMinutes =
                action.dueInMinutes
                    ?.toString() ??
                "";
            base.ownerClerkUserId =
                action.ownerClerkUserId ??
                "";
            break;

        case "create_notification":
            base.title =
                action.title;
            base.message =
                action.message;
            base.recipientClerkUserId =
                action.recipientClerkUserId ??
                "";
            break;

        case "send_email":
            base.recipientSource =
                action.recipientSource;
            base.recipientEmail =
                action.recipientEmail ??
                "";
            base.subject =
                action.subject;
            base.message =
                action.message;
            base.replyTo =
                action.replyTo ??
                "";
            break;
    }

    return base;
}

function getDelay(
    action:
        DraftAction,
) {
    if (!action.delayEnabled) {
        return {};
    }

    return {
        delay: {
            amount:
                Number(
                    action.delayAmount,
                ),

            unit:
                action.delayUnit,

            ...(action.baseField
                .trim()
                ? {
                    baseField:
                        action.baseField
                            .trim(),
                }
                : {}),
        },
    };
}

function serializeAction(
    action:
        DraftAction,
): AutomationAction {
    const delay =
        getDelay(action);

    switch (action.type) {
        case "assign_owner":
            return {
                type:
                    "assign_owner",

                clerkUserId:
                    action.clerkUserId,

                ...delay,
            };

        case "update_field":
            return {
                type:
                    "update_field",

                field:
                    action.field
                        .trim(),

                value:
                    action.value,

                ...delay,
            };

        case "change_status":
            return {
                type:
                    "change_status",

                status:
                    action.status
                        .trim(),

                ...delay,
            };

        case "create_activity":
            return {
                type:
                    "create_activity",

                activityType:
                    action.activityType,

                subject:
                    action.subject
                        .trim(),

                ...(action.description
                    .trim()
                    ? {
                        description:
                            action.description
                                .trim(),
                    }
                    : {}),

                ...(action.priority
                    .trim()
                    ? {
                        priority:
                            action.priority
                                .trim(),
                    }
                    : {}),

                ...(action.dueInMinutes
                    ? {
                        dueInMinutes:
                            Number(
                                action.dueInMinutes,
                            ),
                    }
                    : {}),

                ...(action.ownerClerkUserId
                    ? {
                        ownerClerkUserId:
                            action.ownerClerkUserId,
                    }
                    : {}),

                ...delay,
            };

        case "create_notification":
            return {
                type:
                    "create_notification",

                title:
                    action.title
                        .trim(),

                message:
                    action.message
                        .trim(),

                ...(action.recipientClerkUserId
                    ? {
                        recipientClerkUserId:
                            action.recipientClerkUserId,
                    }
                    : {}),

                ...delay,
            };

        case "send_email":
            return {
                type:
                    "send_email",

                recipientSource:
                    action.recipientSource,

                ...(action.recipientEmail
                    .trim()
                    ? {
                        recipientEmail:
                            action.recipientEmail
                                .trim(),
                    }
                    : {}),

                subject:
                    action.subject
                        .trim(),

                message:
                    action.message
                        .trim(),

                ...(action.replyTo
                    .trim()
                    ? {
                        replyTo:
                            action.replyTo
                                .trim(),
                    }
                    : {}),

                ...delay,
            };
    }
}

function needsConditionValue(
    operator:
        ConditionOperator,
) {
    return ![
        "is_empty",
        "is_not_empty",
        "changed",
    ].includes(operator);
}

const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function AutomationRuleEditor({
    rule,
    branches,
    members,
    isSaving,
    onCancel,
    onSave,
}: EditorProps) {
    const {
        getModule,
    } = useCRMConfig();

    const [
        name,
        setName,
    ] = useState(
        rule?.name ?? "",
    );

    const [
        description,
        setDescription,
    ] = useState(
        rule?.description ?? "",
    );

    const [
        branchId,
        setBranchId,
    ] = useState(
        rule?.branchId ?? "",
    );

    const [
        entityType,
        setEntityType,
    ] = useState<
        AutomationEntity
    >(
        rule?.entityType ??
        "lead",
    );

    const [
        triggerType,
        setTriggerType,
    ] = useState<
        AutomationTrigger
    >(
        rule?.triggerType ??
        "record_created",
    );

    const [
        conditionMode,
        setConditionMode,
    ] = useState<
        "all" | "any"
    >(
        rule?.conditions
            .mode ??
        "all",
    );

    const [
        conditions,
        setConditions,
    ] = useState<
        AutomationCondition[]
    >(
        rule?.conditions
            .items ??
        [],
    );

    const [
        actions,
        setActions,
    ] = useState<
        DraftAction[]
    >(
        rule?.actions
            .map(
                createDraftAction,
            ) ??
        [
            createDraftAction(),
        ],
    );

    const [
        enabled,
        setEnabled,
    ] = useState(
        rule?.enabled ??
        false,
    );

    const [
        stopOnError,
        setStopOnError,
    ] = useState(
        rule?.stopOnError ??
        true,
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(null);

    const moduleId =
        entityType === "lead"
            ? "leads"
            : entityType ===
                  "customer"
              ? "contacts"
              : entityType ===
                    "deal"
                ? "deals"
                : entityType ===
                      "activity"
                  ? "activities"
                  : null;

    const entityModule =
        moduleId
            ? getModule(
                moduleId,
            )
            : null;

    const salesOrderFields:
        CRMFieldConfig[] = [
        {
            key: "status",
            label: "Estado",
            type: "select",
            options: [
                {
                    label:
                        "Borrador",
                    value:
                        "Borrador",
                },
                {
                    label:
                        "Confirmada",
                    value:
                        "Confirmada",
                },
                {
                    label:
                        "Entregada",
                    value:
                        "Entregada",
                },
                {
                    label:
                        "Cancelada",
                    value:
                        "Cancelada",
                },
            ],
        },
        {
            key:
                "customerName",
            label:
                "Nombre del cliente",
            type: "text",
        },
        {
            key:
                "customerEmail",
            label:
                "Correo del cliente",
            type: "email",
        },
        {
            key:
                "totalAmount",
            label:
                "Total",
            type: "number",
        },
        {
            key:
                "paymentMethod",
            label:
                "Método de pago",
            type: "text",
        },
        {
            key:
                "confirmedAt",
            label:
                "Fecha de confirmación",
            type: "datetime",
        },
        {
            key:
                "deliveredAt",
            label:
                "Fecha de entrega",
            type: "datetime",
        },
        {
            key:
                "createdAt",
            label:
                "Fecha de creación",
            type: "datetime",
        },
    ];

    const usefulFieldKeys:
        Record<
            AutomationEntity,
            string[]
        > = {
                lead: [
            "firstName",
            "lastName",
            "email",
            "phone",
            "mobile",
            "company",
            "status",
            "source",
            "commercialConsent",
            "ownerClerkUserId",
            "createdAt",
            "updatedAt",
        ],

        customer: [
            "customerType",
            "name",
            "lastName",
            "companyName",
            "email",
            "phone",
            "mobile",
            "status",
            "commercialConsent",
            "ownerClerkUserId",
            "createdAt",
            "updatedAt",
        ],

        deal: [
            "status",
            "stage",
            "acquisitionChannel",
            "paymentMethod",
            "ownerClerkUserId",
            "expectedCloseAt",
            "closedAt",
            "createdAt",
            "updatedAt",
        ],

        activity: [
            "type",
            "status",
            "priority",
            "ownerClerkUserId",
            "startAt",
            "endAt",
            "dueAt",
            "completedAt",
            "createdAt",
            "updatedAt",
        ],

        sales_order: [
            "status",
            "customerName",
            "customerEmail",
            "totalAmount",
            "paymentMethod",
            "confirmedAt",
            "deliveredAt",
            "createdAt",
        ],
    };

    const sourceFields =
        entityType ===
            "sales_order"
            ? salesOrderFields
            : entityModule
                ?.fields ??
              [];

    const seenFieldKeys =
        new Set<string>();

    const availableFields =
        sourceFields.filter(
            (field) => {
                if (
                    field.hidden ||
                    !usefulFieldKeys[
                        entityType
                    ].includes(
                        field.key,
                    ) ||
                    seenFieldKeys.has(
                        field.key,
                    )
                ) {
                    return false;
                }

                seenFieldKeys.add(
                    field.key,
                );

                return true;
            },
        );

    const selectableActionOptions =
        entityType ===
            "sales_order"
            ? actionOptions.filter(
                (option) =>
                    option.value ===
                        "create_activity" ||
                    option.value ===
                        "create_notification" ||
                    option.value ===
                        "send_email",
            )
            : actionOptions;

    const dateFields =
        availableFields.filter(
            (field) =>
                field.type ===
                    "date" ||
                field.type ===
                    "datetime",
        );

    function getFieldOptions(
        fieldKey: string,
    ) {
        const field =
            availableFields.find(
                (
                    candidate,
                ) =>
                    candidate.key ===
                    fieldKey,
            );

        if (
            field?.options &&
            field.options.length >
                0
        ) {
            return field.options;
        }

        if (
            fieldKey ===
            "status" &&
            entityType ===
            "activity"
        ) {
            return [
                {
                    label:
                        "No iniciada",
                    value:
                        "No iniciada",
                },
                {
                    label:
                        "En progreso",
                    value:
                        "En progreso",
                },
                {
                    label:
                        "Completada",
                    value:
                        "Completada",
                },
                {
                    label:
                        "Cancelada",
                    value:
                        "Cancelada",
                },
            ];
        }

        return [];
    }

    useEffect(() => {
        if (
            triggerType !==
            "status_changed"
        ) {
            return;
        }

        const statusOptions =
            getFieldOptions(
                "status",
            );

        setConditions(
            (
                current,
            ) => {
                const statusCondition =
                    current.find(
                        (
                            condition,
                        ) =>
                            condition.field ===
                            "status",
                    );

                if (
                    statusCondition
                ) {
                    return current;
                }

                return [
                    {
                        field:
                            "status",

                        operator:
                            "equals",

                        value:
                            statusOptions[0]
                                ?.value ??
                            "",
                    },
                ];
            },
        );
    }, [
        entityType,
        triggerType,
    ]);

    const title =
        useMemo(
            () =>
                rule
                    ? "Editar automatización"
                    : "Nueva automatización",
            [rule],
        );

    function updateAction(
        actionId: string,
        values:
            Partial<
                DraftAction
            >,
    ) {
        setActions(
            (
                current,
            ) =>
                current.map(
                    (
                        action,
                    ) =>
                        action.id ===
                            actionId
                            ? {
                                ...action,
                                ...values,
                            }
                            : action,
                ),
        );
    }

    async function submit() {
        setError(null);

        if (!name.trim()) {
            setError(
                "Escribe un nombre para la automatización.",
            );
            return;
        }

        if (
            actions.length ===
            0
        ) {
            setError(
                "Agrega al menos una acción.",
            );
            return;
        }

        if (
            actions.some(
                (action) =>
                    action.delayEnabled &&
                    (
                        !action.delayAmount ||
                        Number(
                            action.delayAmount,
                        ) < 1
                    ),
            )
        ) {
            setError(
                "Todos los retrasos deben ser mayores que cero.",
            );
            return;
        }

        try {
            await onSave({
                name:
                    name.trim(),

                description:
                    description
                        .trim() ||
                    null,

                branchId:
                    branchId ||
                    null,

                entityType,
                triggerType,

                conditions: {
                    mode:
                        conditionMode,

                    items:
                        conditions,
                },

                actions:
                    actions.map(
                        serializeAction,
                    ),

                enabled,
                stopOnError,
            });
        } catch (
        saveError
        ) {
            setError(
                saveError instanceof
                    Error
                    ? saveError.message
                    : "No fue posible guardar la automatización.",
            );
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="mx-auto max-w-5xl rounded-[28px] bg-slate-50 shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                            Datara CRM
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            {title}
                        </h2>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={
                            onCancel
                        }
                    >
                        Cerrar
                    </Button>
                </div>

                <div className="space-y-6 p-6 sm:p-8">
                    {error ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    ) : null}

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-black text-slate-950">
                            Información general
                        </h3>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <label className="text-sm font-bold text-slate-700">
                                Nombre
                                <Input
                                    value={
                                        name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setName(
                                            event.target
                                                .value,
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </label>

                            <label className="text-sm font-bold text-slate-700">
                                Sucursal
                                <select
                                    value={
                                        branchId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setBranchId(
                                            event.target
                                                .value,
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                >
                                    <option value="">
                                        Todas las sucursales
                                    </option>

                                    {branches.map(
                                        (
                                            branch,
                                        ) => (
                                            <option
                                                key={
                                                    branch.id
                                                }
                                                value={
                                                    branch.id
                                                }
                                            >
                                                {
                                                    branch.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        </div>

                        <label className="mt-5 block text-sm font-bold text-slate-700">
                            Descripción
                            <textarea
                                value={
                                    description
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setDescription(
                                        event.target
                                            .value,
                                    )
                                }
                                rows={3}
                                className={
                                    inputClass
                                }
                            />
                        </label>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <label className="text-sm font-bold text-slate-700">
                                Entidad
                                <select
                                    value={
                                        entityType
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setEntityType(
                                            event.target
                                                .value as
                                                AutomationEntity,
                                        );

                                        setConditions(
                                            [],
                                        );

                                        setActions([
                                            createDraftAction(),
                                        ]);
                                    }}
                                    className={
                                        inputClass
                                    }
                                >
                                    {entityOptions.map(
                                        (
                                            option,
                                        ) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="text-sm font-bold text-slate-700">
                                Disparador
                                <select
                                    value={
                                        triggerType
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setTriggerType(
                                            event.target
                                                .value as
                                                AutomationTrigger,
                                        );

                                        setConditions(
                                            [],
                                        );
                                    }}
                                    className={
                                        inputClass
                                    }
                                >
                                    {triggerOptions.map(
                                        (
                                            option,
                                        ) => (
                                            <option
                                                key={
                                                    option.value
                                                }
                                                value={
                                                    option.value
                                                }
                                            >
                                                {
                                                    option.label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-950">
                                    Condiciones
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Deja la lista vacía para ejecutar siempre.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setConditions(
                                        (
                                            current,
                                        ) => [
                                                ...current,
                                            {
                                                field:
                                                    availableFields[0]
                                                        ?.key ??
                                                    "status",

                                                operator:
                                                    "equals",

                                                value:
                                                    availableFields[0]
                                                        ?.options?.[0]
                                                        ?.value ??
                                                    "",
                                            },
                                            ],
                                    )
                                }
                                className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                            >
                                Agregar condición
                            </button>
                        </div>

                        {conditions.length >
                            1 ? (
                            <label className="mt-5 block max-w-xs text-sm font-bold text-slate-700">
                                Coincidencia
                                <select
                                    value={
                                        conditionMode
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setConditionMode(
                                            event.target
                                                .value as
                                            "all" | "any",
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                >
                                    <option value="all">
                                        Todas las condiciones
                                    </option>
                                    <option value="any">
                                        Cualquier condición
                                    </option>
                                </select>
                            </label>
                        ) : null}

                        <div className="mt-5 space-y-3">
                            {conditions.map(
                                (
                                    condition,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            index
                                        }
                                        className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                                    >
                                        <select
                                            value={
                                                condition.field
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                const nextField =
                                                    event.target
                                                        .value;

                                                const nextOptions =
                                                    getFieldOptions(
                                                        nextField,
                                                    );

                                                setConditions(
                                                    (
                                                        current,
                                                    ) =>
                                                        current.map(
                                                            (
                                                                item,
                                                                itemIndex,
                                                            ) =>
                                                                itemIndex ===
                                                                    index
                                                                    ? {
                                                                        ...item,

                                                                        field:
                                                                            nextField,

                                                                        value:
                                                                            nextOptions[0]
                                                                                ?.value ??
                                                                            "",
                                                                    }
                                                                    : item,
                                                        ),
                                                );
                                            }}
                                            className={
                                                inputClass
                                            }
                                        >
                                            {availableFields.map(
                                                (
                                                    field,
                                                ) => (
                                                    <option
                                                        key={
                                                            field.key
                                                        }
                                                        value={
                                                            field.key
                                                        }
                                                    >
                                                        {
                                                            field.label
                                                        }
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        <select
                                            value={
                                                condition.operator
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setConditions(
                                                    (
                                                        current,
                                                    ) =>
                                                        current.map(
                                                            (
                                                                item,
                                                                itemIndex,
                                                            ) =>
                                                                itemIndex ===
                                                                    index
                                                                    ? {
                                                                        ...item,

                                                                        operator:
                                                                            event.target.value as ConditionOperator,
                                                                    }
                                                                    : item,
                                                        ),
                                                )
                                            }
                                            className={
                                                inputClass
                                            }
                                        >
                                            {operatorOptions.map(
                                                (
                                                    option,
                                                ) => (
                                                    <option
                                                        key={
                                                            option.value
                                                        }
                                                        value={
                                                            option.value
                                                        }
                                                    >
                                                        {
                                                            option.label
                                                        }
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {needsConditionValue(
                                            condition.operator,
                                        ) ? (
                                            getFieldOptions(
                                                condition.field,
                                            ).length >
                                            0 ? (
                                                <select
                                                    value={
                                                        String(
                                                            condition.value ??
                                                            "",
                                                        )
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setConditions(
                                                            (
                                                                current,
                                                            ) =>
                                                                current.map(
                                                                    (
                                                                        item,
                                                                        itemIndex,
                                                                    ) =>
                                                                        itemIndex ===
                                                                            index
                                                                            ? {
                                                                                ...item,

                                                                                value:
                                                                                    event.target.value,
                                                                            }
                                                                            : item,
                                                                ),
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                >
                                                    {getFieldOptions(
                                                        condition.field,
                                                    ).map(
                                                        (
                                                            option,
                                                        ) => (
                                                            <option
                                                                key={
                                                                    String(
                                                                        option.value,
                                                                    )
                                                                }
                                                                value={
                                                                    String(
                                                                        option.value,
                                                                    )
                                                                }
                                                            >
                                                                {
                                                                    option.label
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            ) : (
                                                <Input
                                                    value={
                                                        String(
                                                            condition.value ??
                                                            "",
                                                        )
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setConditions(
                                                            (
                                                                current,
                                                            ) =>
                                                                current.map(
                                                                    (
                                                                        item,
                                                                        itemIndex,
                                                                    ) =>
                                                                        itemIndex ===
                                                                            index
                                                                            ? {
                                                                                ...item,

                                                                                value:
                                                                                    event.target.value,
                                                                            }
                                                                            : item,
                                                                ),
                                                        )
                                                    }
                                                    placeholder="Valor"
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            )
                                        ) : (
                                            <div />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConditions(
                                                    (
                                                        current,
                                                    ) =>
                                                        current.filter(
                                                            (
                                                                _item,
                                                                itemIndex,
                                                            ) =>
                                                                itemIndex !==
                                                                index,
                                                        ),
                                                )
                                            }
                                            className="mt-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-950">
                                    Acciones
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Usa variables como {"{{name}}"}, {"{{status}}"} o {"{{ownerName}}"}.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setActions(
                                        (
                                            current,
                                        ) => [
                                                ...current,
                                                createDraftAction(),
                                            ],
                                    )
                                }
                                className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                            >
                                Agregar acción
                            </button>
                        </div>

                        <div className="mt-5 space-y-5">
                            {actions.map(
                                (
                                    action,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            action.id
                                        }
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-sm font-black text-slate-950">
                                                Acción {index + 1}
                                            </p>

                                            <button
                                                type="button"
                                                disabled={
                                                    actions.length ===
                                                    1
                                                }
                                                onClick={() =>
                                                    setActions(
                                                        (
                                                            current,
                                                        ) =>
                                                            current.filter(
                                                                (
                                                                    candidate,
                                                                ) =>
                                                                    candidate.id !==
                                                                    action.id,
                                                            ),
                                                    )
                                                }
                                                className="text-sm font-bold text-red-600 disabled:opacity-40"
                                            >
                                                Quitar
                                            </button>
                                        </div>

                                        <label className="mt-4 block text-sm font-bold text-slate-700">
                                            Tipo de acción
                                            <select
                                                value={
                                                    action.type
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateAction(
                                                        action.id,
                                                        {
                                                            type:
                                                                event.target.value as ActionType,
                                                        },
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            >
                                                {selectableActionOptions.map(
                                                    (
                                                        option,
                                                    ) => (
                                                        <option
                                                            key={
                                                                option.value
                                                            }
                                                            value={
                                                                option.value
                                                            }
                                                        >
                                                            {
                                                                option.label
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>

                                        {action.type ===
                                            "assign_owner" ? (
                                            <label className="mt-4 block text-sm font-bold text-slate-700">
                                                Responsable
                                                <select
                                                    value={
                                                        action.clerkUserId
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateAction(
                                                            action.id,
                                                            {
                                                                clerkUserId:
                                                                    event.target.value,
                                                            },
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                >
                                                    <option value="">
                                                        Seleccionar
                                                    </option>

                                                    {members.map(
                                                        (
                                                            member,
                                                        ) => (
                                                            <option
                                                                key={
                                                                    member.value
                                                                }
                                                                value={
                                                                    member.value
                                                                }
                                                            >
                                                                {
                                                                    member.label
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </label>
                                        ) : null}

                                        {action.type ===
                                            "update_field" ? (
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Campo
                                                    <Input
                                                        value={
                                                            action.field
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    field:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Valor
                                                    <Input
                                                        value={
                                                            action.value
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    value:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        ) : null}

                                        {action.type ===
                                            "change_status" ? (
                                            <label className="mt-4 block text-sm font-bold text-slate-700">
                                                Nuevo estado
                                                <Input
                                                    value={
                                                        action.status
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateAction(
                                                            action.id,
                                                            {
                                                                status:
                                                                    event.target.value,
                                                            },
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </label>
                                        ) : null}

                                        {action.type ===
                                            "create_activity" ? (
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Tipo
                                                    <select
                                                        value={
                                                            action.activityType
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    activityType:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="task">
                                                            Tarea
                                                        </option>
                                                        <option value="call">
                                                            Llamada
                                                        </option>
                                                        <option value="meeting">
                                                            Reunión
                                                        </option>
                                                    </select>
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Responsable
                                                    <select
                                                        value={
                                                            action.ownerClerkUserId
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    ownerClerkUserId:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="">
                                                            Usuario que disparó la regla
                                                        </option>

                                                        {members.map(
                                                            (
                                                                member,
                                                            ) => (
                                                                <option
                                                                    key={
                                                                        member.value
                                                                    }
                                                                    value={
                                                                        member.value
                                                                    }
                                                                >
                                                                    {
                                                                        member.label
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </label>

                                                <label className="text-sm font-bold text-slate-700 md:col-span-2">
                                                    Asunto
                                                    <Input
                                                        value={
                                                            action.subject
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    subject:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>

                                                <label className="text-sm font-bold text-slate-700 md:col-span-2">
                                                    Descripción
                                                    <textarea
                                                        value={
                                                            action.description
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    description:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        rows={3}
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        ) : null}

                                        {action.type ===
                                            "create_notification" ? (
                                            <div className="mt-4 grid gap-4">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Destinatario
                                                    <select
                                                        value={
                                                            action.recipientClerkUserId
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    recipientClerkUserId:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="">
                                                            Usuario que disparó la regla
                                                        </option>

                                                        {members.map(
                                                            (
                                                                member,
                                                            ) => (
                                                                <option
                                                                    key={
                                                                        member.value
                                                                    }
                                                                    value={
                                                                        member.value
                                                                    }
                                                                >
                                                                    {
                                                                        member.label
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Título
                                                    <Input
                                                        value={
                                                            action.title
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    title:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Mensaje
                                                    <textarea
                                                        value={
                                                            action.message
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    message:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        rows={3}
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        ) : null}

                                        {action.type ===
                                            "send_email" ? (
                                            <div className="mt-4 grid gap-4">
                                                <label className="text-sm font-bold text-slate-700">
                                                    Destinatario
                                                    <select
                                                        value={
                                                            action.recipientSource
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    recipientSource:
                                                                        event.target.value as DraftAction["recipientSource"],
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="related_customer">
                                                            Cliente relacionado
                                                        </option>
                                                        <option value="record">
                                                            Correo del registro
                                                        </option>
                                                        <option value="owner">
                                                            Responsable
                                                        </option>
                                                        <option value="fixed">
                                                            Correo fijo
                                                        </option>
                                                    </select>
                                                </label>

                                                {action.recipientSource ===
                                                    "fixed" ? (
                                                    <label className="text-sm font-bold text-slate-700">
                                                        Correo fijo
                                                        <Input
                                                            type="email"
                                                            value={
                                                                action.recipientEmail
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateAction(
                                                                    action.id,
                                                                    {
                                                                        recipientEmail:
                                                                            event.target.value,
                                                                    },
                                                                )
                                                            }
                                                            className={
                                                                inputClass
                                                            }
                                                        />
                                                    </label>
                                                ) : null}

                                                <label className="text-sm font-bold text-slate-700">
                                                    Asunto
                                                    <Input
                                                        value={
                                                            action.subject
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    subject:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Mensaje
                                                    <textarea
                                                        value={
                                                            action.message
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    message:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        rows={5}
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>

                                                <label className="text-sm font-bold text-slate-700">
                                                    Responder a
                                                    <Input
                                                        type="email"
                                                        value={
                                                            action.replyTo
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateAction(
                                                                action.id,
                                                                {
                                                                    replyTo:
                                                                        event.target.value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Usará el correo de la empresa"
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        ) : null}

                                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                                            <Checkbox
                                                label="Ejecutar después"
                                                checked={
                                                    action.delayEnabled
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateAction(
                                                        action.id,
                                                        {
                                                            delayEnabled:
                                                                event.target.checked,
                                                        },
                                                    )
                                                }
                                            />

                                            {action.delayEnabled ? (
                                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                                    <label className="text-sm font-bold text-slate-700">
                                                        Cantidad
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={
                                                                action.delayAmount
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateAction(
                                                                    action.id,
                                                                    {
                                                                        delayAmount:
                                                                            event.target.value,
                                                                    },
                                                                )
                                                            }
                                                            className={
                                                                inputClass
                                                            }
                                                        />
                                                    </label>

                                                    <label className="text-sm font-bold text-slate-700">
                                                        Unidad
                                                        <select
                                                            value={
                                                                action.delayUnit
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateAction(
                                                                    action.id,
                                                                    {
                                                                        delayUnit:
                                                                            event.target.value as DelayUnit,
                                                                    },
                                                                )
                                                            }
                                                            className={
                                                                inputClass
                                                            }
                                                        >
                                                            <option value="minutes">
                                                                Minutos
                                                            </option>
                                                            <option value="hours">
                                                                Horas
                                                            </option>
                                                            <option value="days">
                                                                Días
                                                            </option>
                                                            <option value="months">
                                                                Meses
                                                            </option>
                                                        </select>
                                                    </label>

                                                    <label className="text-sm font-bold text-slate-700">
                                                        Fecha base
                                                        <select
                                                            value={
                                                                action.baseField
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateAction(
                                                                    action.id,
                                                                    {
                                                                        baseField:
                                                                            event.target.value,
                                                                    },
                                                                )
                                                            }
                                                            className={
                                                                inputClass
                                                            }
                                                        >
                                                            <option value="">
                                                                Momento del evento
                                                            </option>

                                                            {dateFields.map(
                                                                (
                                                                    field,
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            field.key
                                                                        }
                                                                        value={
                                                                            field.key
                                                                        }
                                                                    >
                                                                        {
                                                                            field.label
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </label>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Checkbox
                                label="Activar regla"
                                description="Comenzará a procesar eventos al guardarse."
                                checked={
                                    enabled
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setEnabled(
                                        event.target
                                            .checked,
                                    )
                                }
                            />

                            <Checkbox
                                label="Detener si ocurre un error"
                                description="Las acciones posteriores serán omitidas."
                                checked={
                                    stopOnError
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setStopOnError(
                                        event.target
                                            .checked,
                                    )
                                }
                            />
                        </div>
                    </section>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={
                            onCancel
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        disabled={
                            isSaving
                        }
                        onClick={() =>
                            void submit()
                        }
                    >
                        {isSaving
                            ? "Guardando..."
                            : "Guardar automatización"}
                    </Button>
                </div>
            </div>
        </div>
    );
}