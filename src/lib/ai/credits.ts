import {
  and,
  eq,
  gt,
  inArray,
  sql,
} from "drizzle-orm";

import { db } from "@/db";

import {
  aiCreditLedgerEntries,
  aiCreditLots,
} from "@/db/schema";

import type {
  DataraProduct,
} from "@/lib/auth/types";

type ConsumeAITopUpCreditResult = {
  allowed: boolean;
  remaining: number;
};

export type AITopUpSummary = {
  original: number;
  used: number;
  remaining: number;
  nextExpiresAt: Date | null;
};

export async function getAITopUpSummary(
  tenantId: string,
  product: DataraProduct,
  referenceDate =
    new Date(),
): Promise<AITopUpSummary> {
  const [result] =
    await db
      .select({
        original:
          sql<number>`
            coalesce(
              sum(
                ${aiCreditLots.originalCredits}
              ),
              0
            )::integer
          `,

        remaining:
          sql<number>`
            coalesce(
              sum(
                ${aiCreditLots.remainingCredits}
              ),
              0
            )::integer
          `,

        nextExpiresAt:
          sql<Date | null>`
            min(
              ${aiCreditLots.expiresAt}
            ) filter (
              where
                ${aiCreditLots.remainingCredits} >
                0
            )
          `,
      })
      .from(
        aiCreditLots,
      )
      .where(
        and(
          eq(
            aiCreditLots.tenantId,
            tenantId,
          ),

          eq(
            aiCreditLots.product,
            product,
          ),

          inArray(
            aiCreditLots.status,
            [
              "active",
              "depleted",
            ],
          ),

          gt(
            aiCreditLots.expiresAt,
            referenceDate,
          ),
        ),
      );

  const original =
    Number(
      result?.original ?? 0,
    );

  const remaining =
    Number(
      result?.remaining ?? 0,
    );

  return {
    original,
    used:
      Math.max(
        0,
        original -
          remaining,
      ),
    remaining,
    nextExpiresAt:
      result?.nextExpiresAt ??
      null,
  };
}

export async function getAITopUpBalance(
  tenantId: string,
  product: DataraProduct,
): Promise<number> {
  const [result] =
    await db
      .select({
        balance:
          sql<number>`
            coalesce(
              sum(
                ${aiCreditLots.remainingCredits}
              ),
              0
            )::integer
          `,
      })
      .from(
        aiCreditLots,
      )
      .where(
        and(
          eq(
            aiCreditLots.tenantId,
            tenantId,
          ),

          eq(
            aiCreditLots.product,
            product,
          ),

          eq(
            aiCreditLots.status,
            "active",
          ),

          gt(
            aiCreditLots.expiresAt,
            new Date(),
          ),

          gt(
            aiCreditLots
              .remainingCredits,
            0,
          ),
        ),
      );

  return Number(
    result?.balance ?? 0,
  );
}

type GrantAITopUpCreditsOptions = {
  tenantId: string;
  product: DataraProduct;
  credits: number;
  commercialPurchaseId: string;
  catalogItemId: string;
  stripeEventId?: string;
  purchasedAt?: Date;
};

type GrantAITopUpCreditsResult = {
  granted: boolean;
  balance: number;
  expiresAt: Date;
};

