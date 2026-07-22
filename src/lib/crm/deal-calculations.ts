export type DealPromotionInput = {
  id: string;
  name: string;

  promotionGroup?: string | null;
  benefitType?: string | null;
  paymentMethod?: string | null;

  requiresSelection?: boolean;

  value?: number | null;

  availableMonths?: string[];

  minimumDownPayment?:
    | number
    | null;

  commercialMessage?:
    | string
    | null;
};

export type DealItemCalculationInput = {
  id: string;
  productId?: string | null;

  name: string;

  quantity: number;
  unitPrice: number;

  paymentMethod?: string | null;
  customerDownPayment?: number;
  financingMonths?: number | null;

  promotions:
    DealPromotionInput[];
};

export type AppliedPromotionResult = {
  id: string;
  name: string;

  promotionGroup:
    | string
    | null;

  benefitType:
    | string
    | null;

  paymentMethod:
    | string
    | null;

  requiresSelection: boolean;

  value: number | null;

  calculatedBenefit: number;

  commercialMessage:
    | string
    | null;
};

export type DealItemCalculationResult = {
  id: string;
  productId: string | null;
  name: string;

  quantity: number;
  unitPrice: number;

  baseAmount: number;
  discountAmount: number;
  totalAmount: number;

    paymentMethod:
    | string
    | null;

  minimumDownPayment: number;
  customerDownPayment: number;
  financedAmount: number;

  financingMonths:
    | number
    | null;

  estimatedPayment: number;

  promotions:
    AppliedPromotionResult[];
};

export type DealCalculationResult = {
  items:
    DealItemCalculationResult[];

  generalPromotions:
    AppliedPromotionResult[];

  baseAmount: number;
  discountAmount: number;
  totalAmount: number;

  paymentMethod:
    | string
    | null;

  minimumDownPayment: number;
  customerDownPayment: number;
  financedAmount: number;

  financingMonths:
    | number
    | null;

  estimatedPayment: number;

  errors: string[];
};

type CalculateDealInput = {
  items:
    DealItemCalculationInput[];

  generalPromotions?:
    DealPromotionInput[];

  customerDownPayment?: number;
};

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toFiniteNumber(
  value: unknown,
  fallback = 0,
): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : fallback;
}

function roundMoney(
  value: number,
): number {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100,
    ) / 100
  );
}

function getPromotionGroup(
  promotion:
    DealPromotionInput,
): string | null {
  const normalized =
    normalizeText(
      promotion.promotionGroup,
    );

  return normalized || null;
}

function getFinancingMonths(
  promotion:
    DealPromotionInput,
): number | null {
  const benefitType =
    normalizeText(
      promotion.benefitType,
    );

  if (
    !benefitType.includes(
      "meses sin intereses",
    )
  ) {
    return null;
  }

  const monthsFromOptions =
    (
      promotion.availableMonths ??
      []
    )
      .map((month) => {
        const match =
          month.match(/\d+/);

        return match
          ? Number(match[0])
          : Number.NaN;
      })
      .filter((month) =>
        Number.isFinite(month),
      );

  const value =
    toFiniteNumber(
      promotion.value,
      0,
    );

  if (value > 0) {
    monthsFromOptions.push(
      Math.trunc(value),
    );
  }

  if (
    monthsFromOptions.length === 0
  ) {
    return null;
  }

  return Math.max(
    ...monthsFromOptions,
  );
}

function calculatePromotionBenefit(
  baseAmount: number,
  promotion:
    DealPromotionInput,
): number {
  const benefitType =
    normalizeText(
      promotion.benefitType,
    );

  const value = Math.max(
    toFiniteNumber(
      promotion.value,
      0,
    ),
    0,
  );

  if (
    benefitType ===
      "descuento (%)" ||
    benefitType ===
      "descuento(%)" ||
    benefitType.includes(
      "descuento porcent",
    )
  ) {
    return roundMoney(
      baseAmount *
        Math.min(value, 100) /
        100,
    );
  }

  if (
    benefitType ===
      "descuento ($)" ||
    benefitType ===
      "descuento($)" ||
    benefitType.includes(
      "descuento fijo",
    ) ||
    benefitType === "bono"
  ) {
    return roundMoney(
      Math.min(
        value,
        baseAmount,
      ),
    );
  }

  return 0;
}

