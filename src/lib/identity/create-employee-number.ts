import {
    and,
    desc,
    eq,
    isNotNull,
} from "drizzle-orm";

import { db } from "@/db";
import {
    people,
} from "@/db/schema";

export async function createEmployeeNumber(
    tenantId: string,
) {
    const [latestEmployee] =
        await db
            .select({
                employeeNumber:
                    people.employeeNumber,
            })
            .from(
                people,
            )
            .where(
                and(
                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                    isNotNull(
                        people.employeeNumber,
                    ),
                ),
            )
            .orderBy(
                desc(
                    people.employeeNumber,
                ),
            )
            .limit(1);

    const currentNumber =
        Number.parseInt(
            latestEmployee?.employeeNumber ??
                "0",
            10,
        );

    const nextNumber =
        Number.isNaN(
            currentNumber,
        )
            ? 1
            : currentNumber + 1;

    return String(
        nextNumber,
    ).padStart(
        4,
        "0",
    );
}