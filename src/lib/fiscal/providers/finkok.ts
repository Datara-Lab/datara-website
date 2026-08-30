import {
  resolveFinkokCredentials,
} from "@/lib/fiscal/secrets";

import type {
  FiscalCancellationRequest,
  FiscalCancellationResult,
  FiscalCredentialValidation,
  FiscalCredentialsReference,
  FiscalDocumentRequest,
  FiscalDocumentStatus,
  FiscalProvider,
  FiscalStampedDocument,
} from "@/lib/fiscal/types";

const SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
const STAMP_NAMESPACE = "http://facturacion.finkok.com/stamp";
const CANCEL_NAMESPACE = "http://facturacion.finkok.com/cancel";
const APPS_NAMESPACE = "apps.services.soap.core.views";

const ENDPOINTS = {
  test: {
    stamp: "https://demo-facturacion.finkok.com/servicios/soap/stamp",
    cancel: "https://demo-facturacion.finkok.com/servicios/soap/cancel",
  },
  live: {
    stamp: "https://facturacion.finkok.com/servicios/soap/stamp",
    cancel: "https://facturacion.finkok.com/servicios/soap/cancel",
  },
} as const;

export class FinkokProviderError extends Error {
  code: string;
  metadata: Record<string, unknown>;

  constructor(
    message: string,
    code = "FINKOK_ERROR",
    metadata: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "FinkokProviderError";
    this.code = code;
    this.metadata = metadata;
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );

  return new TextDecoder().decode(bytes);
}

function getTag(xml: string, tag: string): string | null {
  const expression = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${tag}>`,
    "i",
  );
  const match = expression.exec(xml);

  return match ? decodeXml(match[1].trim()) : null;
}

function getAttribute(xml: string, name: string): string | null {
  const expression = new RegExp(`${name}=["']([^"']*)["']`, "i");
  const match = expression.exec(xml);

  return match ? decodeXml(match[1]) : null;
}

function getSoapFault(xml: string): string | null {
  return getTag(xml, "faultstring") ?? getTag(xml, "Reason");
}

function getIncidence(xml: string) {
  const block = getTag(xml, "Incidencia");

  if (!block) return null;

  return {
    code: getTag(block, "CodigoError") ?? "FINKOK_INCIDENCE",
    message:
      getTag(block, "MensajeIncidencia") ??
      getTag(block, "ExtraInfo") ??
      "Finkok rechazó la solicitud.",
  };
}

function normalizeStampedXml(value: string): string {
  const normalized = value.trim();

  if (normalized.startsWith("<")) return normalized;

  try {
    return fromBase64(normalized);
  } catch {
    throw new FinkokProviderError(
      "Finkok devolvió un XML timbrado inválido.",
      "INVALID_STAMPED_XML",
    );
  }
}

async function soapRequest(endpoint: string, body: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "text/xml; charset=utf-8",
      accept: "text/xml",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>\n${body}`,
  });
  const responseXml = await response.text();
  const fault = getSoapFault(responseXml);

  if (!response.ok || fault) {
    throw new FinkokProviderError(
      fault ?? `Finkok respondió con HTTP ${response.status}.`,
      `FINKOK_HTTP_${response.status}`,
    );
  }

  return responseXml;
}

function requireCfdiXml(request: FiscalDocumentRequest): string {
  const xml = request.metadata.cfdiXml;

  if (typeof xml !== "string" || !xml.trim()) {
    throw new FinkokProviderError(
      "La solicitud fiscal no contiene el CFDI XML generado por Datara.",
      "CFDI_XML_REQUIRED",
    );
  }

  return xml.trim();
}

export class FinkokFiscalProvider implements FiscalProvider {
  readonly key = "finkok";
  readonly displayName = "Finkok";

  async validateCredentials(
    reference: FiscalCredentialsReference,
  ): Promise<FiscalCredentialValidation> {
    const credentials = await resolveFinkokCredentials(reference);

    return {
      valid: true,
      issuerTaxId: credentials.taxpayerId,
      message:
        "Las credenciales tienen el formato requerido. La validación remota se realizará al ejecutar una operación fiscal.",
    };
  }