function calculateMinimumDownPayment(
  amount: number,
  promotion:
    DealPromotionInput,
): number {
  const minimum =
    toFiniteNumber(
      promotion
        .minimumDownPayment,
      0,
    );

  if (minimum <= 0) {
    return 0;
  }

  /*
   * Un valor de 1 a 100 se
   * interpreta como porcentaje.
   * Un valor mayor a 100 se
   * interpreta como importe fijo.
   */
  if (minimum <= 100) {
    return roundMoney(
      amount * minimum / 100,
    );
  }

  return roundMoney(
    Math.min(
      minimum,
      amount,
    ),
  );
}

export function validatePromotionSelection(
  promotions:
    DealPromotionInput[],
): string[] {
  const errors: string[] = [];

  const promotionsByGroup =
    new Map<
      string,
      DealPromotionInput[]
    >();

  for (
    const promotion of promotions
  ) {
    const group =
      getPromotionGroup(
        promotion,
      );

    if (!group) {
      continue;
    }

    const groupPromotions =
      promotionsByGroup.get(
        group,
      ) ?? [];

    groupPromotions.push(
      promotion,
    );

    promotionsByGroup.set(
      group,
      groupPromotions,
    );
  }

  for (
    const groupPromotions of
    promotionsByGroup.values()
  ) {
    if (
      groupPromotions.length >
        1 &&
      groupPromotions.some(
        (promotion) =>
          promotion
            .requiresSelection ===
          true,
      )
    ) {
      const groupName =
        groupPromotions.find(
          (promotion) =>
            promotion
              .promotionGroup,
        )?.promotionGroup ??
        "Sin grupo";

      errors.push(
        `Solo puedes elegir una promoción del grupo "${groupName}".`,
      );
    }
  }

  const paymentMethods =
    Array.from(
      new Set(
        promotions
          .map((promotion) =>
            normalizeText(
              promotion
                .paymentMethod,
            ),
          )
          .filter(
            (paymentMethod) =>
              paymentMethod &&
              paymentMethod !==
                "todos" &&
              paymentMethod !==
                "todas" &&
              paymentMethod !==
                "ambos" &&
              paymentMethod !==
                "ambas" &&
              paymentMethod !==
                "cualquiera" &&
              paymentMethod !==
                "por definir",
          ),
      ),
    );

  if (
    paymentMethods.length > 1
  ) {
    errors.push(
      "Las promociones seleccionadas requieren formas de pago incompatibles.",
    );
  }

  return errors;
}

function calculatePromotionResults(
  baseAmount: number,
  promotions:
    DealPromotionInput[],
): AppliedPromotionResult[] {
  let remainingAmount =
    baseAmount;

  return promotions.map(
    (promotion) => {
      const calculatedBenefit =
        calculatePromotionBenefit(
          remainingAmount,
          promotion,
        );

      remainingAmount =
        Math.max(
          roundMoney(
            remainingAmount -
              calculatedBenefit,
          ),
          0,
        );

      return {
        id: promotion.id,
        name: promotion.name,

        promotionGroup:
          promotion
            .promotionGroup ??
          null,

        benefitType:
          promotion.benefitType ??
          null,

        paymentMethod:
          promotion.paymentMethod ??
          null,

        requiresSelection:
          promotion
            .requiresSelection ===
          true,

        value:
          promotion.value ??
          null,

        calculatedBenefit,

        commercialMessage:
          promotion
            .commercialMessage ??
          null,
      };
    },
  );
}

function getPaymentMethod(
  promotions:
    DealPromotionInput[],
): string | null {
  const financingPromotion =
    promotions.find(
      (promotion) =>
        getFinancingMonths(
          promotion,
        ) !== null,
    );

  if (financingPromotion) {
    return "Financiamiento";
  }

  return (
    promotions.find(
      (promotion) =>
        promotion.paymentMethod,
    )?.paymentMethod ??
    null
  );
}

