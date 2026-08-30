import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { salesInvoices, tenants } from "@/db/schema";
import { getCRMBranchAccess } from "@/lib/crm/branch-access";
import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";
import { generateFiscalPdf } from "@/lib/fiscal/pdf";
import { StampedCfdiParseError } from "@/lib/fiscal/stamped-cfdi";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
    artifact: string;
  }>;
};

type FiscalArtifact = "xml" | "pdf";

type FiscalArtifactEnvironment = {
  datara_crm_documents?: R2Bucket;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getBucket(): R2Bucket {
  const { env } = getCloudflareContext();
  const bucket = (env as unknown as FiscalArtifactEnvironment)
    .datara_crm_documents;

  if (!bucket) {
    throw new ApiError(
      "El almacenamiento fiscal privado no está configurado.",
      500,
    );
  }

  return bucket;
}

function getArtifact(value: string): FiscalArtifact {
  if (value === "xml" || value === "pdf") return value;
  throw new ApiError("El archivo fiscal solicitado no es válido.", 404);
}

function safeFileName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "cfdi"
  );
}

function errorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof CRMPermissionError ||
    error instanceof StampedCfdiParseError
  ) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error instanceof StampedCfdiParseError ? 422 : error.status },
    );
  }

  console.error("No fue posible descargar el archivo fiscal:", error);
  return NextResponse.json(
    {
      success: false,
      error: "No fue posible preparar el archivo fiscal.",
    },
    { status: 500 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { invoiceId, artifact: rawArtifact } = await context.params;
    const artifact = getArtifact(rawArtifact);
    const { userId, orgId } = await auth();

    if (!userId) throw new ApiError("No autenticado.", 401);
    if (!orgId) throw new ApiError("No hay una organización activa.", 400);

    const [invoice] = await db
      .select({
        id: salesInvoices.id,
        tenantId: salesInvoices.tenantId,
        branchId: salesInvoices.branchId,
        invoiceNumber: salesInvoices.invoiceNumber,
        series: salesInvoices.series,
        folio: salesInvoices.folio,
        fiscalUuid: salesInvoices.fiscalUuid,
        fiscalProvider: salesInvoices.fiscalProvider,
        fiscalEnvironment: salesInvoices.fiscalEnvironment,
        xmlObjectKey: salesInvoices.xmlObjectKey,
        pdfObjectKey: salesInvoices.pdfObjectKey,
      })
      .from(salesInvoices)
      .innerJoin(tenants, eq(tenants.id, salesInvoices.tenantId))
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(tenants.clerkOrganizationId, orgId),
        ),
      )
      .limit(1);

    if (!invoice) throw new ApiError("La factura no existe.", 404);

    const [branchAccess] = await Promise.all([
      getCRMBranchAccess(invoice.tenantId, userId),
      requireCRMModulePermission(
        invoice.tenantId,
        userId,
        "cfdi-stamping",
        "view",
      ),
    ]);

    if (
      !branchAccess.allBranches &&
      (!invoice.branchId || !branchAccess.branchIds.includes(invoice.branchId))
    ) {
      throw new ApiError("No tienes acceso a esta factura.", 403);
    }

    if (!invoice.fiscalUuid || !invoice.xmlObjectKey) {
      throw new ApiError("La factura todavía no contiene un CFDI timbrado.", 409);
    }

    const bucket = getBucket();
    let objectKey =
      artifact === "xml" ? invoice.xmlObjectKey : invoice.pdfObjectKey;

    if (artifact === "pdf" && !objectKey) {
      const xmlObject = await bucket.get(invoice.xmlObjectKey);
      if (!xmlObject) {
        throw new ApiError("El XML timbrado no está disponible.", 404);
      }

      const xml = await xmlObject.text();
      const generated = await generateFiscalPdf(xml);
      objectKey = [
        "tenant-fiscal",
        invoice.tenantId,
        invoice.fiscalEnvironment ?? "unknown",
        invoice.id,
        `${invoice.fiscalUuid}.pdf`,
      ].join("/");

      await bucket.put(objectKey, generated.bytes, {
        httpMetadata: {
          contentType: "application/pdf",
          cacheControl: "private, no-store",
        },
        customMetadata: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          fiscalUuid: invoice.fiscalUuid,
          provider: invoice.fiscalProvider ?? "unknown",
          artifactType: "fiscal-pdf",
        },
      });

      await db
        .update(salesInvoices)
        .set({ pdfObjectKey: objectKey, updatedAt: new Date() })
        .where(
          and(
            eq(salesInvoices.id, invoice.id),
            eq(salesInvoices.tenantId, invoice.tenantId),
          ),
        );
    }

    if (!objectKey) throw new ApiError("El archivo fiscal no está disponible.", 404);
    const object = await bucket.get(objectKey);
    if (!object) throw new ApiError("El archivo fiscal no está disponible.", 404);

    const baseName = safeFileName(
      [invoice.series, invoice.folio]
        .filter(Boolean)
        .join("-") ||
        invoice.invoiceNumber ||
        invoice.fiscalUuid,
    );
    const fileName = `cfdi-${baseName}.${artifact}`;

    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type":
          artifact === "pdf"
            ? "application/pdf"
            : "application/xml; charset=utf-8",
        "Content-Length": String(object.size),
        "Content-Disposition":
          `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
        ETag: object.httpEtag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
