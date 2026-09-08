import { sql } from "drizzle-orm";

import { db } from "@/db";
import { petPackageAccounts, petPackageLedgerEntries } from "@/db/schema";

export type PetPackageBalance = {
  available: number;
  reserved: number;
  consumed: number;
};

export type PetPackageMovementType =
  | "purchase"
  | "reserve"
  | "release"
  | "consume"
  | "redeem"
  | "refund"
  | "expire"
  | "adjustment";

export type PetPackageMovementResult = PetPackageBalance & {
  applied: boolean;
  idempotent: boolean;
};

type MovementDeltas = {
  available: number;
  reserved: number;
  consumed: number;
};

function normalizeKey(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} es obligatorio.`);
  return normalized;
}

function requirePositiveInteger(value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("La cantidad de unidades debe ser un entero positivo.");
  }
}

function getRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? rows as T[] : [];
  }
  return [];
}

function getMovementDeltas(type: PetPackageMovementType, units: number): MovementDeltas {
  switch (type) {
    case "purchase": return { available: units, reserved: 0, consumed: 0 };
    case "reserve": return { available: -units, reserved: units, consumed: 0 };
    case "release": return { available: units, reserved: -units, consumed: 0 };
    case "consume": return { available: 0, reserved: -units, consumed: units };
    case "redeem": return { available: -units, reserved: 0, consumed: units };
    case "refund": return { available: units, reserved: 0, consumed: -units };
    case "expire": return { available: -units, reserved: 0, consumed: 0 };
    case "adjustment": return { available: units, reserved: 0, consumed: 0 };
  }
}

export async function getPetPackageBalance(
  tenantId: string,
  packageAccountId: string,
): Promise<PetPackageBalance | null> {
  const [account] = await db
    .select({ id: petPackageAccounts.id })
    .from(petPackageAccounts)
    .where(sql`${petPackageAccounts.id} = ${normalizeKey(packageAccountId, "La cuenta del paquete")} AND ${petPackageAccounts.tenantId} = ${normalizeKey(tenantId, "La empresa")}`)
    .limit(1);
  if (!account) return null;
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(${petPackageLedgerEntries.availableDelta}), 0)::int AS available,
      COALESCE(SUM(${petPackageLedgerEntries.reservedDelta}), 0)::int AS reserved,
      COALESCE(SUM(${petPackageLedgerEntries.consumedDelta}), 0)::int AS consumed
    FROM ${petPackageLedgerEntries}
    WHERE ${petPackageLedgerEntries.tenantId} = ${tenantId}
      AND ${petPackageLedgerEntries.packageAccountId} = ${packageAccountId}
  `);
  const row = getRows<{ available: number; reserved: number; consumed: number }>(result)[0];
  return {
    available: Number(row?.available ?? 0),
    reserved: Number(row?.reserved ?? 0),
    consumed: Number(row?.consumed ?? 0),
  };
}

export async function applyPetPackageMovement({
  tenantId,
  packageAccountId,
  reservationId = null,
  type,
  units,
  idempotencyKey,
  reason = null,
  createdByClerkUserId = null,
  metadata = {},
}: {
  tenantId: string;
  packageAccountId: string;
  reservationId?: string | null;
  type: PetPackageMovementType;
  units: number;
  idempotencyKey: string;
  reason?: string | null;
  createdByClerkUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<PetPackageMovementResult> {
  const normalizedTenantId = normalizeKey(tenantId, "La empresa");
  const normalizedAccountId = normalizeKey(packageAccountId, "La cuenta del paquete");
  const normalizedKey = normalizeKey(idempotencyKey, "La llave de idempotencia");
  requirePositiveInteger(units);
  const deltas = getMovementDeltas(type, units);
  const requiresAvailable = type === "reserve" || type === "redeem" || type === "expire";
  const requiresReserved = type === "release" || type === "consume";
  const requiresConsumed = type === "refund";

  const result = await db.execute(sql`
    WITH account_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${normalizedAccountId}, 0))
    ),
    account AS MATERIALIZED (
      SELECT id
      FROM ${petPackageAccounts}, account_lock
      WHERE id = ${normalizedAccountId}
        AND tenant_id = ${normalizedTenantId}
        AND status = 'active'
        AND valid_from <= NOW()
        AND (valid_until IS NULL OR valid_until >= NOW())
      LIMIT 1
    ),
    existing AS MATERIALIZED (
      SELECT id
      FROM ${petPackageLedgerEntries}, account_lock
      WHERE tenant_id = ${normalizedTenantId}
        AND idempotency_key = ${normalizedKey}
      LIMIT 1
    ),
    balance AS MATERIALIZED (
      SELECT
        COALESCE(SUM(available_delta), 0)::int AS available,
        COALESCE(SUM(reserved_delta), 0)::int AS reserved,
        COALESCE(SUM(consumed_delta), 0)::int AS consumed
      FROM ${petPackageLedgerEntries}, account_lock
      WHERE tenant_id = ${normalizedTenantId}
        AND package_account_id = ${normalizedAccountId}
    ),
    inserted AS (
      INSERT INTO ${petPackageLedgerEntries} (
        tenant_id, package_account_id, reservation_id, entry_type,
        available_delta, reserved_delta, consumed_delta,
        idempotency_key, reason, metadata, created_by_clerk_user_id, created_at
      )
      SELECT
        ${normalizedTenantId}, ${normalizedAccountId}, ${reservationId}, ${type},
        ${deltas.available}, ${deltas.reserved}, ${deltas.consumed},
        ${normalizedKey}, ${reason}, ${metadata}, ${createdByClerkUserId}, NOW()
      FROM account, balance
      WHERE NOT EXISTS (SELECT 1 FROM existing)
        AND (${requiresAvailable} = false OR balance.available >= ${units})
        AND (${requiresReserved} = false OR balance.reserved >= ${units})
        AND (${requiresConsumed} = false OR balance.consumed >= ${units})
      RETURNING available_delta, reserved_delta, consumed_delta
    )
    SELECT
      EXISTS(SELECT 1 FROM existing) AS idempotent,
      EXISTS(SELECT 1 FROM inserted) AS applied,
      balance.available + COALESCE((SELECT available_delta FROM inserted), 0) AS available,
      balance.reserved + COALESCE((SELECT reserved_delta FROM inserted), 0) AS reserved,
      balance.consumed + COALESCE((SELECT consumed_delta FROM inserted), 0) AS consumed
    FROM balance
  `);

  const row = getRows<{
    idempotent: boolean;
    applied: boolean;
    available: number;
    reserved: number;
    consumed: number;
  }>(result)[0];
  return {
    idempotent: Boolean(row?.idempotent),
    applied: Boolean(row?.applied),
    available: Number(row?.available ?? 0),
    reserved: Number(row?.reserved ?? 0),
    consumed: Number(row?.consumed ?? 0),
  };
}

export const purchasePetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "purchase" });
export const reservePetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "reserve" });
export const releasePetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "release" });
export const consumePetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "consume" });
export const redeemPetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "redeem" });
export const refundPetPackageUnits = (input: Omit<Parameters<typeof applyPetPackageMovement>[0], "type">) =>
  applyPetPackageMovement({ ...input, type: "refund" });