export function calculateDeal(
  input: CalculateDealInput,
): DealCalculationResult {
  const errors: string[] = [];

  const itemResults =
    input.items.map((item) => {
      errors.push(
        ...validatePromotionSelection(
          item.promotions,
        ).map(
          (error) =>
            `${item.name}: ${error}`,
        ),
      );

      const quantity = Math.max(
        toFiniteNumber(
          item.quantity,
          1,
        ),
        0,
      );

      const unitPrice = Math.max(
        toFiniteNumber(
          item.unitPrice,
          0,
        ),
        0,
      );

      const baseAmount =
        roundMoney(
          quantity * unitPrice,
        );

      const promotionResults =
        calculatePromotionResults(
          baseAmount,
          item.promotions,
        );

      const discountAmount =
        roundMoney(
          promotionResults.reduce(
            (
              total,
              promotion,
            ) =>
              total +
              promotion
                .calculatedBenefit,
            0,
          ),
        );

      const totalAmount =
        Math.max(
          roundMoney(
            baseAmount -
              discountAmount,
          ),
          0,
        );

      const availableFinancingMonths =
        Array.from(
          new Set(
            item.promotions
              .flatMap(
                (promotion) =>
                  promotion
                    .availableMonths ??
                  [],
              )
              .map(Number)
              .filter(
                (months) =>
                  Number.isInteger(
                    months,
                  ) &&
                  months > 0,
              ),
          ),
        ).sort(
          (a, b) => a - b,
        );

      const requestedFinancingMonths =
        item.financingMonths;

      const financingMonths =
        typeof requestedFinancingMonths ===
          "number" &&
        availableFinancingMonths.includes(
          requestedFinancingMonths,
        )
          ? requestedFinancingMonths
          : availableFinancingMonths
                .length === 1
            ? availableFinancingMonths[0]
            : null;

            if (
              availableFinancingMonths.length >
                1 &&
              financingMonths === null
            ) {
              errors.push(
                `${item.name}: selecciona un plazo de financiamiento.`,
              );
            }

      const minimumDownPayment =
        roundMoney(
          item.promotions.reduce(
            (
              highestMinimum,
              promotion,
            ) =>
              Math.max(
                highestMinimum,
                calculateMinimumDownPayment(
                  totalAmount,
                  promotion,
                ),
              ),
            0,
          ),
        );

      const promotionPaymentMethod =
        getPaymentMethod(
          item.promotions,
        );

      const paymentMethod =
        promotionPaymentMethod &&
        promotionPaymentMethod !== "Ambos"
          ? promotionPaymentMethod
          : item.paymentMethod ??
            promotionPaymentMethod ??
            "Por definir";

      const customerDownPayment =
        financingMonths
          ? Math.min(
              Math.max(
                roundMoney(
                  toFiniteNumber(
                    item
                      .customerDownPayment,
                    0,
                  ),
                ),
                0,
              ),
              totalAmount,
            )
          : 0;

      const financedAmount =
        financingMonths
          ? Math.max(
              roundMoney(
                totalAmount -
                  customerDownPayment,
              ),
              0,
            )
          : 0;

      const estimatedPayment =
        financingMonths &&
        financingMonths > 0
          ? roundMoney(
              financedAmount /
                financingMonths,
            )
          : 0;

      return {
        id: item.id,

        productId:
          item.productId ??
          null,

        name: item.name,

        quantity,
        unitPrice,

        baseAmount,
        discountAmount,
        totalAmount,

        paymentMethod,

        minimumDownPayment,
        customerDownPayment,
        financedAmount,

        financingMonths,

        estimatedPayment,

        promotions:
          promotionResults,
      };
    });

  const generalPromotions =
    input.generalPromotions ??
    [];

  errors.push(
    ...validatePromotionSelection(
      generalPromotions,
    ),
  );

  const itemsTotal =
    roundMoney(
      itemResults.reduce(
        (total, item) =>
          total +
          item.totalAmount,
        0,
      ),
    );

  const generalPromotionResults =
    calculatePromotionResults(
      itemsTotal,
      generalPromotions,
    );

  const generalDiscount =
    roundMoney(
      generalPromotionResults.reduce(
        (
          total,
          promotion,
        ) =>
          total +
          promotion
            .calculatedBenefit,
        0,
      ),
    );

  const baseAmount =
    roundMoney(
      itemResults.reduce(
        (total, item) =>
          total +
          item.baseAmount,
        0,
      ),
    );

  const itemDiscount =
    roundMoney(
      itemResults.reduce(
        (total, item) =>
          total +
          item.discountAmount,
        0,
      ),
    );

  const discountAmount =
    roundMoney(
      itemDiscount +
        generalDiscount,
    );

  const totalAmount =
    Math.max(
      roundMoney(
        baseAmount -
          discountAmount,
      ),
      0,
    );

  const itemFinancingMonths =
    itemResults
      .map(
        (item) =>
          item.financingMonths,
      )
      .filter(
        (
          months,
        ): months is number =>
          months !== null,
      );

  const generalFinancingMonths =
    generalPromotions
      .map(getFinancingMonths)
      .filter(
        (
          months,
        ): months is number =>
          months !== null,
      );

  if (
    itemFinancingMonths.length >
      0 &&
    generalFinancingMonths.length >
      0
  ) {
    errors.push(
      "No puedes combinar un financiamiento general con financiamientos individuales por partida.",
    );
  }

  const financingTerms =
    Array.from(
      new Set([
        ...itemFinancingMonths,
        ...generalFinancingMonths,
      ]),
    );

  const financingMonths =
    financingTerms.length === 1
      ? financingTerms[0]
      : null;

  const paymentMethods =
    Array.from(
      new Set(
        [
          ...itemResults.map(
            (item) =>
              item.paymentMethod,
          ),

          getPaymentMethod(
            generalPromotions,
          ),
        ].filter(
          (
            paymentMethod,
          ): paymentMethod is string =>
            Boolean(
              paymentMethod,
            ),
        ),
      ),
    );

  const paymentMethod =
    paymentMethods.length === 0
      ? null
      : paymentMethods.length === 1
        ? paymentMethods[0]
        : "Mixto";

  const minimumDownPayment =
    roundMoney(
      Math.max(
        itemResults.reduce(
          (
            total,
            item,
          ) =>
            total +
            item
              .minimumDownPayment,
          0,
        ),

        generalPromotions.reduce(
          (
            highestMinimum,
            promotion,
          ) =>
            Math.max(
              highestMinimum,
              calculateMinimumDownPayment(
                totalAmount,
                promotion,
              ),
            ),
          0,
        ),
      ),
    );

  const hasGeneralFinancing =
    generalFinancingMonths.length >
    0;

  const generalCustomerDownPayment =
    Math.min(
      Math.max(
        roundMoney(
          toFiniteNumber(
            input
              .customerDownPayment,
            0,
          ),
        ),
        0,
      ),
      totalAmount,
    );

  const customerDownPayment =
    hasGeneralFinancing
      ? generalCustomerDownPayment
      : roundMoney(
          itemResults.reduce(
            (
              total,
              item,
            ) =>
              total +
              item
                .customerDownPayment,
            0,
          ),
        );

  const financedAmount =
    hasGeneralFinancing
      ? Math.max(
          roundMoney(
            totalAmount -
              customerDownPayment,
          ),
          0,
        )
      : roundMoney(
          itemResults.reduce(
            (
              total,
              item,
            ) =>
              total +
              item
                .financedAmount,
            0,
          ),
        );

  const estimatedPayment =
    hasGeneralFinancing &&
    financingMonths &&
    financingMonths > 0
      ? roundMoney(
          financedAmount /
            financingMonths,
        )
      : roundMoney(
          itemResults.reduce(
            (
              total,
              item,
            ) =>
              total +
              item
                .estimatedPayment,
            0,
          ),
        );


  return {
    items: itemResults,

    generalPromotions:
      generalPromotionResults,

    baseAmount,
    discountAmount,
    totalAmount,

    paymentMethod,

    minimumDownPayment,
    customerDownPayment,
    financedAmount,

    financingMonths,

    estimatedPayment,

    errors:
      Array.from(
        new Set(errors),
      ),
  };
}
