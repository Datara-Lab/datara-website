import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  commercialOperationEvents,
  fiscalProviderConfigurations,
  fiscalProviderRequests,
  salesInvoices,
} from "@/db/schema";

import { buildCfdi40Xml } from "@/lib/fiscal/cfdi40";
import {
  consumeFiscalStamp,
  getFiscalStampBalance,
  refundFiscalStamp,
} from "@/lib/fiscal/credits";
import {
  FinkokProviderError,
} from "@/lib/fiscal/providers/finkok";
import { getFiscalProvider } from "@/lib/fiscal/providers";

import type {
  FiscalCancellationResult,
  FiscalDocumentRequest,
  FiscalStampedDocument,
} from "@/lib/fiscal/types";

type StampInvoiceInput = {
  tenantId: string;
  invoiceId: string;
  actorClerkUserId: string;
  actorName: string;
  request: FiscalDocumentRequest;
};

type FiscalRuntimeEnvironment = {
  datara_crm_documents?: R2Bucket;
};

export class FiscalRuntimeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "FISCAL_RUNTIME_ERROR") {
    super(message);
    this.name = "FiscalRuntimeError";
    this.status = status;
    this.code = code;
  }
}

function getDataraEnvironment(): string {
  return (
    process.env.DATARA_ENVIRONMENT?.trim().toLowerCase() ||
    process.env.NODE_ENV ||
    "development"
  );
}

function getFiscalBucket(): R2Bucket {
  const { env } = getCloudflareContext();
  const bucket = (env as unknown as FiscalRuntimeEnvironment)
    .datara_crm_documents;

  if (!bucket) {
    throw new FiscalRuntimeError(
      "El almacenamiento fiscal privado no está configurado.",
      500,
      "FISCAL_STORAGE_NOT_CONFIGURED",
    );
  }

  return bucket;
}

function getErrorDetails(error: unknown) {
  if (error instanceof FinkokProviderError) {
    return {
      code: error.code,
      message: error.message,
      definitive: !error.code.startsWith("FINKOK_HTTP_"),
    };
  }

  if (error instanceof FiscalRuntimeError) {
    return {
      code: error.code,
      message: error.message,
      definitive: true,
    };
  }

  return {
    code: "FISCAL_OPERATION_UNCERTAIN",
    message: error instanceof Error ? error.message : "Error fiscal desconocido.",
    definitive: false,
  };
}

async function markRequestError({
  requestId,
  error,
  startedAt,
}: {
  requestId: string;
  error: unknown;
  startedAt: number;
}) {
  const details = getErrorDetails(error);

  await db
    .update(fiscalProviderRequests)
    .set({
      status: "error",
      durationMs: Math.max(0, Date.now() - startedAt),
      errorCode: details.code,
      errorMessage: details.message.slice(0, 2000),
      metadata: {
        requiresReconciliation: !details.definitive,
      },
      completedAt: new Date(),
    })
    .where(eq(fiscalProviderRequests.id, requestId));

  return details;
}

