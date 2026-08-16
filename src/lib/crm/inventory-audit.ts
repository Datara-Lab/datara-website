import { db } from "@/db";

import {
    inventoryAuditLogs,
} from "@/db/schema";

export type InventoryAuditEntry = {
    tenantId: string;

    branchId?:
    | string
    | null;

    locationId?:
    | string
    | null;

    productId?:
    | string
    | null;

    entityType: string;
    entityId: string;
    action: string;
    summary: string;

    reason?:
    | string
    | null;

    actorClerkUserId: string;

    actorName?:
    | string
    | null;

    before?:
    | Record<
        string,
        unknown
    >
    | null;

    after?:
    | Record<
        string,
        unknown
    >
    | null;

    metadata?: Record<
        string,
        unknown
    >;
};

export function createInventoryAuditQuery(
    entry:
        InventoryAuditEntry,
) {
    return db
        .insert(
            inventoryAuditLogs,
        )
        .values({
            id:
                crypto.randomUUID(),

            tenantId:
                entry.tenantId,

            branchId:
                entry.branchId ??
                null,

            locationId:
                entry.locationId ??
                null,

            productId:
                entry.productId ??
                null,

            entityType:
                entry.entityType,

            entityId:
                entry.entityId,

            action:
                entry.action,

            summary:
                entry.summary,

            reason:
                entry.reason ??
                null,

            actorClerkUserId:
                entry
                    .actorClerkUserId,

            actorName:
                entry.actorName ??
                null,

            before:
                entry.before ??
                null,

            after:
                entry.after ??
                null,

            metadata:
                entry.metadata ??
                {},

            createdAt:
                new Date(),
        });
}