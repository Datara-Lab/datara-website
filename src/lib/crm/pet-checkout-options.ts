import { and, eq, sql } from "drizzle-orm";
import {
  classifyPetStay,
  getPetStayScheduleForDate,
  readPetBranchPolicy,
} from "@/lib/crm/pet-branch-policy";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { crmProducts, petPackageAccounts, petPackageLedgerEntries } from "@/db/schema";
import { calculatePetStayBilling, readPetStayBillingPolicy } from "@/lib/crm/pet-stay-billing";

type QuoteUnitType = "hour" | "night";

type Rate = {
  id: string;
  name: string;
  duration: number;
  unitPrice: number;
  currency: string;
  unitType: QuoteUnitType;
};

function getDuration(
  metadata: Record<string, unknown>,
  unitType: QuoteUnitType,
) {
  const value = metadata.technicalSpecifications;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  const technical = value as Record<string, unknown>;

  return Number(
    unitType === "night"
      ? technical.durationNights
      : technical.durationHours,
  );
}

function calculateQuote(
  rates: Rate[],
  target: number,
  unitType: QuoteUnitType,
) {
  if (!rates.length) return null;
  const currency = rates[0].currency;
  const options = rates.filter((rate) => rate.currency === currency);
  const limit = target + Math.max(...options.map((rate) => rate.duration));
  const costs = Array<number>(limit + 1).fill(Number.POSITIVE_INFINITY);
  const choice = Array<number>(limit + 1).fill(-1);
  costs[0] = 0;
  for (let covered = 1; covered <= limit; covered += 1) {
    options.forEach((rate, index) => {
      const previous = covered - rate.duration;
      if (previous >= 0 && costs[previous] + rate.unitPrice < costs[covered]) {
        costs[covered] = costs[previous] + rate.unitPrice;
        choice[covered] = index;
      }
    });
  }
  let best = target;
  for (let covered = target; covered <= limit; covered += 1) {
    if (costs[covered] < costs[best]) best = covered;
  }
  if (!Number.isFinite(costs[best])) return null;
  const quantities = new Map<number, number>();
  for (let remaining = best; remaining > 0;) {
    const index = choice[remaining];
    if (index < 0) return null;
    quantities.set(index, (quantities.get(index) ?? 0) + 1);
    remaining -= options[index].duration;
  }
  return {
    total: costs[best],
    currency,
    lines: [...quantities].map(([index, quantity]) => ({
      ...options[index],
      quantity,
    })),
  };
}


