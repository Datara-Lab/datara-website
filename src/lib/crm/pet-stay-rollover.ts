import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
    petReservations,
    tenantBranches,
} from "@/db/schema";
import {
    readPetBranchPolicy,
    classifyPetStay,
} from "@/lib/crm/pet-branch-policy";

export async function processPetStayRollover() {
    const now = new Date();

    const stays =
        await db
            .select({
                id: petReservations.id,
                tenantId:
                    petReservations.tenantId,
                branchId:
                    petReservations.branchId,
                startsAt:
                    petReservations.startsAt,

                checkedInAt:
                    petReservations.checkedInAt,
                metadata:
                    petReservations.metadata,
                timezone:
                    tenantBranches.timezone,
                branchMetadata:
                    tenantBranches.metadata,
            })
            .from(
                petReservations,
            )
            .leftJoin(
                tenantBranches,
                and(
                    eq(
                        tenantBranches.id,
                        petReservations.branchId,
                    ),
                    eq(
                        tenantBranches.tenantId,
                        petReservations.tenantId,
                    ),
                ),
            )
            .where(
                and(
                    eq(
                        petReservations.status,
                        "checked_in",
                    ),
                    eq(
                        petReservations.serviceType,
                        "daycare",
                    ),
                ),
            );

    let rolledOver = 0;

    for (const stay of stays) {
        if (
            !stay.branchId ||
            !stay.branchMetadata
        ) {
            continue;
        }

        const timezone =
            stay.timezone ??
            "America/Mexico_City";

        const policy =
            readPetBranchPolicy(
                stay.branchMetadata,
            );

        const stayStart =
            stay.checkedInAt ??
            stay.startsAt;

        const classification =
            classifyPetStay(
                stayStart,
                now,
                timezone,
                policy,
                "daycare",
            );

        if (
            classification.serviceType !==
            "boarding"
        ) {
            continue;
        }

        const currentMetadata =
            stay.metadata &&
                typeof stay.metadata ===
                "object" &&
                !Array.isArray(
                    stay.metadata,
                )
                ? stay.metadata
                : {};

        const result =
            await db
                .update(
                    petReservations,
                )
                .set({
                    serviceType:
                        "boarding",

                    metadata: {
                        ...currentMetadata,

                        petStayRollover: {
                            from: "daycare",
                            to: "boarding",
                            reason:
                                "branch_closing_plus_tolerance",
                            rolledOverAt:
                                now.toISOString(),
                        },
                    },

                    updatedAt:
                        now,
                })
                .where(
                    and(
                        eq(
                            petReservations.id,
                            stay.id,
                        ),
                        eq(
                            petReservations.status,
                            "checked_in",
                        ),
                        eq(
                            petReservations.serviceType,
                            "daycare",
                        ),
                    ),
                )
                .returning({
                    id: petReservations.id,
                });

        if (
            result.length > 0
        ) {
            rolledOver += 1;
        }
    }

    return {
        scanned:
            stays.length,
        rolledOver,
    };
}