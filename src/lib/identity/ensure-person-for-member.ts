import {
    and,
    eq,
    isNull,
} from "drizzle-orm";

import { db } from "@/db";
import {
    people,
} from "@/db/schema";

import {
    createEmployeeNumber,
} from "@/lib/identity/create-employee-number";

type EnsurePersonForMemberInput = {
    tenantId: string;
    memberId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
};

function normalizeEmail(
    value: string,
) {
    return value
        .trim()
        .toLowerCase();
}

function createPersonCode(
    memberId: string,
) {
    return `USR-${memberId
        .replaceAll("-", "")
        .slice(0, 10)
        .toUpperCase()}`;
}

export async function ensurePersonForMember({
    tenantId,
    memberId,
    email,
    firstName,
    lastName,
}: EnsurePersonForMemberInput) {
    const normalizedEmail =
        normalizeEmail(email);

    const [existingLinkedPerson] =
        await db
            .select()
            .from(people)
            .where(
                and(
                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                    eq(
                        people.memberId,
                        memberId,
                    ),
                ),
            )
            .limit(1);

    if (existingLinkedPerson) {
        return existingLinkedPerson;
    }

    const standaloneMatches =
        await db
            .select({
                id: people.id,
            })
            .from(people)
            .where(
                and(
                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                    isNull(
                        people.memberId,
                    ),
                    eq(
                        people.email,
                        normalizedEmail,
                    ),
                ),
            )
            .limit(2);

    if (
        standaloneMatches.length === 1
    ) {
        const [linkedPerson] =
            await db
                .update(people)
                .set({
                    memberId,
                    updatedAt:
                        new Date(),
                })
                .where(
                    eq(
                        people.id,
                        standaloneMatches[0].id,
                    ),
                )
                .returning();

        return linkedPerson;
    }

    const employeeNumber =
        await createEmployeeNumber(
            tenantId,
        );

    const [createdPerson] =
        await db
            .insert(people)
            .values({
                tenantId,
                memberId,
                personCode:
                    createPersonCode(
                        memberId,
                    ),
                employeeNumber,
                firstName:
                    firstName ?? "",
                lastName:
                    lastName ?? null,
                email:
                    normalizedEmail,
                personType: "employee",
                status: "active",
            })
            .returning();

    return createdPerson;
}