type Package = { id: string; name: string; available: number; metadata: Record<string, unknown>; unitType: string };
export async function getPetCheckoutOptions(tenantId: string, stay: {
  customerId: string;
  petId: string;
  serviceType: string;
  startsAt: Date;
  checkedInAt: Date | null;
  timezone: string | null;
  metadata?: Record<string, unknown> | null;
  branchMetadata?: Record<string, unknown> | null;
}) {
  const startedAt = stay.checkedInAt ?? stay.startsAt;
  const checkoutAt = new Date();
  const timezone = stay.timezone ?? "America/Mexico_City";
  const branchPolicy = readPetBranchPolicy(stay.branchMetadata);
  const stayMetadata =
  stay.metadata &&
  typeof stay.metadata === "object" &&
  !Array.isArray(stay.metadata)
    ? stay.metadata
    : {};

const rolloverMetadata =
  stayMetadata.petStayRollover &&
  typeof stayMetadata.petStayRollover === "object" &&
  !Array.isArray(stayMetadata.petStayRollover)
    ? stayMetadata.petStayRollover as Record<string, unknown>
    : null;

const classificationFallback =
  rolloverMetadata?.from === "daycare" &&
  rolloverMetadata?.to === "boarding"
    ? "daycare"
    : stay.serviceType;
  const checkoutSchedule = getPetStayScheduleForDate(checkoutAt, timezone, branchPolicy);
  const classification =
    classifyPetStay(
      startedAt,
      checkoutAt,
      timezone,
      branchPolicy,
      classificationFallback,
    );
  const serviceType = classification.serviceType;
  const base = calculatePetStayBilling({
    startedAt,
    checkoutAt,
    serviceType,
    unitType: serviceType === "boarding" ? "night" : "day",
    timezone,
    policy: readPetStayBillingPolicy(null),
    toleranceMinutes: branchPolicy.toleranceMinutes,
  });
  if (checkoutSchedule.close && serviceType === "boarding") { base.packageUnits = classification.nights; base.lateCheckout = false; base.explanation = `${classification.nights} noche(s), según los cierres de la sucursal.`; }
  const packages = await db.execute<Package>(sql`
    SELECT account.id, account.name, account.metadata, account.unit_type AS "unitType",
      COALESCE(SUM(entry.available_delta), 0)::int AS available
    FROM ${petPackageAccounts} account
    LEFT JOIN ${petPackageLedgerEntries} entry ON entry.tenant_id = account.tenant_id AND entry.package_account_id = account.id
    WHERE account.tenant_id = ${tenantId} AND account.customer_id = ${stay.customerId}
      AND (account.pet_id = ${stay.petId} OR (account.pet_id IS NULL AND account.transferable_between_pets = true))
      AND account.status = 'active' AND account.valid_from <= NOW()
      AND (account.valid_until IS NULL OR account.valid_until >= NOW())
      AND account.service_type IN (${serviceType}, 'mixed')
    GROUP BY account.id
    ORDER BY account.valid_until ASC NULLS LAST, account.created_at ASC
  `);
  const products = await db.select({ id: crmProducts.id, name: crmProducts.name, category: crmProducts.category,
    unitPrice: crmProducts.unitPrice, currency: crmProducts.currency, metadata: crmProducts.metadata,
  }).from(crmProducts).where(and(eq(crmProducts.tenantId, tenantId), eq(crmProducts.active, true)));
  const category = serviceType === "boarding" ? "pensión" : "guardería";

  const allRates = products
    .filter((product) => {
      const technical =
        product.metadata.technicalSpecifications as
          | Record<string, unknown>
          | undefined;

      return !(Number(technical?.includedUnits) > 0);
    })
    .map((product) => {
      const productCategory =
        product.category?.trim().toLowerCase();

      const unitType: QuoteUnitType =
        productCategory === "pensión"
          ? "night"
          : "hour";

      return {
        id: product.id,
        name: product.name,
        duration: getDuration(
          product.metadata,
          unitType,
        ),
        unitPrice: Number(product.unitPrice),
        currency: product.currency.toLowerCase(),
        category: productCategory,
        unitType,
      };
    })
    .filter(
      (rate) =>
        Number.isInteger(rate.duration) &&
        rate.duration > 0 &&
        rate.duration <= 8760 &&
        Number.isFinite(rate.unitPrice) &&
        rate.unitPrice >= 0,
    );
  const rates = allRates.filter(rate => rate.category === category);
  const daycareHours = serviceType === "boarding" && !branchPolicy.boardingIncludesDaycare ? classification.initialDaycareHours : 0;
  const daycareQuote =
    daycareHours > 0
      ? calculateQuote(
          allRates.filter((rate) => rate.category === "guardería"),
          daycareHours,
          "hour",
        )
      : null;
  if (base.billableHours > 8760) throw new Error("La estancia excede el límite de cálculo automático.");
  type Option = { id: string; label: string; billing: typeof base; packageAccount: Package | null;
    quote: ReturnType<typeof calculateQuote>; lowUsage: boolean; remaining: number | null };
  const options: Option[] = [];
  function append(
    label: string,
    billing: typeof base,
    account: Package | null,
    targetUnits: number,
    lowUsage = false,
  ) {
    let quote =
      targetUnits > 0
        ? calculateQuote(
            rates,
            targetUnits,
            serviceType === "boarding" ? "night" : "hour",
          )
        : null;

    if (targetUnits > 0 && !quote) return;
    if (daycareHours > 0) {
      if (!daycareQuote || (quote && quote.currency !== daycareQuote.currency)) return;
      quote = quote
        ? {
            total: quote.total + daycareQuote.total,
            currency: quote.currency,
            lines: [...quote.lines, ...daycareQuote.lines],
          }
        : daycareQuote;
      label += " + guardería previa";
    }
    const key = JSON.stringify({ packageId: account?.id ?? null, units: account ? billing.packageUnits : 0,
      remaining: account ? account.available - billing.packageUnits : null, quote });
    const id = createHash("sha256").update(key).digest("hex");
    if (options.some((option) => option.id === id)) return;
    options.push({ id, label, billing, packageAccount: account, quote, lowUsage,
      remaining: account ? account.available - billing.packageUnits : null });
  }
  for (const account of packages.rows) {
    if ((serviceType === "boarding") !== (account.unitType === "night")) continue;
    if (account.available <= 0) continue;
    const policy = readPetStayBillingPolicy(account.metadata.billingPolicy);
    const billing = calculatePetStayBilling({ startedAt, checkoutAt, timezone, serviceType, unitType: account.unitType,
      policy: { ...policy, overagePolicy: "extra_units" },
        toleranceMinutes: branchPolicy.toleranceMinutes });
    if (checkoutSchedule.close && serviceType === "boarding") { billing.packageUnits = classification.nights; billing.lateCheckout = false; billing.explanation = base.explanation; }
    const lowUsage = account.unitType !== "night" && base.elapsedMinutes <= policy.includedHours * 60 * branchPolicy.lowUsagePercent / 100;
    if (account.available >= billing.packageUnits) append(account.name, billing, account, 0, lowUsage);
    if (serviceType !== "boarding" && account.unitType !== "night" && base.elapsedMinutes > policy.includedHours * 60 + branchPolicy.toleranceMinutes) {
      const partial = calculatePetStayBilling({ startedAt, checkoutAt, timezone, serviceType, unitType: account.unitType,
              policy: { ...policy, overagePolicy: "cash" },
              toleranceMinutes: branchPolicy.toleranceMinutes });
      append(`${account.name} + diferencia`, partial, account, partial.cashChargeHours);
    }
  }
  append(
    "Pagar estancia completa, sin consumir paquetes",
    {
      ...base,
      packageUnits: 0,
      cashChargeHours: base.billableHours,
      cashChargeMinutes: base.elapsedMinutes,
      explanation: "Pago completo sin descontar unidades.",
    },
    null,
    serviceType === "boarding"
      ? classification.nights
      : base.billableHours,
  );
  const filteredOptions = options.filter((option) => {
  if (
    !option.packageAccount ||
    option.packageAccount.unitType === "night"
  ) {
    return true;
  }

  const optionPolicy = readPetStayBillingPolicy(
    option.packageAccount.metadata.billingPolicy,
  );

  return !options.some((other) => {
    if (
      !other.packageAccount ||
      other.id === option.id ||
      other.packageAccount.unitType === "night"
    ) {
      return false;
    }

    const otherPolicy = readPetStayBillingPolicy(
      other.packageAccount.metadata.billingPolicy,
    );

    const sameUnits =
      other.billing.packageUnits ===
      option.billing.packageUnits;

    const sameCharge =
      (other.quote?.total ?? 0) ===
        (option.quote?.total ?? 0) &&
      (other.quote?.currency ?? null) ===
        (option.quote?.currency ?? null);

    const betterFit =
      otherPolicy.includedHours <
      optionPolicy.includedHours;

    return sameUnits && sameCharge && betterFit;
  });
});
return {
  billing: base,
  options: filteredOptions,
  serviceType,
  nights: classification.nights,
  lowUsagePercent: branchPolicy.lowUsagePercent,
};
}