  async stamp(
    reference: FiscalCredentialsReference,
    request: FiscalDocumentRequest,
  ): Promise<FiscalStampedDocument> {
    const credentials = await resolveFinkokCredentials(reference);
    const unsignedXml = requireCfdiXml(request);
    const endpoint = ENDPOINTS[reference.environment].stamp;
    const responseXml = await soapRequest(
      endpoint,
      `<soapenv:Envelope xmlns:soapenv="${SOAP_NAMESPACE}" xmlns:stam="${STAMP_NAMESPACE}">
        <soapenv:Header/>
        <soapenv:Body>
          <stam:sign_stamp>
            <stam:xml>${escapeXml(toBase64(unsignedXml))}</stam:xml>
            <stam:username>${escapeXml(credentials.username)}</stam:username>
            <stam:password>${escapeXml(credentials.password)}</stam:password>
          </stam:sign_stamp>
        </soapenv:Body>
      </soapenv:Envelope>`,
    );
    const incidence = getIncidence(responseXml);

    if (incidence) {
      throw new FinkokProviderError(incidence.message, incidence.code);
    }

    const uuid = getTag(responseXml, "UUID");
    const xml = getTag(responseXml, "xml");
    const status = getTag(responseXml, "CodEstatus");

    if (!uuid || !xml) {
      throw new FinkokProviderError(
        status ?? "Finkok no devolvió UUID ni XML timbrado.",
        "INCOMPLETE_STAMP_RESPONSE",
      );
    }

    return {
      provider: this.key,
      providerDocumentId: uuid,
      uuid,
      status: "stamped",
      stampedAt: getTag(responseXml, "Fecha") ?? new Date().toISOString(),
      satCertificateNumber: getTag(responseXml, "NoCertificadoSAT") ?? undefined,
      issuerCertificateNumber: credentials.certificateSerial,
      xml: normalizeStampedXml(xml),
      metadata: {
        codeStatus: status,
        satSeal: getTag(responseXml, "SatSeal"),
      },
    };
  }

  async cancel(
    reference: FiscalCredentialsReference,
    request: FiscalCancellationRequest,
  ): Promise<FiscalCancellationResult> {
    const credentials = await resolveFinkokCredentials(reference);

    if (!["01", "02", "03", "04"].includes(request.reasonCode)) {
      throw new FinkokProviderError(
        "El motivo de cancelación SAT debe ser 01, 02, 03 o 04.",
        "INVALID_CANCELLATION_REASON",
      );
    }

    if (request.reasonCode === "01" && !request.replacementUuid) {
      throw new FinkokProviderError(
        "El motivo 01 requiere el UUID que sustituye al CFDI.",
        "REPLACEMENT_UUID_REQUIRED",
      );
    }

    const endpoint = ENDPOINTS[reference.environment].cancel;
    const responseXml = await soapRequest(
      endpoint,
      `<soapenv:Envelope xmlns:soapenv="${SOAP_NAMESPACE}" xmlns:can="${CANCEL_NAMESPACE}" xmlns:apps="${APPS_NAMESPACE}">
        <soapenv:Header/>
        <soapenv:Body>
          <can:sign_cancel>
            <can:UUIDS>
              <apps:UUID UUID="${escapeXml(request.uuid)}" Motivo="${request.reasonCode}" FolioSustitucion="${escapeXml(request.replacementUuid ?? "")}"/>
            </can:UUIDS>
            <can:username>${escapeXml(credentials.username)}</can:username>
            <can:password>${escapeXml(credentials.password)}</can:password>
            <can:taxpayer_id>${escapeXml(credentials.taxpayerId)}</can:taxpayer_id>
            <can:serial>${escapeXml(credentials.certificateSerial)}</can:serial>
            <can:store_pending>0</can:store_pending>
          </can:sign_cancel>
        </soapenv:Body>
      </soapenv:Envelope>`,
    );
    const statusCode =
      getTag(responseXml, "EstatusUUID") ??
      getAttribute(responseXml, "EstatusUUID");
    const providerStatus =
      getTag(responseXml, "EstatusCancelacion") ??
      getAttribute(responseXml, "EstatusCancelacion") ??
      "";
    const normalizedStatus = providerStatus.toLowerCase();
    const status =
      normalizedStatus.includes("cancelado") || statusCode === "201"
        ? "cancelled"
        : normalizedStatus.includes("rechaz")
          ? "rejected"
          : normalizedStatus.includes("aceptación") || statusCode === "202"
            ? "pending_acceptance"
            : "requested";

    return {
      provider: this.key,
      uuid: request.uuid,
      status,
      requestedAt: getTag(responseXml, "Fecha") ?? new Date().toISOString(),
      completedAt: status === "cancelled" ? new Date().toISOString() : undefined,
      acknowledgment: getTag(responseXml, "Acuse") ?? undefined,
      providerMessage: providerStatus || statusCode || undefined,
      metadata: { statusCode },
    };
  }

  async getStatus(
    _reference: FiscalCredentialsReference,
    uuid: string,
  ): Promise<FiscalDocumentStatus> {
    return {
      provider: this.key,
      uuid,
      status: "unknown",
      providerMessage:
        "La consulta remota de estado se habilitará con el endpoint SAT/Finkok de seguimiento.",
      checkedAt: new Date().toISOString(),
      metadata: {},
    };
  }

  async getXml(): Promise<string> {
    throw new FinkokProviderError(
      "El XML fiscal debe recuperarse del almacenamiento privado de Datara.",
      "USE_DATARA_FISCAL_STORAGE",
    );
  }

  async getPdf(): Promise<string | null> {
    return null;
  }
}

export const finkokFiscalProvider = new FinkokFiscalProvider();
