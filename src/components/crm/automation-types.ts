export type AutomationEntity =
    | "lead"
    | "customer"
    | "deal"
    | "activity"
    | "sales_order";

export type AutomationTrigger =
    | "record_created"
    | "record_updated"
    | "status_changed";

export type ConditionOperator =
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty"
    | "greater_than"
    | "less_than"
    | "changed";

export type DelayUnit =
    | "minutes"
    | "hours"
    | "days"
    | "months";

export type AutomationDelay = {
    amount: number;
    unit: DelayUnit;
    baseField?: string;
};

export type AutomationCondition = {
    field: string;
    operator:
    ConditionOperator;
    value?: unknown;
};

export type AutomationAction =
    (
        | {
            type:
            "assign_owner";
            clerkUserId:
            string;
        }
        | {
            type:
            "update_field";
            field: string;
            value: unknown;
        }
        | {
            type:
            "change_status";
            status: string;
        }
        | {
            type:
            "create_activity";
            activityType:
            string;
            subject: string;
            description?: string;
            priority?: string;
            dueInMinutes?: number;
            ownerClerkUserId?:
            string;
        }
        | {
            type:
            "create_notification";
            title: string;
            message: string;
            recipientClerkUserId?:
            string;
        }
        | {
            type:
            "send_email";
            recipientSource:
            | "record"
            | "related_customer"
            | "owner"
            | "fixed";
            recipientEmail?: string;
            subject: string;
            message: string;
            replyTo?: string;
        }
    ) & {
        delay?:
        AutomationDelay;
    };

export type AutomationPermissions = {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManage: boolean;
};

export type AutomationRule = {
    id: string;
    name: string;
    description:
    string | null;
    branchId:
    string | null;
    branchName:
    string | null;
    entityType:
    AutomationEntity;
    triggerType:
    AutomationTrigger;

    conditions: {
        mode:
        | "all"
        | "any";

        items:
        AutomationCondition[];
    };

    actions:
    AutomationAction[];

    enabled: boolean;
    stopOnError: boolean;

    lastRunAt:
    string | null;

    createdAt: string;
    updatedAt: string;
};

export type BranchOption = {
    id: string;
    value: string;
    name: string;
    label: string;
    isPrimary: boolean;
};

export type MemberOption = {
    value: string;
    label: string;
    name: string;
    email: string;
};

export type ScheduledJob = {
    id: string;
    actionIndex: number;
    action:
    AutomationAction;

    status:
    | "pending"
    | "processing"
    | "succeeded"
    | "failed"
    | "cancelled";

    scheduledFor: string;
    attempts: number;
    maxAttempts: number;

    errorMessage:
    string | null;

    completedAt:
    string | null;
};

export type AutomationExecution = {
    id: string;
    ruleId: string;
    ruleName: string;

    entityType:
    AutomationEntity;

    entityId: string;

    triggerType:
    AutomationTrigger;

    status:
    | "running"
    | "succeeded"
    | "partially_succeeded"
    | "failed"
    | "skipped";

    actionResults:
    Array<{
        actionIndex: number;
        actionType: string;

        status:
        | "succeeded"
        | "failed"
        | "skipped";

        message?: string;
    }>;

    errorMessage:
    string | null;

    startedAt: string;

    completedAt:
    string | null;

    scheduledJobs:
    ScheduledJob[];
};

export type AutomationRulePayload = {
    name: string;
    description:
    string | null;
    branchId:
    string | null;
    entityType:
    AutomationEntity;
    triggerType:
    AutomationTrigger;

    conditions: {
        mode:
        | "all"
        | "any";

        items:
        AutomationCondition[];
    };

    actions:
    AutomationAction[];

    enabled: boolean;
    stopOnError: boolean;
};