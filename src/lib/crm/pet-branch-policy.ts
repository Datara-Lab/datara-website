export type PetStayScheduleDay = {
    open: string | null;
    close: string | null;
    closed: boolean;
};

export type PetStayScheduleException = {
    date: string;
    open: string | null;
    close: string | null;
    closed: boolean;
    reason?: string;
};

export type PetBranchPolicy = {
    closingTime: string | null;
    weeklySchedule: Record<string, PetStayScheduleDay>;
    scheduleExceptions: PetStayScheduleException[];
    toleranceMinutes: number;
    lowUsagePercent: number;
    boardingIncludesDaycare: boolean;
};

const timePattern =
    /^([01]\d|2[0-3]):[0-5]\d$/;

const defaultSchedule: Record<
    string,
    PetStayScheduleDay
> = {
    monday: {
        open: null,
        close: null,
        closed: false,
    },
    tuesday: {
        open: null,
        close: null,
        closed: false,
    },
    wednesday: {
        open: null,
        close: null,
        closed: false,
    },
    thursday: {
        open: null,
        close: null,
        closed: false,
    },
    friday: {
        open: null,
        close: null,
        closed: false,
    },
    saturday: {
        open: null,
        close: null,
        closed: false,
    },
    sunday: {
        open: null,
        close: null,
        closed: false,
    },
};

function validTime(
    value: unknown,
): string | null {
    return typeof value ===
        "string" &&
        timePattern.test(value)
        ? value
        : null;
}

function readScheduleDay(
    value: unknown,
): PetStayScheduleDay {
    const day =
        value &&
        typeof value ===
            "object" &&
        !Array.isArray(value)
            ? (value as Record<
                  string,
                  unknown
              >)
            : {};

    return {
        open: validTime(
            day.open,
        ),

        close: validTime(
            day.close,
        ),

        closed:
            day.closed === true,
    };
}

export function readPetBranchPolicy(
    metadata: unknown,
): PetBranchPolicy {
    const root =
        metadata &&
        typeof metadata ===
            "object"
            ? (metadata as Record<
                  string,
                  unknown
              >)
            : {};

    const value =
        root.petStayPolicy &&
        typeof root.petStayPolicy ===
            "object"
            ? (root.petStayPolicy as Record<
                  string,
                  unknown
              >)
            : {};

    const percent =
        Number(
            value.lowUsagePercent,
        );

    const tolerance =
        Number(
            value.toleranceMinutes,
        );

    const rawSchedule =
        value.weeklySchedule &&
        typeof value.weeklySchedule ===
            "object" &&
        !Array.isArray(
            value.weeklySchedule,
        )
            ? (value.weeklySchedule as Record<
                  string,
                  unknown
              >)
            : {};

    const weeklySchedule =
        Object.fromEntries(
            Object.keys(
                defaultSchedule,
            ).map(
                (
                    day,
                ) => [
                    day,
                    readScheduleDay(
                        rawSchedule[
                            day
                        ],
                    ),
                ],
            ),
        ) as Record<
            string,
            PetStayScheduleDay
        >;

    const scheduleExceptions =
        Array.isArray(
            value.scheduleExceptions,
        )
            ? value.scheduleExceptions
                  .map(
                      (
                          item,
                      ): PetStayScheduleException | null => {
                          if (
                              !item ||
                              typeof item !==
                                  "object" ||
                              Array.isArray(
                                  item,
                              )
                          ) {
                              return null;
                          }

                          const record =
                              item as Record<
                                  string,
                                  unknown
                              >;

                          if (
                              typeof record.date !==
                                  "string" ||
                              !/^\d{4}-\d{2}-\d{2}$/.test(
                                  record.date,
                              )
                          ) {
                              return null;
                          }

                          return {
                              date: record.date,

                              open: validTime(
                                  record.open,
                              ),

                              close: validTime(
                                  record.close,
                              ),

                              closed:
                                  record.closed ===
                                  true,

                              reason:
                                  typeof record.reason ===
                                  "string"
                                      ? record.reason
                                      : undefined,
                          };
                      },
                  )
                  .filter(
                      (
                          item,
                      ): item is PetStayScheduleException =>
                          item !==
                          null,
                  )
            : [];

    return {
        closingTime:
            validTime(
                value.closingTime,
            ),

        weeklySchedule,

        scheduleExceptions,

        toleranceMinutes:
            Number.isFinite(
                tolerance,
            ) &&
            tolerance >= 0
                ? Math.floor(
                      tolerance,
                  )
                : 15,

        lowUsagePercent:
            Number.isFinite(
                percent,
            ) &&
            percent >= 0 &&
            percent <= 100
                ? percent
                : 50,

        boardingIncludesDaycare:
            value.boardingIncludesDaycare !==
            false,
    };
}

