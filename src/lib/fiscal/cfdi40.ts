import type {
  FiscalConcept,
  FiscalDocumentRequest,
} from "@/lib/fiscal/types";

const RFC_PATTERN = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const SAT_CODE_PATTERN = /^[0-9]{2,8}$/;
const PRODUCT_SERVICE_CODE_PATTERN = /^[0-9]{8}$/;
const UNIT_CODE_PATTERN = /^[A-Z0-9]{2,3}$/;
const POSTAL_CODE_PATTERN = /^[0-9]{5}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CfdiValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "CfdiValidationError";
    this.field = field;
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

function attribute(name: string, value: string | number | undefined): string {
  return value === undefined || value === ""
    ? ""
    : ` ${name}="${escapeXml(String(value))}"`;
}

function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new CfdiValidationError(field, `${field} es obligatorio.`);
  }

  return normalized;
}

function requireRfc(value: string, field: string): string {
  const normalized = required(value, field).toUpperCase();

  if (!RFC_PATTERN.test(normalized) && normalized !== "XAXX010101000" && normalized !== "XEXX010101000") {
    throw new CfdiValidationError(field, `${field} no tiene un RFC válido.`);
  }

  return normalized;
}

function requirePostalCode(value: string, field: string): string {
  const normalized = required(value, field);

  if (!POSTAL_CODE_PATTERN.test(normalized)) {
    throw new CfdiValidationError(field, `${field} debe contener cinco dígitos.`);
  }

  return normalized;
}

function requireSatCode(value: string, field: string): string {
  const normalized = required(value, field);

  if (!SAT_CODE_PATTERN.test(normalized)) {
    throw new CfdiValidationError(field, `${field} no es una clave SAT válida.`);
  }

  return normalized;
}

function requirePattern(
  value: string,
  field: string,
  pattern: RegExp,
): string {
  const normalized = required(value, field).toUpperCase();

  if (!pattern.test(normalized)) {
    throw new CfdiValidationError(field, `${field} no tiene un formato válido.`);
  }

  return normalized;
}

function finiteNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new CfdiValidationError(field, `${field} no es válido.`);
  }

  return value;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function money(value: number): string {
  return round(value).toFixed(2);
}

