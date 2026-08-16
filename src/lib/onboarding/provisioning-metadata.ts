import {
    CRM_MODULE_PACKAGES,
    type CRMModulePackageKey,
} from "@/lib/crm/module-catalog";

export type DataraProvisioningMode =
    | "trial"
    | "subscription";

export type DataraProvisioningMetadata = {
    mode:
    DataraProvisioningMode;

    packageKeys:
    CRMModulePackageKey[];

    trialEndsAt:
    string | null;
};

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function getPackageKeys(
    value: unknown,
): CRMModulePackageKey[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const validPackageKeys =
        new Set(
            Object.keys(
                CRM_MODULE_PACKAGES,
            ) as
            CRMModulePackageKey[],
        );

    return Array.from(
        new Set(
            value.filter(
                (
                    packageKey,
                ): packageKey is
                    CRMModulePackageKey =>
                    typeof packageKey ===
                    "string" &&
                    validPackageKeys.has(
                        packageKey as
                        CRMModulePackageKey,
                    ),
            ),
        ),
    );
}

export function getDataraProvisioningMetadata(
    metadata: unknown,
): DataraProvisioningMetadata | null {
    if (!isRecord(metadata)) {
        return null;
    }

    const provisioning =
        metadata.dataraProvisioning;

    if (!isRecord(provisioning)) {
        return null;
    }

    const mode =
        provisioning.mode;

    if (
        mode !== "trial" &&
        mode !== "subscription"
    ) {
        return null;
    }

    const trialEndsAt =
        typeof provisioning
            .trialEndsAt === "string"
            ? provisioning
                .trialEndsAt
            : null;

    if (
        mode === "trial" &&
        (
            !trialEndsAt ||
            Number.isNaN(
                new Date(
                    trialEndsAt,
                ).getTime(),
            )
        )
    ) {
        return null;
    }

    const packageKeys =
        getPackageKeys(
            provisioning.packageKeys,
        );

    if (
        mode === "subscription" &&
        packageKeys.length === 0
    ) {
        return null;
    }

    return {
        mode,
        packageKeys,
        trialEndsAt:
            mode === "trial"
                ? trialEndsAt
                : null,
    };
}