import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenantBranches } from "@/db/schema";
import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { getPetApiContext, createPetApiErrorResponse } from "@/lib/crm/pet-api-context";
import { CRMPermissionError, requireCRMModulePermission } from "@/lib/crm/permissions";
import { classifyPetStay, readPetBranchPolicy } from "@/lib/crm/pet-branch-policy";
import { vaccinationState } from "@/lib/crm/pet-vaccination";

export const dynamic = "force-dynamic";
type Item = { id: string; title: string; detail: string; at?: string };
type Section = { key: string; title: string; description: string; href: string; count: number; items: Item[] };

export async function GET() {
  try {
    const { tenantId, userId } = await getPetApiContext("contacts", "view");
    const branchId = await getActiveCRMBranch(tenantId, userId);
    const [branch] = await db.select({ name: tenantBranches.name, timezone: tenantBranches.timezone, metadata: tenantBranches.metadata })
      .from(tenantBranches).where(and(eq(tenantBranches.tenantId, tenantId), eq(tenantBranches.id, branchId))).limit(1);
    const timezone = branch.timezone || "America/Mexico_City";
    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const weekEndDate = new Date(`${today}T00:00:00Z`);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);
    async function allowed(module: string) {
      try { await requireCRMModulePermission(tenantId, userId, module, "view"); return true; }
      catch (error) { if (error instanceof CRMPermissionError && error.status === 403) return false; throw error; }
    }
    const [
      staysAccess,
      groomingAccess,
      servicesAccess,
      documentsAccess,
      salesAccess,
      veterinaryAccess,
      inventoryAccess,
    ] = await Promise.all(
      [
        "pet-stays",
        "pet-grooming",
        "services",
        "documents",
        "sales-orders",
        "pet-veterinary",
        "inventory",
      ].map(allowed),
    );
    const sections: Section[] = [];
    function add(key: string, title: string, description: string, href: string, items: Item[]) {
      sections.push({ key, title, description, href, count: items.length, items: items.slice(0, 5) });
    }
    if (staysAccess) {
      const { rows } = await db.execute<{ id: string; name: string; tutor: string; service: string; starts: string; entered: string | null; status: string }>(sql`
        SELECT r.id, p.name, concat_ws(' ', c.name, c.last_name) AS tutor, r.service_type AS service,
          r.starts_at AS starts, r.checked_in_at AS entered, r.status
        FROM pet_reservations r JOIN crm_pets p ON p.id=r.pet_id AND p.tenant_id=r.tenant_id
        JOIN crm_customers c ON c.id=r.customer_id AND c.tenant_id=r.tenant_id
        WHERE r.tenant_id=${tenantId} AND r.branch_id=${branchId} AND r.service_type IN ('daycare','boarding')
          AND (r.status='checked_in' OR (r.status IN ('pending','confirmed') AND r.starts_at >= ${now.toISOString()}::timestamptz AND r.starts_at < ${now.toISOString()}::timestamptz + interval '7 days'))
        ORDER BY r.starts_at, r.id`);
      const present = rows.filter(r => r.status === "checked_in").map(r => ({ ...r,
        kind: classifyPetStay(new Date(r.entered || r.starts), now, timezone, readPetBranchPolicy(branch.metadata), r.service).serviceType }));
      for (const [kind, title] of [["daycare", "En guardería"], ["boarding", "En pensión"]]) {
        add(
          kind,
          title,
          "Mascotas con entrada abierta · clasificación según el cierre de la sucursal",
          kind === "daycare"
            ? "/crm/guarderia-pension?stayView=daycare"
            : "/crm/guarderia-pension?stayView=boarding",
          present
            .filter(r => r.kind === kind)
            .map(r => ({
              id: r.id,
              title: r.name,
              detail: r.tutor,
              at: r.entered || r.starts,
            })),
        );
      }

      add(
        "arrivals",
        "Próximas llegadas",
        "Reservas pendientes o confirmadas · próximos 7 días",
        "/crm/guarderia-pension?stayView=arrivals",
        rows
          .filter(r => r.status !== "checked_in")
          .map(r => ({
            id: r.id,
            title: r.name,
            detail: r.tutor,
            at: r.starts,
          })),
      );

      const { rows: packageRows } = await db.execute<{
        id: string;
        name: string;
        tutor: string;
        petName: string | null;
        purchasedUnits: number;
        available: number;
        validUntil: string | null;
      }>(sql`
        SELECT
          a.id,
          a.name,
          concat_ws(' ', c.name, c.last_name) AS tutor,
          p.name AS "petName",
          a.purchased_units AS "purchasedUnits",
          COALESCE(SUM(e.available_delta), 0)::int AS available,
          a.valid_until AS "validUntil"
        FROM pet_package_accounts a
        JOIN crm_customers c
          ON c.id = a.customer_id
          AND c.tenant_id = a.tenant_id
        LEFT JOIN crm_pets p
          ON p.id = a.pet_id
          AND p.tenant_id = a.tenant_id
        LEFT JOIN pet_package_ledger_entries e
          ON e.package_account_id = a.id
          AND e.tenant_id = a.tenant_id
        WHERE a.tenant_id = ${tenantId}
          AND c.branch_id = ${branchId}
          AND a.status = 'active'
          AND a.valid_from <= NOW()
          AND (a.valid_until IS NULL OR a.valid_until >= NOW())
        GROUP BY
          a.id,
          a.name,
          c.name,
          c.last_name,
          p.name,
          a.purchased_units,
          a.valid_until
        ORDER BY a.valid_until ASC NULLS LAST, a.name
      `);

      add(
        "packages-low",
        "Paquetes por agotarse",
        "Paquetes activos con 20% o menos de sus unidades disponibles",
        "/crm/guarderia-pension?packageAlert=low",
        packageRows
          .filter((row) => {
            const threshold = Math.max(
              1,
              Math.ceil(Number(row.purchasedUnits) * 0.2),
            );

            return row.available > 0 && row.available <= threshold;
          })
          .map((row) => ({
            id: row.id,
            title: row.petName
              ? `${row.petName} · ${row.name}`
              : row.name,
            detail: `${row.tutor} · ${row.available} ${row.available === 1 ? "unidad disponible" : "unidades disponibles"}`,
          })),
      );

      add(
        "packages-expiring",
        "Paquetes por vencer",
        "Paquetes con saldo que vencen dentro de los próximos 7 días",
        "/crm/guarderia-pension?packageAlert=expiring",
        packageRows
          .filter((row) => {
            if (!row.validUntil || row.available <= 0) return false;

            const expiration = new Date(row.validUntil);

            return (
              expiration >= now &&
              expiration.getTime() <= now.getTime() + 7 * 86400000
            );
          })
          .map((row) => ({
            id: row.id,
            title: row.petName
              ? `${row.petName} · ${row.name}`
              : row.name,
            detail: `${row.tutor} · ${row.available} ${row.available === 1 ? "unidad disponible" : "unidades disponibles"}`,
            at: row.validUntil || undefined,
          })),
      );
    }
    if (groomingAccess && servicesAccess) {
      const { rows } = await db.execute<{ id: string; name: string; tutor: string; status: string; scheduled: string | null; service: string }>(sql`
        SELECT s.id, p.name, s.customer_name AS tutor, s.status, s.scheduled_at AS scheduled, s.service_type AS service
        FROM crm_service_orders s JOIN crm_pets p ON p.id::text=s.unit_identifier AND p.tenant_id=s.tenant_id
        WHERE s.tenant_id=${tenantId} AND s.branch_id=${branchId} AND s.status NOT IN ('Completada','Cancelada')
        ORDER BY s.scheduled_at ASC NULLS LAST, s.id`);
      for (const [key, title, statuses, href] of [
        [
          "grooming-pending",
          "Grooming pendiente",
          ["Borrador", "Programada"],
          "/crm/grooming?groomingView=pending",
        ],
        [
          "grooming-working",
          "Grooming en proceso",
          ["En proceso", "Pausada", "Pendiente de autorización"],
          "/crm/grooming?groomingView=working",
        ],
        [
          "grooming-ready",
          "Listas para entregar",
          ["Pendiente de cierre"],
          "/crm/grooming?groomingView=ready",
        ],
      ] as const) add(
        key,
        title,
        "Órdenes abiertas de mascotas · incluye pendientes de días anteriores",
        href,
        rows
          .filter((r) =>
            (statuses as readonly string[]).includes(
              r.status,
            ),
          )
          .map((r) => ({
            id: r.id,
            title: r.name,
            detail: `${r.tutor} · ${r.service}`,
            at: r.scheduled || undefined,
          })),
      );
      add("appointments", "Próximas citas de grooming", "Programadas · próximos 7 días", "/crm/grooming?groomingView=appointments",
        rows.filter(r => r.status === "Programada" && r.scheduled && new Date(r.scheduled) >= now && new Date(r.scheduled).getTime() < now.getTime() + 7 * 86400000)
          .map(r => ({ id: r.id, title: r.name, detail: r.tutor, at: r.scheduled! })));
    }
    if (documentsAccess) {
      const { rows } = await db.execute<{ id: string; name: string; tutor: string; cardId: string | null; metadata: Record<string, unknown> | null }>(sql`
        SELECT p.id, p.name, concat_ws(' ', c.name,c.last_name) AS tutor, card.id AS "cardId", card.metadata
        FROM crm_pets p JOIN crm_customers c ON c.id=p.customer_id AND c.tenant_id=p.tenant_id
        LEFT JOIN LATERAL (
          SELECT d.id,d.metadata FROM crm_documents d JOIN crm_document_relations rel ON rel.document_id=d.id AND rel.tenant_id=d.tenant_id
          WHERE d.tenant_id=p.tenant_id AND rel.entity_type='pet' AND rel.entity_id=p.id::text AND d.status='active' AND d.category='Cartilla de vacunación'
          ORDER BY d.created_at DESC,d.id DESC LIMIT 1
        ) card ON true
        WHERE p.tenant_id=${tenantId} AND p.status='active' AND (c.branch_id=${branchId} OR EXISTS (
          SELECT 1 FROM pet_reservations r WHERE r.tenant_id=p.tenant_id AND r.pet_id=p.id AND r.branch_id=${branchId} AND r.status='checked_in'))
        ORDER BY p.name,p.id`);
      const cards = rows.map(r => ({ ...r, state: vaccinationState(r.cardId ? { id: r.cardId, metadata: r.metadata || {} } : null, today) }));
      for (const [key, title, statuses] of [
        ["vaccination-expiring", "Cartillas por vencer", ["valid", "expiring"]],
        ["vaccination-expired", "Cartillas vencidas", ["expired"]],
        ["vaccination-review", "Cartillas por completar", ["missing", "pending"]],
      ] as const) add(
        key,
        title,
        key === "vaccination-expiring"
          ? "Vencen dentro de los próximos 7 días, incluyendo hoy"
          : "Mascotas del tutor asignado a esta sucursal o presentes aquí",
        key === "vaccination-expiring"
          ? "/crm/mascotas?cartilla=week"
          : key === "vaccination-expired"
            ? "/crm/mascotas?cartilla=expired"
            : "/crm/mascotas?cartilla=pending",
        cards
          .filter((r) => {
            if (!(statuses as readonly string[]).includes(r.state.status)) {
              return false;
            }

            if (key !== "vaccination-expiring") {
              return true;
            }

            return (
              Boolean(r.state.validUntil) &&
              r.state.validUntil >= today &&
              r.state.validUntil <= weekEnd
            );
          })
          .map((r) => ({
            id: r.id,
            title: r.name,
            detail: `${r.tutor} · ${r.state.validUntil || "Sin vigencia revisada"}`,
          })),
      );
    }
        if (veterinaryAccess) {
      const { rows } = await db.execute<{
        id: string;
        petName: string;
        tutor: string;
        reason: string;
        clinician: string;
        followUpDate: string | null;
        nextVaccineDate: string | null;
        createdAt: string;
      }>(sql`
        SELECT
          v.id,
          p.name AS "petName",
          concat_ws(' ', c.name, c.last_name) AS tutor,
          v.reason,
          v.clinician,
          v.follow_up_date AS "followUpDate",
          NULLIF(v.details->>'nextVaccineDate', '') AS "nextVaccineDate",
          v.created_at AS "createdAt"
        FROM pet_clinical_visits v
        JOIN crm_pets p
          ON p.id = v.pet_id
          AND p.tenant_id = v.tenant_id
        JOIN crm_customers c
          ON c.id = v.customer_id
          AND c.tenant_id = v.tenant_id
        WHERE v.tenant_id = ${tenantId}
          AND v.branch_id = ${branchId}
        ORDER BY v.created_at DESC, v.id DESC
      `);

      const todayVisits = rows.filter(
        (row) =>
          new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(row.createdAt)) === today,
      );

      const nextSevenDays = new Date(
        now.getTime() + 7 * 86400000,
      );

      const nextThirtyDays = new Date(
        now.getTime() + 30 * 86400000,
      );

      add(
        "veterinary-today",
        "Consultas de hoy",
        "Consultas veterinarias registradas hoy en esta sucursal",
        "/crm/veterinaria?vetView=today",
        todayVisits.map((row) => ({
          id: row.id,
          title: row.petName,
          detail: `${row.tutor} · ${row.reason}`,
          at: row.createdAt,
        })),
      );

      add(
        "veterinary-followups",
        "Revisiones próximas",
        "Revisiones veterinarias programadas dentro de los próximos 7 días",
        "/crm/veterinaria?vetView=followups",
        rows
          .filter((row) => {
            if (!row.followUpDate) return false;

            const date = new Date(`${row.followUpDate}T12:00:00`);

            return (
              date >= new Date(`${today}T00:00:00`) &&
              date <= nextSevenDays
            );
          })
          .map((row) => ({
            id: row.id,
            title: row.petName,
            detail: `${row.tutor} · ${row.clinician}`,
            at: row.followUpDate || undefined,
          })),
      );

      add(
        "veterinary-vaccines",
        "Próximas vacunas",
        "Vacunas programadas dentro de los próximos 30 días",
        "/crm/veterinaria?vetView=vaccines",
        rows
          .filter((row) => {
            if (!row.nextVaccineDate) return false;

            const date = new Date(
              `${row.nextVaccineDate}T12:00:00`,
            );

            return (
              date >= new Date(`${today}T00:00:00`) &&
              date <= nextThirtyDays
            );
          })
          .map((row) => ({
            id: row.id,
            title: row.petName,
            detail: row.tutor,
            at: row.nextVaccineDate || undefined,
          })),
      );
    }
    if (inventoryAccess) {
      const { rows } = await db.execute<{
        id: string;
        productId: string;
        name: string;
        quantity: number;
        reservedQuantity: number;
        minimumQuantity: number;
        maximumQuantity: number | null;
        reorderPoint: number | null;
      }>(sql`
        SELECT
          s.id,
          s.product_id AS "productId",
          p.name,
          s.quantity,
          s.reserved_quantity AS "reservedQuantity",
          s.minimum_quantity AS "minimumQuantity",
          s.maximum_quantity AS "maximumQuantity",
          s.reorder_point AS "reorderPoint"
        FROM inventory_stocks s
        JOIN crm_products p
          ON p.id = s.product_id
          AND p.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantId}
          AND s.branch_id = ${branchId}
        ORDER BY p.name, s.id
      `);

      const products = new Map<
        string,
        {
          id: string;
          name: string;
          quantity: number;
          reservedQuantity: number;
          availableQuantity: number;
          hasLowLocation: boolean;
          hasOverstockLocation: boolean;
        }
      >();

      for (const row of rows) {
        const quantity = Number(row.quantity);
        const reservedQuantity =
          Number(row.reservedQuantity);
        const availableQuantity =
          quantity - reservedQuantity;

        const threshold =
          row.reorderPoint ??
          row.minimumQuantity;

        const lowLocation =
          availableQuantity > 0 &&
          threshold > 0 &&
          availableQuantity <= threshold;

        const overstockLocation =
          row.maximumQuantity !== null &&
          quantity > row.maximumQuantity;

        const existing =
          products.get(row.productId);

        if (!existing) {
          products.set(row.productId, {
            id: row.productId,
            name: row.name,
            quantity,
            reservedQuantity,
            availableQuantity,
            hasLowLocation: lowLocation,
            hasOverstockLocation:
              overstockLocation,
          });

          continue;
        }

        existing.quantity += quantity;
        existing.reservedQuantity +=
          reservedQuantity;
        existing.availableQuantity +=
          availableQuantity;
        existing.hasLowLocation =
          existing.hasLowLocation ||
          lowLocation;
        existing.hasOverstockLocation =
          existing.hasOverstockLocation ||
          overstockLocation;
      }

      const consolidated =
        Array.from(products.values());

      add(
        "inventory-low-stock",
        "Stock bajo",
        "Productos con al menos una ubicación en nivel bajo",
        "/crm/inventarios?stockAlert=low",
        consolidated
          .filter(
            (row) =>
              row.availableQuantity > 0 &&
              row.hasLowLocation,
          )
          .map((row) => ({
            id: row.id,
            title: row.name,
            detail: `${row.availableQuantity} disponibles`,
          })),
      );

      add(
        "inventory-out-of-stock",
        "Agotado",
        "Productos sin unidades disponibles",
        "/crm/inventarios?stockAlert=out",
        consolidated
          .filter(
            (row) =>
              row.availableQuantity <= 0,
          )
          .map((row) => ({
            id: row.id,
            title: row.name,
            detail: `${row.quantity} en existencia · ${row.reservedQuantity} reservadas`,
          })),
      );

      add(
        "inventory-overstock",
        "Sobre existencia",
        "Productos con alguna ubicación por encima de su máximo configurado",
        "/crm/inventarios?stockAlert=over",
        consolidated
          .filter(
            (row) =>
              row.hasOverstockLocation,
          )
          .map((row) => ({
            id: row.id,
            title: row.name,
            detail: `${row.quantity} unidades totales`,
          })),
      );
    }
    if (salesAccess) {
      const { rows } = await db.execute<{ id: string; reference: string; tutor: string; balance: string; currency: string }>(sql`
        SELECT o.id,o.reference,o.customer_name AS tutor,o.currency,
          (o.total_amount - COALESCE(pay.total,0))::text AS balance
        FROM crm_sales_orders o LEFT JOIN LATERAL (
          SELECT SUM(p.amount) AS total FROM commercial_payments p WHERE p.tenant_id=o.tenant_id AND p.sales_order_id=o.id
          AND p.status='received' AND lower(p.currency)=lower(o.currency)
        ) pay ON true
        WHERE o.tenant_id=${tenantId} AND o.branch_id=${branchId} AND o.status NOT IN ('Cancelada','Borrador')
          AND o.total_amount > COALESCE(pay.total,0) ORDER BY o.created_at,o.id`);
      add("unpaid", "Órdenes con saldo pendiente", "Importe de la orden menos pagos recibidos · no incluye servicios aún sin orden", "/crm/ordenes-de-venta?payment=unpaid",
        rows.map(r => ({ id: r.id, title: r.reference, detail: `${r.tutor} · ${Number(r.balance).toFixed(2)} ${r.currency.toUpperCase()}` })));
    }
    return NextResponse.json({ success: true, data: { branch: branch.name, timezone, updatedAt: now.toISOString(), sections } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return createPetApiErrorResponse(error, "No fue posible cargar el resumen Pets."); }
}