function quantity(value: number): string {
  return round(value, 6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function rate(value: number): string {
  return round(value, 6).toFixed(6);
}

type CalculatedTax = {
  tax: string;
  factorType: string;
  rateOrFee: number;
  base: number;
  amount: number;
};

type CalculatedConcept = {
  concept: FiscalConcept;
  subtotal: number;
  discount: number;
  taxableBase: number;
  transferredTaxes: CalculatedTax[];
};

function calculateConcept(concept: FiscalConcept, index: number): CalculatedConcept {
  const prefix = `Concepto ${index + 1}`;
  const quantityValue = finiteNonNegative(concept.quantity, `${prefix}: cantidad`);

  if (quantityValue <= 0) {
    throw new CfdiValidationError(`${prefix}: cantidad`, "La cantidad debe ser mayor a cero.");
  }

  finiteNonNegative(concept.unitAmount, `${prefix}: valor unitario`);
  const subtotal = round(quantityValue * concept.unitAmount);
  const discount = round(
    finiteNonNegative(concept.discountAmount ?? 0, `${prefix}: descuento`),
  );

  if (discount > subtotal) {
    throw new CfdiValidationError(
      `${prefix}: descuento`,
      "El descuento no puede superar el importe del concepto.",
    );
  }

  const taxableBase = round(subtotal - discount);
  const transferredTaxes = (concept.transferredTaxes ?? []).map((tax, taxIndex) => {
    finiteNonNegative(tax.rateOrFee, `${prefix}: impuesto ${taxIndex + 1}`);
    const factorType = required(tax.factorType, `${prefix}: tipo de factor`);

    if (!["Tasa", "Cuota", "Exento"].includes(factorType)) {
      throw new CfdiValidationError(
        `${prefix}: tipo de factor`,
        "El tipo de factor debe ser Tasa, Cuota o Exento.",
      );
    }
    const amount = factorType === "Exento"
      ? 0
      : round(taxableBase * tax.rateOrFee);

    return {
      tax: requireSatCode(tax.tax, `${prefix}: impuesto`),
      factorType,
      rateOrFee: tax.rateOrFee,
      base: taxableBase,
      amount,
    };
  });

  return { concept, subtotal, discount, taxableBase, transferredTaxes };
}

function renderConcept(calculated: CalculatedConcept): string {
  const { concept, subtotal, discount, transferredTaxes } = calculated;
  const taxes = transferredTaxes.length === 0
    ? ""
    : `<cfdi:Impuestos><cfdi:Traslados>${transferredTaxes.map((tax) =>
        `<cfdi:Traslado${attribute("Base", money(tax.base))}${attribute("Impuesto", tax.tax)}${attribute("TipoFactor", tax.factorType)}${tax.factorType === "Exento" ? "" : attribute("TasaOCuota", rate(tax.rateOrFee))}${tax.factorType === "Exento" ? "" : attribute("Importe", money(tax.amount))}/>`
      ).join("")}</cfdi:Traslados></cfdi:Impuestos>`;

  return `<cfdi:Concepto${attribute("ClaveProdServ", requirePattern(concept.productServiceCode, "ClaveProdServ", PRODUCT_SERVICE_CODE_PATTERN))}${attribute("NoIdentificacion", concept.internalId)}${attribute("Cantidad", quantity(concept.quantity))}${attribute("ClaveUnidad", requirePattern(concept.unitCode, "ClaveUnidad", UNIT_CODE_PATTERN))}${attribute("Descripcion", required(concept.description, "Descripción"))}${attribute("ValorUnitario", money(concept.unitAmount))}${attribute("Importe", money(subtotal))}${discount > 0 ? attribute("Descuento", money(discount)) : ""}${attribute("ObjetoImp", requirePattern(concept.taxObject, "ObjetoImp", /^(01|02|03|04|05|06|07|08)$/))}>${taxes}</cfdi:Concepto>`;
}

export function buildCfdi40Xml(request: FiscalDocumentRequest): string {
  if (request.concepts.length === 0) {
    throw new CfdiValidationError("Conceptos", "Agrega al menos un concepto.");
  }

  const issuedAt = new Date(request.issuedAt);

  if (Number.isNaN(issuedAt.getTime())) {
    throw new CfdiValidationError("Fecha", "La fecha de emisión no es válida.");
  }

  const concepts = request.concepts.map(calculateConcept);
  const subtotal = round(concepts.reduce((total, item) => total + item.subtotal, 0));
  const discount = round(concepts.reduce((total, item) => total + item.discount, 0));
  const transferred = concepts.flatMap((item) => item.transferredTaxes);
  const transferredTotal = round(transferred.reduce((total, item) => total + item.amount, 0));
  const groupedTransferred = Array.from(
    transferred.reduce((groups, tax) => {
      const key = `${tax.tax}:${tax.factorType}:${rate(tax.rateOrFee)}`;
      const current = groups.get(key);

      groups.set(key, {
        ...tax,
        base: round((current?.base ?? 0) + tax.base),
        amount: round((current?.amount ?? 0) + tax.amount),
      });

      return groups;
    }, new Map<string, CalculatedTax>()).values(),
  );
  const total = round(subtotal - discount + transferredTotal);
  const expectedTotal = request.metadata.expectedTotal;

  if (
    typeof expectedTotal === "number" &&
    Number.isFinite(expectedTotal) &&
    Math.abs(round(expectedTotal) - total) > 0.01
  ) {
    throw new CfdiValidationError(
      "Total",
      `El total calculado del CFDI (${money(total)}) no coincide con la factura (${money(expectedTotal)}).`,
    );
  }
  const relatedDocuments = request.relatedDocuments ?? [];

  for (const related of relatedDocuments) {
    if (!UUID_PATTERN.test(related.uuid)) {
      throw new CfdiValidationError("CFDI relacionado", "El UUID relacionado no es válido.");
    }
  }

  const relationTypes = new Set(
    relatedDocuments.map((related) => related.relationType.trim()),
  );

  if (relationTypes.size > 1) {
    throw new CfdiValidationError(
      "CFDI relacionado",
      "Todos los CFDI del grupo deben usar el mismo tipo de relación.",
    );
  }

  const relatedXml = relatedDocuments.length === 0
    ? ""
    : `<cfdi:CfdiRelacionados${attribute("TipoRelacion", required(relatedDocuments[0].relationType, "TipoRelacion"))}>${relatedDocuments.map((related) => `<cfdi:CfdiRelacionado${attribute("UUID", related.uuid.toUpperCase())}/>`).join("")}</cfdi:CfdiRelacionados>`;
  const taxesXml = transferred.length === 0
    ? ""
    : `<cfdi:Impuestos${attribute("TotalImpuestosTrasladados", money(transferredTotal))}><cfdi:Traslados>${groupedTransferred.map((tax) => `<cfdi:Traslado${attribute("Base", money(tax.base))}${attribute("Impuesto", tax.tax)}${attribute("TipoFactor", tax.factorType)}${tax.factorType === "Exento" ? "" : attribute("TasaOCuota", rate(tax.rateOrFee))}${tax.factorType === "Exento" ? "" : attribute("Importe", money(tax.amount))}/>`).join("")}</cfdi:Traslados></cfdi:Impuestos>`;
  const issueDate = request.issuedAt.trim().slice(0, 19);

  requirePattern(request.paymentForm, "FormaPago", /^[0-9]{2}$/);
  requirePattern(request.paymentMethod, "MetodoPago", /^(PUE|PPD)$/);
  requirePattern(request.currency, "Moneda", /^[A-Z]{3}$/);

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0"${attribute("Serie", request.series)}${attribute("Folio", request.folio)}${attribute("Fecha", issueDate)}${attribute("FormaPago", required(request.paymentForm, "FormaPago"))}${attribute("SubTotal", money(subtotal))}${discount > 0 ? attribute("Descuento", money(discount)) : ""}${attribute("Moneda", required(request.currency, "Moneda").toUpperCase())}${request.exchangeRate === undefined ? "" : attribute("TipoCambio", quantity(request.exchangeRate))}${attribute("Total", money(total))} TipoDeComprobante="I" Exportacion="01"${attribute("MetodoPago", required(request.paymentMethod, "MetodoPago"))}${attribute("LugarExpedicion", requirePostalCode(request.expeditionPostalCode, "LugarExpedicion"))}>` +
    relatedXml +
    `<cfdi:Emisor${attribute("Rfc", requireRfc(request.issuer.taxId, "RFC emisor"))}${attribute("Nombre", required(request.issuer.legalName, "Nombre del emisor"))}${attribute("RegimenFiscal", requireSatCode(request.issuer.taxRegime, "Régimen fiscal del emisor"))}/>` +
    `<cfdi:Receptor${attribute("Rfc", requireRfc(request.receiver.taxId, "RFC receptor"))}${attribute("Nombre", required(request.receiver.legalName, "Nombre del receptor"))}${attribute("DomicilioFiscalReceptor", requirePostalCode(request.receiver.postalCode, "Domicilio fiscal del receptor"))}${attribute("RegimenFiscalReceptor", requireSatCode(request.receiver.taxRegime, "Régimen fiscal del receptor"))}${attribute("UsoCFDI", required(request.receiver.cfdiUse, "Uso CFDI"))}/>` +
    `<cfdi:Conceptos>${concepts.map(renderConcept).join("")}</cfdi:Conceptos>` +
    taxesXml +
    `</cfdi:Comprobante>`;
}