function getLocalParts(
    date: Date,
    timezone: string,
) {
    const parts =
        Object.fromEntries(
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        timezone,

                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",

                    weekday:
                        "long",

                    hour: "2-digit",
                    minute: "2-digit",

                    hourCycle:
                        "h23",
                },
            )
                .formatToParts(
                    date,
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
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,

        weekday:
            parts.weekday.toLowerCase(),

        minute:
            Number(
                parts.hour,
            ) *
                60 +
            Number(
                parts.minute,
            ),
    };
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
        hours *
            60 +
        minutes
    );
}

function getPetStayScheduleForDateKey(
    dateKey: string,
    weekday: string,
    policy: PetBranchPolicy,
): PetStayScheduleDay {
    const exception =
        policy.scheduleExceptions.find(
            (
                item,
            ) =>
                item.date ===
                dateKey,
        );

    if (
        exception
    ) {
        return {
            open:
                exception.open,

            close:
                exception.close,

            closed:
                exception.closed,
        };
    }

    const scheduled =
        policy.weeklySchedule[
            weekday
        ];

    if (
        scheduled &&
        (
            scheduled.open ||
            scheduled.close ||
            scheduled.closed
        )
    ) {
        return scheduled;
    }

    return {
        open: null,

        close:
            policy.closingTime,

        closed: false,
    };
}

export function getPetStayScheduleForDate(
    date: Date,
    timezone: string,
    policy: PetBranchPolicy,
): PetStayScheduleDay {
    const local =
        getLocalParts(
            date,
            timezone,
        );

    return getPetStayScheduleForDateKey(
        local.dateKey,
        local.weekday,
        policy,
    );
}

export function getPetStayRolloverMinute(
    date: Date,
    timezone: string,
    policy: PetBranchPolicy,
): number | null {
    const schedule =
        getPetStayScheduleForDate(
            date,
            timezone,
            policy,
        );

    if (
        schedule.closed ||
        !schedule.close
    ) {
        return null;
    }

    return (
        minutesFromTime(
            schedule.close,
        ) +
        policy.toleranceMinutes
    );
}

export function shouldRollPetStayToBoarding(
    date: Date,
    timezone: string,
    policy: PetBranchPolicy,
): boolean {
    const local =
        getLocalParts(
            date,
            timezone,
        );

    const rolloverMinute =
        getPetStayRolloverMinute(
            date,
            timezone,
            policy,
        );

    if (
        rolloverMinute ===
        null
    ) {
        return false;
    }

    return (
        local.minute >=
        rolloverMinute
    );
}

function dayNumber(
    dateKey: string,
) {
    return (
        Date.parse(
            `${dateKey}T00:00:00Z`,
        ) /
        86_400_000
    );
}

export function classifyPetStay(
    start: Date,
    end: Date,
    timezone: string,
    policy: PetBranchPolicy,
    fallback =
        "daycare",
) {
    const first =
        getLocalParts(
            start,
            timezone,
        );

    const last =
        getLocalParts(
            end,
            timezone,
        );

    const isDirectBoarding =
        fallback ===
        "boarding";

    let nights = 0;

    const firstDayNumber =
        dayNumber(
            first.dateKey,
        );

    const lastDayNumber =
        dayNumber(
            last.dateKey,
        );

    for (
        let currentDay =
            firstDayNumber;
        currentDay <=
        lastDayNumber;
        currentDay += 1
    ) {
        const dateKey =
            new Date(
                currentDay *
                    86_400_000,
            )
                .toISOString()
                .slice(0, 10);

        const weekday =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    timeZone: timezone,
                    weekday: "long",
                },
            )
                .format(
                    new Date(
                        `${dateKey}T12:00:00Z`,
                    ),
                )
                .toLowerCase();

        const schedule =
            getPetStayScheduleForDateKey(
                dateKey,
                weekday,
                policy,
            );

        if (
            schedule.closed ||
            !schedule.close
        ) {
            continue;
        }

        const rolloverMinute =
            minutesFromTime(
                schedule.close,
            ) +
            policy.toleranceMinutes;

        if (
            currentDay <
            lastDayNumber
        ) {
            nights += 1;

            continue;
        }

        if (
            last.minute >=
            rolloverMinute
        ) {
            nights += 1;
        }
    }

    const firstSchedule =
        getPetStayScheduleForDate(
            start,
            timezone,
            policy,
        );

    const initialDaycareHours =
        nights > 0 &&
        !firstSchedule.closed &&
        firstSchedule.close
            ? Math.max(
                  0,

                  Math.ceil(
                      (
                          minutesFromTime(
                              firstSchedule.close,
                          ) -
                          first.minute
                      ) /
                          60,
                  ),
              )
            : 0;

    return {
        serviceType:
            isDirectBoarding ||
            nights > 0
                ? "boarding"
                : "daycare",

        nights:
            isDirectBoarding
                ? Math.max(
                      1,
                      nights,
                  )
                : nights,

        initialDaycareHours:
            isDirectBoarding
                ? 0
                : initialDaycareHours,
    };
}