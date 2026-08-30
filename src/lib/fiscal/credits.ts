import {
  eq,
  sql,
} from "drizzle-orm";

import { db } from "@/db";

import {
  fiscalStampLedgerEntries,
  fiscalTenantAccounts,
} from "@/db/schema";

type FiscalCreditSource =
  | "monthly"
  | "top_up";

export type FiscalStampBalance = {
  enabled: boolean;
  status:
    | "active"
    | "paused"
    | "blocked";
  includedMonthlyStamps: number;
  usedMonthlyStamps: number;
  monthlyRemaining: number;
  topUpStampBalance: number;
  totalRemaining: number;
  monthlyWindowStart: Date | null;
  monthlyWindowEnd: Date | null;
};

export type ConsumeFiscalStampResult = {
  allowed: boolean;
  idempotent: boolean;
  source: FiscalCreditSource | null;
  monthlyRemaining: number;
  topUpRemaining: number;
  totalRemaining: number;
};

type ConsumptionRow = {
  idempotent: boolean;
  source: string | null;
  monthly_remaining: number;
  top_up_remaining: number;
};

function normalizeKey(
  value: string,
  field: string,
) {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${field} no puede estar vacío.`,
    );
  }

  return normalized;
}

function requirePositiveInteger(
  value: number,
  field: string,
) {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `${field} debe ser un entero mayor a cero.`,
    );
  }
}

function getRows<T>(
  result: unknown,
): T[] {
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(
      (result as { rows?: unknown })
        .rows,
    )
  ) {
    return (
      result as { rows: T[] }
    ).rows;
  }

  return [];
}

export async function getFiscalStampBalance(
  tenantId: string,
): Promise<FiscalStampBalance | null> {
  const normalizedTenantId =
    normalizeKey(
      tenantId,
      "La empresa",
    );

  const [account] =
    await db
      .select()
      .from(
        fiscalTenantAccounts,
      )
      .where(
        eq(
          fiscalTenantAccounts.tenantId,
          normalizedTenantId,
        ),
      )
      .limit(1);

  if (!account) {
    return null;
  }

  const monthlyRemaining =
    Math.max(
      0,
      account.includedMonthlyStamps -
        account.usedMonthlyStamps,
    );

  return {
    enabled: account.enabled,
    status: account.status,
    includedMonthlyStamps:
      account.includedMonthlyStamps,
    usedMonthlyStamps:
      account.usedMonthlyStamps,
    monthlyRemaining,
    topUpStampBalance:
      account.topUpStampBalance,
    totalRemaining:
      monthlyRemaining +
      account.topUpStampBalance,
    monthlyWindowStart:
      account.monthlyWindowStart,
    monthlyWindowEnd:
      account.monthlyWindowEnd,
  };
}

export async function grantFiscalMonthlyStamps({
  tenantId,
  quantity,
  windowStart,
  windowEnd,
  idempotencyKey,
  metadata = {},
}: {
  tenantId: string;
  quantity: number;
  windowStart: Date;
  windowEnd: Date;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const normalizedTenantId =
    normalizeKey(
      tenantId,
      "La empresa",
    );

  const normalizedIdempotencyKey =
    normalizeKey(
      idempotencyKey,
      "La llave de idempotencia",
    );

  requirePositiveInteger(
    quantity,
    "La cantidad de timbres",
  );

  if (
    !Number.isFinite(
      windowStart.getTime(),
    ) ||
    !Number.isFinite(
      windowEnd.getTime(),
    ) ||
    windowEnd <= windowStart
  ) {
    throw new Error(
      "La ventana mensual fiscal no es válida.",
    );
  }

  const now = new Date();

  const result =
    await db.execute(
      sql`
        WITH idempotency_lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(
            hashtextextended(
              ${normalizedIdempotencyKey},
              0
            )
          )
        ),
        existing AS MATERIALIZED (
          SELECT 1
          FROM ${fiscalStampLedgerEntries},
            idempotency_lock
          WHERE idempotency_key =
            ${normalizedIdempotencyKey}
          LIMIT 1
        ),
        updated AS (
          UPDATE ${fiscalTenantAccounts}
          SET
            included_monthly_stamps =
              ${quantity},
            used_monthly_stamps = 0,
            monthly_window_start =
              ${windowStart},
            monthly_window_end =
              ${windowEnd},
            updated_at = ${now}
          FROM idempotency_lock
          WHERE tenant_id =
            ${normalizedTenantId}
            AND NOT EXISTS (
              SELECT 1 FROM existing
            )
          RETURNING
            tenant_id,
            top_up_stamp_balance
        ),
        inserted AS (
          INSERT INTO ${fiscalStampLedgerEntries} (
            tenant_id,
            entry_type,
            stamp_delta,
            monthly_remaining_after,
            top_up_remaining_after,
            provider_cost,
            currency,
            idempotency_key,
            metadata,
            created_at
          )
          SELECT
            tenant_id,
            'monthly_grant',
            ${quantity},
            ${quantity},
            top_up_stamp_balance,
            0,
            'mxn',
            ${normalizedIdempotencyKey},
            ${JSON.stringify(metadata)}::jsonb,
            ${now}
          FROM updated
          RETURNING id
        )
        SELECT
          EXISTS(
            SELECT 1 FROM existing
          ) AS idempotent,
          EXISTS(
            SELECT 1 FROM inserted
          ) AS applied
      `,
    );

  return getRows<{
    idempotent: boolean;
    applied: boolean;
  }>(result)[0] ?? {
    idempotent: false,
    applied: false,
  };
}

export async function grantFiscalTopUpStamps({
  tenantId,
  quantity,
  idempotencyKey,
  metadata = {},
}: {
  tenantId: string;
  quantity: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const normalizedTenantId =
    normalizeKey(
      tenantId,
      "La empresa",
    );

  const normalizedIdempotencyKey =
    normalizeKey(
      idempotencyKey,
      "La llave de idempotencia",
    );

  requirePositiveInteger(
    quantity,
    "La cantidad de timbres",
  );

  const now = new Date();

  const result =
    await db.execute(
      sql`
        WITH idempotency_lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(
            hashtextextended(
              ${normalizedIdempotencyKey},
              0
            )
          )
        ),
        existing AS MATERIALIZED (
          SELECT 1
          FROM ${fiscalStampLedgerEntries},
            idempotency_lock
          WHERE idempotency_key =
            ${normalizedIdempotencyKey}
          LIMIT 1
        ),
        updated AS (
          UPDATE ${fiscalTenantAccounts}
          SET
            top_up_stamp_balance =
              top_up_stamp_balance +
              ${quantity},
            updated_at = ${now}
          FROM idempotency_lock
          WHERE tenant_id =
            ${normalizedTenantId}
            AND NOT EXISTS (
              SELECT 1 FROM existing
            )
          RETURNING
            tenant_id,
            GREATEST(
              included_monthly_stamps -
              used_monthly_stamps,
              0
            )::integer AS
              monthly_remaining,
            top_up_stamp_balance
        ),
        inserted AS (
          INSERT INTO ${fiscalStampLedgerEntries} (
            tenant_id,
            entry_type,
            stamp_delta,
            monthly_remaining_after,
            top_up_remaining_after,
            provider_cost,
            currency,
            idempotency_key,
            metadata,
            created_at
          )
          SELECT
            tenant_id,
            'top_up',
            ${quantity},
            monthly_remaining,
            top_up_stamp_balance,
            0,
            'mxn',
            ${normalizedIdempotencyKey},
            ${JSON.stringify(metadata)}::jsonb,
            ${now}
          FROM updated
          RETURNING id
        )
        SELECT
          EXISTS(
            SELECT 1 FROM existing
          ) AS idempotent,
          EXISTS(
            SELECT 1 FROM inserted
          ) AS applied
      `,
    );

  return getRows<{
    idempotent: boolean;
    applied: boolean;
  }>(result)[0] ?? {
    idempotent: false,
    applied: false,
  };
}

export async function consumeFiscalStamp({
  tenantId,
  invoiceId,
  idempotencyKey,
  providerCost = 0,
  currency = "mxn",
  metadata = {},
}: {
  tenantId: string;
  invoiceId?: string | null;
  idempotencyKey: string;
  providerCost?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}): Promise<ConsumeFiscalStampResult> {
  const normalizedTenantId =
    normalizeKey(
      tenantId,
      "La empresa",
    );

  const normalizedIdempotencyKey =
    normalizeKey(
      idempotencyKey,
      "La llave de idempotencia",
    );

  const normalizedCurrency =
    normalizeKey(
      currency,
      "La moneda",
    ).toLowerCase();

  if (
    !Number.isFinite(providerCost) ||
    providerCost < 0
  ) {
    throw new Error(
      "El costo del proveedor fiscal no es válido.",
    );
  }

  const now = new Date();

  const result =
    await db.execute(
      sql`
        WITH idempotency_lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(
            hashtextextended(
              ${normalizedIdempotencyKey},
              0
            )
          )
        ),
        existing AS MATERIALIZED (
          SELECT
            metadata ->> 'source' AS source,
            monthly_remaining_after,
            top_up_remaining_after
          FROM ${fiscalStampLedgerEntries},
            idempotency_lock
          WHERE idempotency_key =
            ${normalizedIdempotencyKey}
          LIMIT 1
        ),
        locked_account AS MATERIALIZED (
          SELECT
            account.tenant_id,
            account.included_monthly_stamps,
            account.used_monthly_stamps,
            account.top_up_stamp_balance,
            GREATEST(
              account.included_monthly_stamps -
              account.used_monthly_stamps,
              0
            )::integer AS
              monthly_remaining
          FROM ${fiscalTenantAccounts}
            AS account,
            idempotency_lock
          WHERE account.tenant_id =
            ${normalizedTenantId}
            AND account.enabled = true
            AND account.status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM existing
            )
          FOR UPDATE OF account
        ),
        updated AS (
          UPDATE ${fiscalTenantAccounts}
            AS account
          SET
            used_monthly_stamps =
              CASE
                WHEN locked.monthly_remaining > 0
                THEN account.used_monthly_stamps + 1
                ELSE account.used_monthly_stamps
              END,
            top_up_stamp_balance =
              CASE
                WHEN locked.monthly_remaining = 0
                THEN account.top_up_stamp_balance - 1
                ELSE account.top_up_stamp_balance
              END,
            updated_at = ${now}
          FROM locked_account AS locked
          WHERE account.tenant_id =
            locked.tenant_id
            AND (
              locked.monthly_remaining > 0
              OR locked.top_up_stamp_balance > 0
            )
          RETURNING
            CASE
              WHEN locked.monthly_remaining > 0
              THEN 'monthly'
              ELSE 'top_up'
            END AS source,
            GREATEST(
              account.included_monthly_stamps -
              account.used_monthly_stamps,
              0
            )::integer AS
              monthly_remaining,
            account.top_up_stamp_balance AS
              top_up_remaining
        ),
        inserted AS (
          INSERT INTO ${fiscalStampLedgerEntries} (
            tenant_id,
            invoice_id,
            entry_type,
            stamp_delta,
            monthly_remaining_after,
            top_up_remaining_after,
            provider_cost,
            currency,
            idempotency_key,
            metadata,
            created_at
          )
          SELECT
            ${normalizedTenantId},
            ${invoiceId ?? null},
            'stamp',
            -1,
            monthly_remaining,
            top_up_remaining,
            ${providerCost.toFixed(6)},
            ${normalizedCurrency},
            ${normalizedIdempotencyKey},
            ${JSON.stringify(metadata)}::jsonb
              || jsonb_build_object(
                'source',
                source
              ),
            ${now}
          FROM updated
          RETURNING
            metadata ->> 'source' AS source,
            monthly_remaining_after,
            top_up_remaining_after
        )
        SELECT
          true AS idempotent,
          source,
          monthly_remaining_after AS
            monthly_remaining,
          top_up_remaining_after AS
            top_up_remaining
        FROM existing
        UNION ALL
        SELECT
          false AS idempotent,
          source,
          monthly_remaining_after AS
            monthly_remaining,
          top_up_remaining_after AS
            top_up_remaining
        FROM inserted
        LIMIT 1
      `,
    );

  const row =
    getRows<ConsumptionRow>(
      result,
    )[0];

  if (!row) {
    const balance =
      await getFiscalStampBalance(
        normalizedTenantId,
      );

    return {
      allowed: false,
      idempotent: false,
      source: null,
      monthlyRemaining:
        balance?.monthlyRemaining ?? 0,
      topUpRemaining:
        balance?.topUpStampBalance ?? 0,
      totalRemaining:
        balance?.totalRemaining ?? 0,
    };
  }

  const source =
    row.source === "monthly" ||
    row.source === "top_up"
      ? row.source
      : null;

  return {
    allowed: true,
    idempotent: row.idempotent,
    source,
    monthlyRemaining:
      Number(row.monthly_remaining),
    topUpRemaining:
      Number(row.top_up_remaining),
    totalRemaining:
      Number(row.monthly_remaining) +
      Number(row.top_up_remaining),
  };
}

export async function refundFiscalStamp({
  tenantId,
  invoiceId,
  consumptionIdempotencyKey,
  refundIdempotencyKey,
  reason,
  metadata = {},
}: {
  tenantId: string;
  invoiceId?: string | null;
  consumptionIdempotencyKey: string;
  refundIdempotencyKey: string;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const normalizedTenantId = normalizeKey(tenantId, "La empresa");
  const normalizedConsumptionKey = normalizeKey(
    consumptionIdempotencyKey,
    "La llave del consumo",
  );
  const normalizedRefundKey = normalizeKey(
    refundIdempotencyKey,
    "La llave del reembolso",
  );
  const normalizedReason = normalizeKey(reason, "El motivo del reembolso");
  const now = new Date();

  const result = await db.execute(sql`
    WITH idempotency_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(
        hashtextextended(${normalizedRefundKey}, 0)
      )
    ),
    existing_refund AS MATERIALIZED (
      SELECT 1
      FROM ${fiscalStampLedgerEntries}, idempotency_lock
      WHERE idempotency_key = ${normalizedRefundKey}
      LIMIT 1
    ),
    consumed AS MATERIALIZED (
      SELECT
        metadata ->> 'source' AS source,
        provider_cost,
        currency
      FROM ${fiscalStampLedgerEntries}, idempotency_lock
      WHERE tenant_id = ${normalizedTenantId}
        AND idempotency_key = ${normalizedConsumptionKey}
        AND entry_type = 'stamp'
      LIMIT 1
    ),
    updated AS (
      UPDATE ${fiscalTenantAccounts} AS account
      SET
        used_monthly_stamps = CASE
          WHEN consumed.source = 'monthly'
          THEN GREATEST(account.used_monthly_stamps - 1, 0)
          ELSE account.used_monthly_stamps
        END,
        top_up_stamp_balance = CASE
          WHEN consumed.source = 'top_up'
          THEN account.top_up_stamp_balance + 1
          ELSE account.top_up_stamp_balance
        END,
        updated_at = ${now}
      FROM consumed
      WHERE account.tenant_id = ${normalizedTenantId}
        AND consumed.source IN ('monthly', 'top_up')
        AND NOT EXISTS (SELECT 1 FROM existing_refund)
      RETURNING
        consumed.source,
        GREATEST(
          account.included_monthly_stamps - account.used_monthly_stamps,
          0
        )::integer AS monthly_remaining,
        account.top_up_stamp_balance AS top_up_remaining,
        consumed.provider_cost,
        consumed.currency
    ),
    inserted AS (
      INSERT INTO ${fiscalStampLedgerEntries} (
        tenant_id, invoice_id, entry_type, stamp_delta,
        monthly_remaining_after, top_up_remaining_after,
        provider_cost, currency, idempotency_key, metadata, created_at
      )
      SELECT
        ${normalizedTenantId}, ${invoiceId ?? null}, 'refund', 1,
        monthly_remaining, top_up_remaining, provider_cost, currency,
        ${normalizedRefundKey},
        ${JSON.stringify(metadata)}::jsonb || jsonb_build_object(
          'source', source,
          'reason', ${normalizedReason},
          'consumptionIdempotencyKey', ${normalizedConsumptionKey}
        ),
        ${now}
      FROM updated
      RETURNING id
    )
    SELECT
      EXISTS(SELECT 1 FROM existing_refund) AS idempotent,
      EXISTS(SELECT 1 FROM inserted) AS refunded
  `);

  return getRows<{
    idempotent: boolean;
    refunded: boolean;
  }>(result)[0] ?? {
    idempotent: false,
    refunded: false,
  };
}
