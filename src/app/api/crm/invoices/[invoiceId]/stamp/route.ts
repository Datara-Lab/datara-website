import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmCustomers,
  crmProducts,
  crmSalesOrderItems,
  crmSalesOrders,
  salesInvoices,
  tenantBranches,
  tenants,
} from "@/db/schema";

import { getCRMBranchAccess } from "@/lib/crm/branch-access";
import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";
import { CfdiValidationError } from "@/lib/fiscal/cfdi40";
import {
  FiscalRuntimeError,
  stampFiscalInvoice,
} from "@/lib/fiscal/runtime";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ invoiceId: string }>;
};

type StampPayload = {
  series?: unknown;
  folio?: unknown;
  paymentForm?: unknown;
  paymentMethod?: unknown;
  issuedAt?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getRequiredString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) throw new ApiError(`${field} es obligatorio.`, 400);

  return normalized;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function getIdempotencyKey(request: Request): string {
  const value = request.headers.get("idempotency-key")?.trim() ?? "";

  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new ApiError(
      "Envía una llave de idempotencia válida para confirmar el timbrado.",
      400,
    );
  }

  return value;
}

function getPostalCode(address: unknown): string | undefined {
  if (typeof address !== "object" || address === null || Array.isArray(address)) {
    return undefined;
  }

  return getOptionalString((address as Record<string, unknown>).postalCode);
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof FiscalRuntimeError ||
    error instanceof CRMPermissionError
  ) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  if (error instanceof CfdiValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        field: error.field,
      },
      { status: 422 },
    );
  }

  console.error("No fue posible timbrar la factura:", error);

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible confirmar el resultado fiscal. Revisa el historial antes de reintentar.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;
    const payload = (await request.json()) as StampPayload;
    const idempotencyKey = getIdempotencyKey(request);
    const { userId, orgId } = await auth();

    if (!userId) throw new ApiError("No autenticado.", 401);
    if (!orgId) throw new ApiError("No hay una organización activa.", 400);

    const [record] = await db
      .select({
        tenantId: tenants.id,
        tenantLegalName: tenants.legalName,
        tenantTaxId: tenants.taxId,
        tenantTaxRegime: tenants.fiscalTaxRegime,
        tenantPostalCode: tenants.fiscalPostalCode,
        invoiceId: salesInvoices.id,
        branchId: salesInvoices.branchId,
        dealId: salesInvoices.dealId,
        salesOrderId: salesInvoices.salesOrderId,
        invoiceStatus: salesInvoices.status,
        invoiceAmount: salesInvoices.amount,
        invoiceCurrency: salesInvoices.currency,
        invoiceSeries: salesInvoices.series,
        invoiceFolio: salesInvoices.folio,
        invoiceDate: salesInvoices.invoiceDate,
        invoicePaymentForm: salesInvoices.paymentForm,
        invoicePaymentMethod: salesInvoices.paymentMethod,
        fiscalUuid: salesInvoices.fiscalUuid,
        branchAddress: tenantBranches.address,
        customerId: crmCustomers.id,
        customerName: crmCustomers.name,
        customerLastName: crmCustomers.lastName,
        customerCompanyName: crmCustomers.companyName,
        customerLegalName: crmCustomers.legalName,
        customerTaxId: crmCustomers.taxId,
        customerTaxRegime: crmCustomers.fiscalTaxRegime,
        customerCfdiUse: crmCustomers.cfdiUse,
        customerPostalCode: crmCustomers.postalCode,
        customerEmail: crmCustomers.email,
      })
      .from(salesInvoices)
      .innerJoin(tenants, eq(tenants.id, salesInvoices.tenantId))
      .innerJoin(
        crmSalesOrders,
        and(
          eq(crmSalesOrders.id, salesInvoices.salesOrderId),
          eq(crmSalesOrders.tenantId, salesInvoices.tenantId),
        ),
      )
      .leftJoin(
        tenantBranches,
        and(
          eq(tenantBranches.id, salesInvoices.branchId),
          eq(tenantBranches.tenantId, salesInvoices.tenantId),
        ),
      )
      .leftJoin(
        crmCustomers,
        and(
          eq(crmCustomers.id, salesInvoices.customerId),
          eq(crmCustomers.tenantId, salesInvoices.tenantId),
        ),
      )
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(tenants.clerkOrganizationId, orgId),
        ),
      )
      .limit(1);

    if (!record) throw new ApiError("La factura no existe.", 404);

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(record.tenantId, userId),
      requireCRMModulePermission(
        record.tenantId,
        userId,
        "cfdi-stamping",
        "create",
      ),
    ]);

    if (
      !branchAccess.allBranches &&
      (!record.branchId || !branchAccess.branchIds.includes(record.branchId))
    ) {
      throw new ApiError("No tienes acceso a esta factura.", 403);
    }

    if (record.fiscalUuid) {
      throw new ApiError("La factura ya está timbrada.", 409);
    }

    if (record.invoiceStatus === "cancelled") {
      throw new ApiError("Una factura cancelada no puede timbrarse.", 409);
    }

    if (!record.customerId) {
      throw new ApiError("La factura no tiene un cliente relacionado.", 422);
    }

    const items = await db
      .select({
        id: crmSalesOrderItems.id,
        productId: crmSalesOrderItems.productId,
        name: crmSalesOrderItems.name,
        description: crmSalesOrderItems.description,
        quantity: crmSalesOrderItems.quantity,
        unitPrice: crmSalesOrderItems.unitPrice,
        discountAmount: crmSalesOrderItems.discountAmount,
        productServiceCode: crmProducts.productServiceCode,
        unitCode: crmProducts.unitCode,
        taxObject: crmProducts.taxObject,
        transferredTaxCode: crmProducts.transferredTaxCode,
        transferredFactorType: crmProducts.transferredFactorType,
        transferredTaxRate: crmProducts.transferredTaxRate,
      })
      .from(crmSalesOrderItems)
      .leftJoin(
        crmProducts,
        and(
          eq(crmProducts.id, crmSalesOrderItems.productId),
          eq(crmProducts.tenantId, crmSalesOrderItems.tenantId),
        ),
      )
      .where(
        and(
          eq(crmSalesOrderItems.tenantId, record.tenantId),
          eq(crmSalesOrderItems.salesOrderId, record.salesOrderId),
        ),
      );

    if (items.length === 0) {
      throw new ApiError("La orden de venta no tiene conceptos.", 422);
    }

    const customerNaturalName = [record.customerName, record.customerLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const actor = await currentUser();
    const actorName =
      [actor?.firstName, actor?.lastName].filter(Boolean).join(" ").trim() ||
      actor?.emailAddresses[0]?.emailAddress ||
      "Usuario";
    const issuedAt =
      getOptionalString(payload.issuedAt) ??
      record.invoiceDate?.toISOString() ??
      new Date().toISOString();
    const series = getOptionalString(payload.series) ?? record.invoiceSeries ?? undefined;
    const folio = getRequiredString(
      getOptionalString(payload.folio) ?? record.invoiceFolio,
      "El folio",
    );
    const paymentForm = getRequiredString(
      getOptionalString(payload.paymentForm) ?? record.invoicePaymentForm,
      "La forma de pago",
    );
    const paymentMethod = getRequiredString(
      getOptionalString(payload.paymentMethod) ?? record.invoicePaymentMethod,
      "El método de pago",
    );

    const result = await stampFiscalInvoice({
      tenantId: record.tenantId,
      invoiceId: record.invoiceId,
      actorClerkUserId: userId,
      actorName,
      request: {
        idempotencyKey,
        series,
        folio,
        issuedAt,
        expeditionPostalCode:
          getPostalCode(record.branchAddress) ??
          getRequiredString(record.tenantPostalCode, "El código postal fiscal del emisor"),
        currency: record.invoiceCurrency,
        paymentMethod,
        paymentForm,
        issuer: {
          taxId: getRequiredString(record.tenantTaxId, "El RFC del emisor"),
          legalName: getRequiredString(
            record.tenantLegalName,
            "La razón social del emisor",
          ),
          taxRegime: getRequiredString(
            record.tenantTaxRegime,
            "El régimen fiscal del emisor",
          ),
          postalCode: getRequiredString(
            record.tenantPostalCode,
            "El código postal fiscal del emisor",
          ),
        },
        receiver: {
          taxId: getRequiredString(record.customerTaxId, "El RFC del receptor"),
          legalName: getRequiredString(
            record.customerLegalName ??
              record.customerCompanyName ??
              customerNaturalName,
            "La razón social del receptor",
          ),
          taxRegime: getRequiredString(
            record.customerTaxRegime,
            "El régimen fiscal del receptor",
          ),
          postalCode: getRequiredString(
            record.customerPostalCode,
            "El código postal fiscal del receptor",
          ),
          cfdiUse: getRequiredString(record.customerCfdiUse, "El uso CFDI"),
          email: record.customerEmail ?? undefined,
        },
        concepts: items.map((item) => ({
          internalId: item.productId ?? item.id,
          productServiceCode: getRequiredString(
            item.productServiceCode,
            `La clave SAT de ${item.name}`,
          ),
          unitCode: getRequiredString(
            item.unitCode,
            `La unidad SAT de ${item.name}`,
          ),
          quantity: item.quantity,
          description: item.description?.trim() || item.name,
          unitAmount: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount),
          taxObject: getRequiredString(
            item.taxObject,
            `El objeto de impuesto de ${item.name}`,
          ),
          transferredTaxes:
            item.taxObject === "02" || item.taxObject === "03"
              ? [
                  {
                    tax: getRequiredString(
                      item.transferredTaxCode,
                      `El impuesto trasladado de ${item.name}`,
                    ),
                    factorType: getRequiredString(
                      item.transferredFactorType,
                      `El factor de impuesto de ${item.name}`,
                    ),
                    rateOrFee: Number(item.transferredTaxRate ?? 0),
                  },
                ]
              : [],
        })),
        metadata: {
          expectedTotal: Number(record.invoiceAmount),
          dealId: record.dealId,
          salesOrderId: record.salesOrderId,
          actorClerkUserId: userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "La factura fue timbrada correctamente.",
      data: {
        invoiceId: record.invoiceId,
        requestId: result.requestId,
        uuid: result.stampedDocument.uuid,
        stampedAt: result.stampedDocument.stampedAt,
        provider: result.stampedDocument.provider,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
