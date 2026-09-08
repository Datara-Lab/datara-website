export type PetStayOveragePolicy =
    | "extra_units"
    | "cash";

export type PetStayBillingPolicy = {
    includedHours: number;
    overagePolicy: PetStayOveragePolicy;
};

export type PetStayBillingResult = {
    startedAt: string;
    checkoutAt: string;
    elapsedMinutes: number;
    billableHours: number;
    packageUnits: number;
    cashChargeMinutes: number;
    cashChargeHours: number;
    toleranceMinutes: number;
    lateCheckout: boolean;
    outsideBusinessHours: boolean;
    explanation: string;
};

const defaultPolicy: PetStayBillingPolicy = {
    includedHours: 5,
    overagePolicy: "extra_units",
};

function positiveNumber(
    value: unknown,
    fallback: number,
) {
    const number =
        Number(value);

    return Number.isFinite(number) &&
        number > 0
        ? number
        : fallback;
}

export function readPetStayBillingPolicy(
    value: unknown,
): PetStayBillingPolicy {
    const policy =
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
            ? (value as Record<
                  string,
                  unknown
              >)
            : {};

    return {
        includedHours:
            positiveNumber(
                policy.includedHours,
                defaultPolicy.includedHours,
            ),

        overagePolicy:
            policy.overagePolicy ===
            "cash"
                ? "cash"
                : "extra_units",
    };
}

function localParts(
    date: Date,
    timezone: string,
) {
    const values =
        Object.fromEntries(
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        timezone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle:
                        "h23",
                },
            )
                .formatToParts(
                    date,
                )
                .filter(
                    (
                        part,
                    ) =>
                        part.type !==
                        "literal",
                )
                .map(
                    (
                        part,
                    ) => [
                        part.type,
                        part.value,
                    ],
                ),
        );

    return {
        dateKey: `${values.year}-${values.month}-${values.day}`,

        minuteOfDay:
            Number(
                values.hour,
            ) *
                60 +
            Number(
                values.minute,
            ),
    };
}

function calendarDaysBetween(
    start: Date,
    end: Date,
    timezone: string,
) {
    const startKey =
        localParts(
            start,
            timezone,
        ).dateKey;

    const endKey =
        localParts(
            end,
            timezone,
        ).dateKey;

    return Math.max(
        0,
        Math.round(
            (
                Date.parse(
                    `${endKey}T00:00:00Z`,
                ) -
                Date.parse(
                    `${startKey}T00:00:00Z`,
                )
            ) /
                86_400_000,
        ),
    );
}

function minutesFromTime(
    value: string,
) {
    const [
        hours,
        minutes,
    ] =
        value
            .split(":")
            .map(Number);

    return (
        hours * 60 +
        minutes
    );
}

export function calculatePetStayBilling(
    input: {
        startedAt: Date;
        checkoutAt: Date;
        serviceType: string;
        unitType: string;
        timezone: string;
        policy: PetStayBillingPolicy;

        /**
         * Tolerancia operacional de la sucursal.
         *
         * Cuando se envía, tiene prioridad absoluta sobre
         * La tolerancia se recibe desde la configuración de la sucursal.
         *
         * Esto permite migrar el checkout de estancias sin
         * romper consumidores legado.
         */
        toleranceMinutes?: number;
    },
): PetStayBillingResult {
    const {
        startedAt,
        checkoutAt,
        serviceType,
        unitType,
        timezone,
        policy,
    } = input;

    const toleranceMinutes =
        Number.isFinite(
            input.toleranceMinutes,
        ) &&
        Number(
            input.toleranceMinutes,
        ) >= 0
            ? Number(
                input.toleranceMinutes,
            )
            : 0;

    const elapsedMinutes =
        Math.max(
            1,
            Math.ceil(
                (
                    checkoutAt.getTime() -
                    startedAt.getTime()
                ) /
                    60_000,
            ),
        );

    const checkoutLocal =
        localParts(
            checkoutAt,
            timezone,
        );

    const outsideBusinessHours = false;

    if (
        serviceType ===
            "boarding" ||
        unitType ===
            "night"
    ) {
        const nights =
            Math.max(
                1,
                calendarDaysBetween(
                    startedAt,
                    checkoutAt,
                    timezone,
                ),
            );

        const lateCheckout = false;

        const packageUnits =
            nights;

        const cashChargeMinutes =
            0;

        return {
            startedAt:
                startedAt.toISOString(),

            checkoutAt:
                checkoutAt.toISOString(),

            elapsedMinutes,

            billableHours:
                Math.max(
                    1,
                    Math.ceil(
                        elapsedMinutes /
                            60,
                    ),
                ),

            packageUnits,

            cashChargeMinutes,

            cashChargeHours:
                cashChargeMinutes
                    ? Math.ceil(
                          cashChargeMinutes /
                              60,
                      )
                    : 0,

            toleranceMinutes,

            lateCheckout,

            outsideBusinessHours,

            explanation:
                lateCheckout
                    ? `${packageUnits} noche(s): incluye una noche adicional por rebasar la hora límite y la tolerancia de la sucursal.`
                    : `${nights} noche(s) transcurrida(s).`,
        };
    }

    const includedMinutes =
        Math.max(
            60,
            Math.round(
                policy.includedHours *
                    60,
            ),
        );

    const chargeableMinutes =
        Math.max(
            0,
            elapsedMinutes -
                toleranceMinutes,
        );

    const requiredBlocks =
        Math.max(
            1,
            Math.ceil(
                chargeableMinutes /
                    includedMinutes,
            ),
        );

    const cashOverage =
        requiredBlocks >
            1 &&
        policy.overagePolicy ===
            "cash";

    const cashChargeMinutes =
        cashOverage
            ? Math.max(
                  0,
                  elapsedMinutes -
                      includedMinutes -
                      toleranceMinutes,
              )
            : 0;

    const packageUnits =
        cashOverage
            ? 1
            : requiredBlocks;

    return {
        startedAt:
            startedAt.toISOString(),

        checkoutAt:
            checkoutAt.toISOString(),

        elapsedMinutes,

        billableHours:
            Math.max(
                1,
                Math.ceil(
                    elapsedMinutes /
                        60,
                ),
            ),

        packageUnits,

        cashChargeMinutes,

        cashChargeHours:
            cashChargeMinutes
                ? Math.ceil(
                      cashChargeMinutes /
                          60,
                  )
                : 0,

        toleranceMinutes,

        lateCheckout: false,

        outsideBusinessHours,

        explanation:
            cashOverage
                ? `1 unidad cubre ${policy.includedHours} h; el excedente se cobra sin descontar otra unidad.`
                : `${packageUnits} unidad(es) de ${policy.includedHours} h cubren la estancia.`,
    };
}