export async function grantAITopUpCredits({
  tenantId,
  product,
  credits,
  commercialPurchaseId,
  catalogItemId,
  stripeEventId,
  purchasedAt =
    new Date(),
}: GrantAITopUpCreditsOptions): Promise<GrantAITopUpCreditsResult> {
  if (
    !Number.isInteger(credits) ||
    credits < 1
  ) {
    throw new Error(
      "La cantidad de créditos de la recarga no es válida.",
    );
  }

  const expiresAt =
    new Date(
      purchasedAt,
    );

  expiresAt.setUTCFullYear(
    expiresAt.getUTCFullYear() +
      1,
  );

  const idempotencyKey =
    `ai-top-up:${commercialPurchaseId}`;

  await db.execute(
    sql`
      WITH existing_balance AS (
        SELECT
          coalesce(
            sum(remaining_credits),
            0
          )::integer AS total
        FROM ${aiCreditLots}
        WHERE
          tenant_id = ${tenantId}
          AND product = ${product}
          AND status = 'active'
          AND expires_at > ${purchasedAt}
          AND remaining_credits > 0
      ),
      created_lot AS (
        INSERT INTO ${aiCreditLots} (
          id,
          tenant_id,
          product,
          commercial_purchase_id,
          catalog_item_id,
          original_credits,
          remaining_credits,
          status,
          purchased_at,
          expires_at,
          created_at,
          updated_at
        )
        VALUES (
          ${commercialPurchaseId},
          ${tenantId},
          ${product},
          ${commercialPurchaseId},
          ${catalogItemId},
          ${credits},
          ${credits},
          'active',
          ${purchasedAt},
          ${expiresAt},
          ${purchasedAt},
          ${purchasedAt}
        )
        ON CONFLICT (id)
          DO NOTHING
        RETURNING
          id
      )
      INSERT INTO ${aiCreditLedgerEntries} (
        tenant_id,
        product,
        credit_lot_id,
        entry_type,
        credit_delta,
        balance_after,
        commercial_purchase_id,
        catalog_item_id,
        stripe_event_id,
        idempotency_key,
        metadata,
        created_at
      )
      SELECT
        ${tenantId},
        ${product},
        created_lot.id,
        'top_up',
        ${credits},
        existing_balance.total +
          ${credits},
        ${commercialPurchaseId},
        ${catalogItemId},
        ${stripeEventId ?? null},
        ${idempotencyKey},
        jsonb_build_object(
          'expiresAt',
          ${expiresAt}::timestamptz,
          'validityMonths',
          12
        ),
        ${purchasedAt}
      FROM
        created_lot
      CROSS JOIN
        existing_balance
      ON CONFLICT (
        idempotency_key
      )
        DO NOTHING
    `,
  );

  const [ledgerEntry] =
    await db
      .select({
        balance:
          aiCreditLedgerEntries
            .balanceAfter,
      })
      .from(
        aiCreditLedgerEntries,
      )
      .where(
        eq(
          aiCreditLedgerEntries
            .idempotencyKey,
          idempotencyKey,
        ),
      )
      .limit(1);

  if (!ledgerEntry) {
    throw new Error(
      "No fue posible registrar la recarga de créditos.",
    );
  }

  return {
    granted: true,
    balance:
      ledgerEntry.balance,
    expiresAt,
  };
}

export async function consumeAITopUpCredit(
  tenantId: string,
  product: DataraProduct,
): Promise<ConsumeAITopUpCreditResult> {
  const idempotencyKey =
    `ai-consumption:${crypto.randomUUID()}`;

  const now =
    new Date();

  await db.execute(
    sql`
      WITH available_balance AS (
        SELECT
          coalesce(
            sum(remaining_credits),
            0
          )::integer AS total
        FROM ${aiCreditLots}
        WHERE
          tenant_id = ${tenantId}
          AND product = ${product}
          AND status = 'active'
          AND expires_at > ${now}
          AND remaining_credits > 0
      ),
      selected_lot AS MATERIALIZED (
        SELECT
          id
        FROM ${aiCreditLots}
        WHERE
          tenant_id = ${tenantId}
          AND product = ${product}
          AND status = 'active'
          AND expires_at > ${now}
          AND remaining_credits > 0
        ORDER BY
          expires_at ASC,
          purchased_at ASC,
          id ASC
        FOR UPDATE
        SKIP LOCKED
        LIMIT 1
      ),
      debited_lot AS (
        UPDATE ${aiCreditLots}
        SET
          remaining_credits =
            remaining_credits - 1,
          status =
            CASE
              WHEN remaining_credits = 1
                THEN 'depleted'
              ELSE status
            END,
          updated_at = ${now}
        FROM selected_lot
        WHERE
          ${aiCreditLots.id} =
            selected_lot.id
        RETURNING
          ${aiCreditLots.id}
      )
      INSERT INTO ${aiCreditLedgerEntries} (
        tenant_id,
        product,
        credit_lot_id,
        entry_type,
        credit_delta,
        balance_after,
        idempotency_key,
        metadata,
        created_at
      )
      SELECT
        ${tenantId},
        ${product},
        debited_lot.id,
        'consumption',
        -1,
        greatest(
          available_balance.total - 1,
          0
        ),
        ${idempotencyKey},
        jsonb_build_object(
          'source',
          'crm-assistant'
        ),
        ${now}
      FROM
        debited_lot
      CROSS JOIN
        available_balance
    `,
  );

  const [ledgerEntry] =
    await db
      .select({
        balanceAfter:
          aiCreditLedgerEntries
            .balanceAfter,
      })
      .from(
        aiCreditLedgerEntries,
      )
      .where(
        eq(
          aiCreditLedgerEntries
            .idempotencyKey,
          idempotencyKey,
        ),
      )
      .limit(1);

  if (!ledgerEntry) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining:
      ledgerEntry.balanceAfter,
  };
}