export async function stampFiscalInvoice({
  tenantId,
  invoiceId,
  actorClerkUserId,
  actorName,
  request,
}: StampInvoiceInput): Promise<{
  idempotent: boolean;
  requestId: string;
  stampedDocument: FiscalStampedDocument;
  xmlObjectKey: string;
}> {
  const startedAt = Date.now();
  const dataraEnvironment = getDataraEnvironment();
  const requestIdempotencyKey = [
    "fiscal",
    "stamp",
    tenantId,
    invoiceId,
    request.idempotencyKey.trim(),
  ].join(":");
  const consumptionKey = `${requestIdempotencyKey}:credit`;
  const refundKey = `${requestIdempotencyKey}:refund`;
  const xml = buildCfdi40Xml(request);

  const [[configuration], [invoice], balance] = await Promise.all([
    db
      .select()
      .from(fiscalProviderConfigurations)
      .where(eq(fiscalProviderConfigurations.environment, dataraEnvironment))
      .limit(1),
    db
      .select({
        id: salesInvoices.id,
        tenantId: salesInvoices.tenantId,
        dealId: salesInvoices.dealId,
        status: salesInvoices.status,
        fiscalUuid: salesInvoices.fiscalUuid,
        xmlObjectKey: salesInvoices.xmlObjectKey,
        fiscalProvider: salesInvoices.fiscalProvider,
        fiscalEnvironment: salesInvoices.fiscalEnvironment,
        stampedAt: salesInvoices.stampedAt,
        metadata: salesInvoices.metadata,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, tenantId),
        ),
      )
      .limit(1),
    getFiscalStampBalance(tenantId),
  ]);

  if (!invoice) {
    throw new FiscalRuntimeError("La factura no existe.", 404, "INVOICE_NOT_FOUND");
  }

  if (invoice.fiscalUuid) {
    throw new FiscalRuntimeError(
      "La factura ya está timbrada.",
      409,
      "INVOICE_ALREADY_STAMPED",
    );
  }

  if (
    !configuration?.enabled ||
    !configuration.credentialSecretReference
  ) {
    throw new FiscalRuntimeError(
      `El proveedor fiscal no está configurado para ${dataraEnvironment}.`,
      503,
      "FISCAL_PROVIDER_NOT_CONFIGURED",
    );
  }

  if (
    !balance?.enabled ||
    balance.status !== "active" ||
    balance.totalRemaining < 1
  ) {
    throw new FiscalRuntimeError(
      "La empresa no tiene timbres fiscales disponibles.",
      402,
      "INSUFFICIENT_FISCAL_STAMPS",
    );
  }

  const provider = getFiscalProvider(configuration.provider);
  const credentials = {
    provider: configuration.provider,
    environment: configuration.mode,
    secretReference: configuration.credentialSecretReference,
  } as const;

  await provider.validateCredentials(credentials);

  const [createdRequest] = await db
    .insert(fiscalProviderRequests)
    .values({
      tenantId,
      invoiceId,
      environment: dataraEnvironment,
      provider: provider.key,
      operation: "stamp",
      status: "pending",
      providerCost: configuration.costPerStamp,
      currency: configuration.currency,
      idempotencyKey: requestIdempotencyKey,
      metadata: {
        actorClerkUserId,
        actorName,
        requestMetadata: request.metadata,
      },
    })
    .onConflictDoNothing({
      target: fiscalProviderRequests.idempotencyKey,
    })
    .returning({ id: fiscalProviderRequests.id });

  if (!createdRequest) {
    const [existingRequest] = await db
      .select()
      .from(fiscalProviderRequests)
      .where(eq(fiscalProviderRequests.idempotencyKey, requestIdempotencyKey))
      .limit(1);

    throw new FiscalRuntimeError(
      existingRequest?.status === "pending"
        ? "El timbrado de esta factura ya está en proceso."
        : "Este intento de timbrado ya fue procesado. Genera un nuevo intento después de revisar el resultado.",
      409,
      existingRequest?.status === "pending"
        ? "STAMP_ALREADY_PROCESSING"
        : "STAMP_IDEMPOTENCY_CONFLICT",
    );
  }

  const credit = await consumeFiscalStamp({
    tenantId,
    invoiceId,
    idempotencyKey: consumptionKey,
    providerCost: Number(configuration.costPerStamp),
    currency: configuration.currency,
    metadata: {
      fiscalProviderRequestId: createdRequest.id,
      dataraEnvironment,
      provider: provider.key,
    },
  });

  if (!credit.allowed) {
    const error = new FiscalRuntimeError(
      "La empresa no tiene timbres fiscales disponibles.",
      402,
      "INSUFFICIENT_FISCAL_STAMPS",
    );

    await markRequestError({
      requestId: createdRequest.id,
      error,
      startedAt,
    });
    throw error;
  }

  try {
    const stampedDocument = await provider.stamp(credentials, {
      ...request,
      metadata: {
        ...request.metadata,
        cfdiXml: xml,
      },
    });
    const xmlObjectKey = [
      "tenant-fiscal",
      tenantId,
      dataraEnvironment,
      invoiceId,
      `${stampedDocument.uuid}.xml`,
    ].join("/");
    const bucket = getFiscalBucket();

    await bucket.put(xmlObjectKey, stampedDocument.xml, {
      httpMetadata: {
        contentType: "application/xml; charset=utf-8",
        cacheControl: "private, no-store",
      },
      customMetadata: {
        tenantId,
        invoiceId,
        fiscalUuid: stampedDocument.uuid,
        provider: provider.key,
        environment: dataraEnvironment,
      },
    });

    const completedAt = new Date();

    const invoiceUpdate = db
        .update(salesInvoices)
        .set({
          status: "issued",
          invoiceNumber: request.folio || invoice.id,
          invoiceDate: new Date(request.issuedAt),
          series: request.series ?? null,
          folio: request.folio ?? null,
          paymentForm: request.paymentForm,
          paymentMethod: request.paymentMethod,
          fiscalProvider: provider.key,
          fiscalEnvironment: configuration.mode,
          fiscalUuid: stampedDocument.uuid,
          stampedAt: new Date(stampedDocument.stampedAt),
          xmlObjectKey,
          externalSystem: provider.key,
          externalId: stampedDocument.providerDocumentId,
          metadata: {
            ...invoice.metadata,
            fiscal: {
              ...stampedDocument.metadata,
              requestId: createdRequest.id,
            },
          },
          updatedAt: completedAt,
        })
        .where(
          and(
            eq(salesInvoices.id, invoiceId),
            eq(salesInvoices.tenantId, tenantId),
          ),
        );

    const requestUpdate = db
        .update(fiscalProviderRequests)
        .set({
          status: "success",
          providerRequestId: stampedDocument.providerDocumentId,
          fiscalUuid: stampedDocument.uuid,
          durationMs: Math.max(0, Date.now() - startedAt),
          metadata: {
            actorClerkUserId,
            actorName,
            xmlObjectKey,
            creditSource: credit.source,
            monthlyRemaining: credit.monthlyRemaining,
            topUpRemaining: credit.topUpRemaining,
          },
          completedAt,
        })
        .where(eq(fiscalProviderRequests.id, createdRequest.id));

    if (invoice.dealId) {
      const eventInsert = db.insert(commercialOperationEvents).values({
        tenantId,
        dealId: invoice.dealId,
        eventType: "invoice_stamped",
        entityType: "sales_invoice",
        entityId: invoiceId,
        summary: `Factura ${request.series ? `${request.series}-` : ""}${request.folio ?? invoiceId} timbrada con UUID ${stampedDocument.uuid}.`,
        source: "system",
        actorClerkUserId,
        actorName,
        idempotencyKey: `${requestIdempotencyKey}:event`,
        payload: {
          fiscalUuid: stampedDocument.uuid,
          provider: provider.key,
          environment: configuration.mode,
          fiscalProviderRequestId: createdRequest.id,
        },
      });

      await db.batch([invoiceUpdate, requestUpdate, eventInsert]);
    } else {
      await db.batch([invoiceUpdate, requestUpdate]);
    }

    return {
      idempotent: false,
      requestId: createdRequest.id,
      stampedDocument,
      xmlObjectKey,
    };
  } catch (error) {
    const details = await markRequestError({
      requestId: createdRequest.id,
      error,
      startedAt,
    });

    if (details.definitive) {
      await refundFiscalStamp({
        tenantId,
        invoiceId,
        consumptionIdempotencyKey: consumptionKey,
        refundIdempotencyKey: refundKey,
        reason: details.code,
        metadata: {
          fiscalProviderRequestId: createdRequest.id,
        },
      });
    }

    throw error;
  }
}

