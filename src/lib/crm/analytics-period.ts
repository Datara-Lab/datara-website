export type AnalyticsRollingDays =
  | 30
  | 90
  | 365;

export type AnalyticsPeriodSelection =
  | {
      kind: "rolling";
      days: AnalyticsRollingDays;
    }
  | {
      kind: "month";
      year: number;
      month: number;
    }
  | {
      kind: "quarter";
      year: number;
      quarter: 1 | 2 | 3 | 4;
    };

export type AnalyticsPeriodDates = {
  from: string;
  to: string;
};

const DAY_IN_MILLISECONDS =
  86_400_000;

function formatDate(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(
      0,
      10,
    );
}

function createUTCDate(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  return new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
    ),
  );
}

export function getAnalyticsPeriodDates(
  selection:
    AnalyticsPeriodSelection,
  referenceDate =
    new Date(),
): AnalyticsPeriodDates {
  if (
    selection.kind ===
    "month"
  ) {
    return {
      from:
        formatDate(
          createUTCDate(
            selection.year,
            selection.month - 1,
            1,
          ),
        ),

      to:
        formatDate(
          createUTCDate(
            selection.year,
            selection.month,
            0,
          ),
        ),
    };
  }

  if (
    selection.kind ===
    "quarter"
  ) {
    const firstMonthIndex =
      (
        selection.quarter -
        1
      ) *
      3;

    return {
      from:
        formatDate(
          createUTCDate(
            selection.year,
            firstMonthIndex,
            1,
          ),
        ),

      to:
        formatDate(
          createUTCDate(
            selection.year,
            firstMonthIndex +
              3,
            0,
          ),
        ),
    };
  }

  const to =
    createUTCDate(
      referenceDate
        .getUTCFullYear(),
      referenceDate
        .getUTCMonth(),
      referenceDate
        .getUTCDate(),
    );

  const from =
    new Date(
      to.getTime() -
        (
          (
            selection.days -
            1
          ) *
          DAY_IN_MILLISECONDS
        ),
    );

  return {
    from:
      formatDate(
        from,
      ),

    to:
      formatDate(
        to,
      ),
  };
}

export function getAnalyticsPeriodLabel(
  selection:
    AnalyticsPeriodSelection,
): string {
  if (
    selection.kind ===
    "rolling"
  ) {
    return selection.days ===
      365
      ? "Últimos 12 meses"
      : `Últimos ${selection.days} días`;
  }

  if (
    selection.kind ===
    "month"
  ) {
    return new Intl.DateTimeFormat(
      "es-MX",
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      },
    ).format(
      createUTCDate(
        selection.year,
        selection.month - 1,
        1,
      ),
    );
  }

  return `Q${selection.quarter} ${selection.year}`;
}

export function getPreviousAnalyticsPeriod(
  selection:
    AnalyticsPeriodSelection,
): AnalyticsPeriodSelection {
  if (
    selection.kind ===
    "rolling"
  ) {
    return selection;
  }

  if (
    selection.kind ===
    "month"
  ) {
    const previousMonth =
      createUTCDate(
        selection.year,
        selection.month - 2,
        1,
      );

    return {
      kind: "month",
      year:
        previousMonth
          .getUTCFullYear(),
      month:
        previousMonth
          .getUTCMonth() +
        1,
    };
  }

  if (
    selection.quarter >
    1
  ) {
    return {
      kind: "quarter",
      year:
        selection.year,
      quarter:
        (
          selection.quarter -
          1
        ) as
          | 1
          | 2
          | 3
          | 4,
    };
  }

  return {
    kind: "quarter",
    year:
      selection.year -
      1,
    quarter: 4,
  };
}

export function getPreviousYearAnalyticsPeriod(
  selection:
    AnalyticsPeriodSelection,
): AnalyticsPeriodSelection {
  if (
    selection.kind ===
    "rolling"
  ) {
    return selection;
  }

  return {
    ...selection,
    year:
      selection.year -
      1,
  };
}

