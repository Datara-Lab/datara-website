import type {
    CRMAutomationCondition,
} from "@/db/schema";

type AutomationRecord =
    Record<string, unknown>;

type AutomationConditionGroup = {
    mode: "all" | "any";

    items:
    CRMAutomationCondition[];
};

function getFieldValue(
    record:
        AutomationRecord | null,
    fieldPath: string,
): unknown {
    if (!record) {
        return undefined;
    }

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

function isEmpty(
    value: unknown,
): boolean {
    return (
        value === undefined ||
        value === null ||
        value === "" ||
        (
            Array.isArray(value) &&
            value.length === 0
        )
    );
}

function areEqual(
    left: unknown,
    right: unknown,
): boolean {
    if (
        typeof left ===
        "number" &&
        typeof right ===
        "string" &&
        right.trim() !== ""
    ) {
        return (
            left ===
            Number(right)
        );
    }

    if (
        typeof left ===
        "string" &&
        typeof right ===
        "number" &&
        left.trim() !== ""
    ) {
        return (
            Number(left) ===
            right
        );
    }

    if (
        left instanceof Date
    ) {
        return areEqual(
            left.toISOString(),
            right,
        );
    }

    return (
        JSON.stringify(left) ===
        JSON.stringify(right)
    );
}

function containsValue(
    container: unknown,
    expected: unknown,
): boolean {
    if (
        typeof container ===
        "string"
    ) {
        return container
            .toLocaleLowerCase(
                "es-MX",
            )
            .includes(
                String(
                    expected ?? "",
                ).toLocaleLowerCase(
                    "es-MX",
                ),
            );
    }

    if (
        Array.isArray(container)
    ) {
        return container.some(
            (item) =>
                areEqual(
                    item,
                    expected,
                ),
        );
    }

    return false;
}

function compareNumbers(
    left: unknown,
    right: unknown,
    comparison:
        (
            leftNumber: number,
            rightNumber: number,
        ) => boolean,
): boolean {
    const leftNumber =
        Number(left);

    const rightNumber =
        Number(right);

    if (
        !Number.isFinite(
            leftNumber,
        ) ||
        !Number.isFinite(
            rightNumber,
        )
    ) {
        return false;
    }

    return comparison(
        leftNumber,
        rightNumber,
    );
}

function matchesCondition(
    condition:
        CRMAutomationCondition,
    previousRecord:
        AutomationRecord | null,
    nextRecord:
        AutomationRecord,
): boolean {
    const previousValue =
        getFieldValue(
            previousRecord,
            condition.field,
        );

    const nextValue =
        getFieldValue(
            nextRecord,
            condition.field,
        );

    switch (
    condition.operator
    ) {
        case "equals":
            return areEqual(
                nextValue,
                condition.value,
            );

        case "not_equals":
            return !areEqual(
                nextValue,
                condition.value,
            );

        case "contains":
            return containsValue(
                nextValue,
                condition.value,
            );

        case "not_contains":
            return !containsValue(
                nextValue,
                condition.value,
            );

        case "is_empty":
            return isEmpty(
                nextValue,
            );

        case "is_not_empty":
            return !isEmpty(
                nextValue,
            );

        case "greater_than":
            return compareNumbers(
                nextValue,
                condition.value,
                (
                    leftNumber,
                    rightNumber,
                ) =>
                    leftNumber >
                    rightNumber,
            );

        case "less_than":
            return compareNumbers(
                nextValue,
                condition.value,
                (
                    leftNumber,
                    rightNumber,
                ) =>
                    leftNumber <
                    rightNumber,
            );

        case "changed":
            return (
                previousRecord !==
                null &&
                !areEqual(
                    previousValue,
                    nextValue,
                )
            );

        default:
            return false;
    }
}

export function matchesAutomationConditions(
    conditions:
        AutomationConditionGroup,
    previousRecord:
        AutomationRecord | null,
    nextRecord:
        AutomationRecord,
): boolean {
    if (
        conditions.items.length ===
        0
    ) {
        return true;
    }

    if (
        conditions.mode ===
        "any"
    ) {
        return conditions.items
            .some(
                (condition) =>
                    matchesCondition(
                        condition,
                        previousRecord,
                        nextRecord,
                    ),
            );
    }

    return conditions.items
        .every(
            (condition) =>
                matchesCondition(
                    condition,
                    previousRecord,
                    nextRecord,
                ),
        );
}