export async function cancelFiscalInvoice({
  tenantId,
  invoiceId,
  actorClerkUserId,
  actorName,
  reasonCode,
  replacementUuid,
  idempotencyKey,
}: {
  tenantId: string;
  invoiceId: string;
  actorClerkUserId: string;
  actorName: string;
  reasonCode: string;
  replacementUuid?: string;
  idempotencyKey: string;
}): Promise<{
  requestId: string;
  result: FiscalCancellationResult;
  acknowledgmentObjectKey: string | null;
}> {
  const startedAt = Date.now();
  const dataraEnvironment = getDataraEnvironment();
  const requestIdempotencyKey = [
    "fiscal",
    "cancel",
    tenantId,
    invoiceId,
    idempotencyKey.trim(),
  ].join(":");
  const [[configuration], [invoice]] = await Promise.all([
    db
      .select()
      .from(fiscalProviderConfigurations)
      .where(eq(fiscalProviderConfigurations.environment, dataraEnvironment))
      .limit(1),
    db
      .select({
        id: salesInvoices.id,
        dealId: salesInvoices.dealId,
        status: salesInvoices.status,
        fiscalProvider: salesInvoices.fiscalProvider,
        fiscalEnvironment: salesInvoices.fiscalEnvironment,
        fiscalUuid: salesInvoices.fiscalUuid,
        metadata: salesInvoices.metadata,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, tenantId),
        ),
      )
      .limit(1),
  ]);

  if (!invoice) {
    throw new FiscalRuntimeError("La factura no existe.", 404, "INVOICE_NOT_FOUND");
  }

  if (!invoice.fiscalUuid || !invoice.fiscalProvider || !invoice.fiscalEnvironment) {
    throw new FiscalRuntimeError(
      "La factura no contiene un CFDI timbrado para cancelar.",
      409,
      "INVOICE_NOT_STAMPED",
    );
  }

  if (invoice.status === "cancelled") {
    throw new FiscalRuntimeError(
      "La factura ya está cancelada.",
      409,
      "INVOICE_ALREADY_CANCELLED",
    );
  }

  if (
    !configuration?.enabled ||
    !configuration.credentialSecretReference ||
    configuration.provider !== invoice.fiscalProvider ||
    configuration.mode !== invoice.fiscalEnvironment
  ) {
    throw new FiscalRuntimeError(
      "La configuración fiscal activa no coincide con la utilizada para timbrar esta factura.",
      503,
      "FISCAL_CONFIGURATION_MISMATCH",
    );
  }

  const provider = getFiscalProvider(configuration.provider);
  const credentials = {
    provider: configuration.provider,
    environment: configuration.mode,
    secretReference: configuration.credentialSecretReference,
  } as const;

  await provider.validateCredentials(credentials);

  const [createdRequest] = await db
    .insert(fiscalProviderRequests)
    .values({
      tenantId,
      invoiceId,
      environment: dataraEnvironment,
      provider: provider.key,
      operation: "cancel",
      status: "pending",
      providerCost: "0",
      currency: configuration.currency,
      fiscalUuid: invoice.fiscalUuid,
      idempotencyKey: requestIdempotencyKey,
      metadata: {
        actorClerkUserId,
        actorName,
        reasonCode,
        replacementUuid: replacementUuid ?? null,
      },
    })
    .onConflictDoNothing({
      target: fiscalProviderRequests.idempotencyKey,
    })
    .returning({ id: fiscalProviderRequests.id });

  if (!createdRequest) {
    throw new FiscalRuntimeError(
      "Esta solicitud de cancelación ya fue procesada o está en curso.",
      409,
      "CANCELLATION_IDEMPOTENCY_CONFLICT",
    );
  }

  try {
    const result = await provider.cancel(credentials, {
      uuid: invoice.fiscalUuid,
      reasonCode,
      replacementUuid,
      idempotencyKey,
    });
    const acknowledgmentObjectKey = result.acknowledgment
      ? [
          "tenant-fiscal",
          tenantId,
          dataraEnvironment,
          invoiceId,
          `${invoice.fiscalUuid}.cancellation.xml`,
        ].join("/")
      : null;

    if (acknowledgmentObjectKey && result.acknowledgment) {
      await getFiscalBucket().put(
        acknowledgmentObjectKey,
        result.acknowledgment,
        {
          httpMetadata: {
            contentType: "application/xml; charset=utf-8",
            cacheControl: "private, no-store",
          },
          customMetadata: {
            tenantId,
            invoiceId,
            fiscalUuid: invoice.fiscalUuid,
            artifactType: "cancellation-acknowledgment",
          },
        },
      );
    }

    const completedAt = new Date();
    const invoiceUpdate = db
      .update(salesInvoices)
      .set({
        status: result.status === "cancelled" ? "cancelled" : invoice.status,
        cancellationRequestedAt: completedAt,
        cancelledAt: result.status === "cancelled" ? completedAt : null,
        cancellationReasonCode: reasonCode,
        replacementUuid: replacementUuid ?? null,
        metadata: {
          ...invoice.metadata,
          cancellation: {
            status: result.status,
            providerMessage: result.providerMessage,
            acknowledgmentObjectKey,
            requestId: createdRequest.id,
          },
        },
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, tenantId),
        ),
      );
    const requestUpdate = db
      .update(fiscalProviderRequests)
      .set({
        status: "success",
        providerRequestId: invoice.fiscalUuid,
        fiscalUuid: invoice.fiscalUuid,
        durationMs: Math.max(0, Date.now() - startedAt),
        metadata: {
          actorClerkUserId,
          actorName,
          reasonCode,
          replacementUuid: replacementUuid ?? null,
          cancellationStatus: result.status,
          providerMessage: result.providerMessage,
          acknowledgmentObjectKey,
        },
        completedAt,
      })
      .where(eq(fiscalProviderRequests.id, createdRequest.id));

    if (invoice.dealId) {
      const eventInsert = db.insert(commercialOperationEvents).values({
        tenantId,
        dealId: invoice.dealId,
        eventType:
          result.status === "cancelled"
            ? "invoice_cancelled"
            : "invoice_cancellation_requested",
        entityType: "sales_invoice",
        entityId: invoiceId,
        summary:
          result.status === "cancelled"
            ? `CFDI ${invoice.fiscalUuid} cancelado ante el SAT.`
            : `Cancelación solicitada para el CFDI ${invoice.fiscalUuid}.`,
        source: "system",
        actorClerkUserId,
        actorName,
        idempotencyKey: `${requestIdempotencyKey}:event`,
        payload: {
          fiscalUuid: invoice.fiscalUuid,
          reasonCode,
          replacementUuid: replacementUuid ?? null,
          cancellationStatus: result.status,
          fiscalProviderRequestId: createdRequest.id,
        },
      });

      await db.batch([invoiceUpdate, requestUpdate, eventInsert]);
    } else {
      await db.batch([invoiceUpdate, requestUpdate]);
    }

    return {
      requestId: createdRequest.id,
      result,
      acknowledgmentObjectKey,
    };
  } catch (error) {
    await markRequestError({
      requestId: createdRequest.id,
      error,
      startedAt,
    });
    throw error;
  }
}