export function parseAnalyticsMonth(
  value: string,
): Extract<
  AnalyticsPeriodSelection,
  {
    kind: "month";
  }
> | null {
  const match =
    /^(\d{4})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  if (
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return {
    kind: "month",
    year,
    month,
  };
}

export function getCurrentAnalyticsMonth(
  referenceDate =
    new Date(),
): string {
  return [
    referenceDate
      .getUTCFullYear(),

    String(
      referenceDate
        .getUTCMonth() +
      1,
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

export function getCurrentAnalyticsQuarter(
  referenceDate =
    new Date(),
): {
  year: number;
  quarter: 1 | 2 | 3 | 4;
} {
  return {
    year:
      referenceDate
        .getUTCFullYear(),

    quarter:
      (
        Math.floor(
          referenceDate
            .getUTCMonth() /
          3,
        ) +
        1
      ) as
        | 1
        | 2
        | 3
        | 4,
  };
}

export type AnalyticsComparisonMode =
  | "previous_period"
  | "previous_year";

export type AnalyticsComparisonPeriod = {
  from: string;
  to: string;
  label: string;
};

function parseFormattedDate(
  value: string,
): Date {
  return new Date(
    `${value}T00:00:00.000Z`,
  );
}

function shiftDateYear(
  value: Date,
  years: number,
): Date {
  const targetYear =
    value.getUTCFullYear() +
    years;

  const monthIndex =
    value.getUTCMonth();

  const lastDay =
    createUTCDate(
      targetYear,
      monthIndex + 1,
      0,
    ).getUTCDate();

  return createUTCDate(
    targetYear,
    monthIndex,
    Math.min(
      value.getUTCDate(),
      lastDay,
    ),
  );
}

export function getAnalyticsComparisonPeriod(
  selection:
    AnalyticsPeriodSelection,
  mode:
    AnalyticsComparisonMode,
  referenceDate =
    new Date(),
): AnalyticsComparisonPeriod {
  const current =
    getAnalyticsPeriodDates(
      selection,
      referenceDate,
    );

  const currentFrom =
    parseFormattedDate(
      current.from,
    );

  const currentTo =
    parseFormattedDate(
      current.to,
    );

  if (
    mode ===
    "previous_year"
  ) {
    const comparisonFrom =
      shiftDateYear(
        currentFrom,
        -1,
      );

    const comparisonTo =
      shiftDateYear(
        currentTo,
        -1,
      );

    return {
      from:
        formatDate(
          comparisonFrom,
        ),

      to:
        formatDate(
          comparisonTo,
        ),

      label:
        `Mismo periodo de ${comparisonFrom.getUTCFullYear()}`,
    };
  }

  if (
    selection.kind !==
    "rolling"
  ) {
    const previousSelection =
      getPreviousAnalyticsPeriod(
        selection,
      );

    const previousDates =
      getAnalyticsPeriodDates(
        previousSelection,
        referenceDate,
      );

    return {
      ...previousDates,

      label:
        getAnalyticsPeriodLabel(
          previousSelection,
        ),
    };
  }

  const periodDays =
    Math.round(
      (
        currentTo.getTime() -
        currentFrom.getTime()
      ) /
        DAY_IN_MILLISECONDS,
    ) +
    1;

  const comparisonTo =
    new Date(
      currentFrom.getTime() -
        DAY_IN_MILLISECONDS,
    );

  const comparisonFrom =
    new Date(
      comparisonTo.getTime() -
        (
          (
            periodDays -
            1
          ) *
          DAY_IN_MILLISECONDS
        ),
    );

  return {
    from:
      formatDate(
        comparisonFrom,
      ),

    to:
      formatDate(
        comparisonTo,
      ),

    label:
      selection.kind ===
        "rolling"
        ? selection.days ===
            365
          ? "12 meses anteriores"
          : `${selection.days} días anteriores`
        : getAnalyticsPeriodLabel(
            getPreviousAnalyticsPeriod(
              selection,
            ),
          ),
  };
}
