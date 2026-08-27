import {
    and,
    desc,
    eq,
    inArray,
} from "drizzle-orm";

import { db } from "@/db";

import {
    commercialCatalogItems,
    subscriptions,
} from "@/db/schema";

export type TenantCommercialCapacity = {
    users: number;
    branches: number;
    storageGb: number;
    emailsPerMonth: number;
    aiMessages: number;
};

const EMPTY_CAPACITY:
    TenantCommercialCapacity = {
    users: 0,
    branches: 0,
    storageGb: 0,
    emailsPerMonth: 0,
    aiMessages: 0,
};

export async function getTenantCommercialCapacity(
    tenantId: string,
    product: string,
): Promise<TenantCommercialCapacity> {
    const [subscription] =
        await db
            .select({
                planKey:
                    subscriptions.planKey,

                catalogItemIds:
                    subscriptions
                        .catalogItemIds,

                currentPeriodEnd:
                    subscriptions
                        .currentPeriodEnd,
            })
            .from(
                subscriptions,
            )
            .where(
                and(
                    eq(
                        subscriptions.tenantId,
                        tenantId,
                    ),

                    eq(
                        subscriptions.productKey,
                        product,
                    ),

                    inArray(
                        subscriptions.status,
                        [
                            "trialing",
                            "active",
                        ],
                    ),
                ),
            )
            .orderBy(
                desc(
                    subscriptions.createdAt,
                ),
            )
            .limit(1);

    if (!subscription) {
        return EMPTY_CAPACITY;
    }

    const isTrialSubscription =
        subscription.planKey
            .startsWith(
                "trial-",
            );

    if (
        isTrialSubscription &&
        (
            !subscription.currentPeriodEnd ||
            subscription.currentPeriodEnd
                .getTime() <=
            Date.now()
        )
    ) {
        return EMPTY_CAPACITY;
    }

    const catalogItemIds =
        subscription.catalogItemIds;

    if (
        catalogItemIds.length ===
        0
    ) {
        return EMPTY_CAPACITY;
    }

    const catalogItems =
        await db
            .select({
                includedUsers:
                    commercialCatalogItems
                        .includedUsers,

                includedBranches:
                    commercialCatalogItems
                        .includedBranches,

                includedStorageGb:
                    commercialCatalogItems
                        .includedStorageGb,

                includedEmailsPerMonth:
                    commercialCatalogItems
                        .includedEmailsPerMonth,

                includedAiMessages:
                    commercialCatalogItems
                        .includedAiMessages,
            })
            .from(
                commercialCatalogItems,
            )
            .where(
                inArray(
                    commercialCatalogItems.id,
                    catalogItemIds,
                ),
            );

    return catalogItems.reduce<
        TenantCommercialCapacity
    >(
        (
            total,
            item,
        ) => ({
            users:
                total.users +
                item.includedUsers,

            branches:
                total.branches +
                item.includedBranches,

            storageGb:
                total.storageGb +
                Number(
                    item.includedStorageGb,
                ),

            emailsPerMonth:
                total.emailsPerMonth +
                item.includedEmailsPerMonth,

            aiMessages:
                total.aiMessages +
                item.includedAiMessages,
        }),
        {
            ...EMPTY_CAPACITY,
        },
    );
}