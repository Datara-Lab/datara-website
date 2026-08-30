export type StampedCfdiParty = {
  taxId: string;
  legalName: string;
  taxRegime: string;
  postalCode?: string;
  cfdiUse?: string;
};

export type StampedCfdiConcept = {
  productServiceCode: string;
  unitCode: string;
  quantity: number;
  description: string;
  unitAmount: number;
  amount: number;
  discount: number;
  taxObject: string;
};

export type StampedCfdi = {
  version: string;
  series?: string;
  folio?: string;
  issuedAt: string;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentForm?: string;
  paymentMethod?: string;
  expeditionPostalCode: string;
  certificateNumber: string;
  issuerSeal: string;
  issuer: StampedCfdiParty;
  receiver: StampedCfdiParty;
  concepts: StampedCfdiConcept[];
  uuid: string;
  stampedAt: string;
  certifierTaxId: string;
  satCertificateNumber: string;
  satSeal: string;
};

export class StampedCfdiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StampedCfdiParseError";
  }
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.split(":").at(-1);
    if (name) attributes[name] = decodeXml(match[2] ?? match[3] ?? "");
  }

  return attributes;
}

function findTag(xml: string, localName: string): string {
  const match = xml.match(
    new RegExp(`<(?:[\\w.-]+:)?${localName}\\b[^>]*>`, "i"),
  );

  if (!match) {
    throw new StampedCfdiParseError(
      `El XML timbrado no contiene el elemento ${localName}.`,
    );
  }

  return match[0];
}

function required(
  attributes: Record<string, string>,
  name: string,
  context: string,
): string {
  const value = attributes[name]?.trim();
  if (!value) {
    throw new StampedCfdiParseError(
      `El ${context} no contiene el atributo ${name}.`,
    );
  }
  return value;
}

function amount(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    throw new StampedCfdiParseError("El XML contiene un importe inválido.");
  }
  return parsed;
}

export function parseStampedCfdi(xml: string): StampedCfdi {
  const normalized = xml.trim();
  if (!normalized || /<!DOCTYPE/i.test(normalized) || /<!ENTITY/i.test(normalized)) {
    throw new StampedCfdiParseError("El XML fiscal no es válido o no es seguro.");
  }

  const root = parseAttributes(findTag(normalized, "Comprobante"));
  const issuer = parseAttributes(findTag(normalized, "Emisor"));
  const receiver = parseAttributes(findTag(normalized, "Receptor"));
  const stamp = parseAttributes(findTag(normalized, "TimbreFiscalDigital"));
  const conceptMatches = normalized.matchAll(
    /<(?:[\w.-]+:)?Concepto\b[^>]*(?:\/>|>)/gi,
  );
  const concepts = Array.from(conceptMatches, (match) => {
    const item = parseAttributes(match[0]);
    return {
      productServiceCode: required(item, "ClaveProdServ", "concepto"),
      unitCode: required(item, "ClaveUnidad", "concepto"),
      quantity: amount(item.Cantidad),
      description: required(item, "Descripcion", "concepto"),
      unitAmount: amount(item.ValorUnitario),
      amount: amount(item.Importe),
      discount: amount(item.Descuento),
      taxObject: required(item, "ObjetoImp", "concepto"),
    };
  });

  if (concepts.length === 0) {
    throw new StampedCfdiParseError("El CFDI no contiene conceptos.");
  }

  return {
    version: required(root, "Version", "comprobante"),
    series: root.Serie?.trim() || undefined,
    folio: root.Folio?.trim() || undefined,
    issuedAt: required(root, "Fecha", "comprobante"),
    currency: required(root, "Moneda", "comprobante"),
    subtotal: amount(root.SubTotal),
    discount: amount(root.Descuento),
    total: amount(required(root, "Total", "comprobante")),
    paymentForm: root.FormaPago?.trim() || undefined,
    paymentMethod: root.MetodoPago?.trim() || undefined,
    expeditionPostalCode: required(root, "LugarExpedicion", "comprobante"),
    certificateNumber: required(root, "NoCertificado", "comprobante"),
    issuerSeal: required(root, "Sello", "comprobante"),
    issuer: {
      taxId: required(issuer, "Rfc", "emisor"),
      legalName: required(issuer, "Nombre", "emisor"),
      taxRegime: required(issuer, "RegimenFiscal", "emisor"),
    },
    receiver: {
      taxId: required(receiver, "Rfc", "receptor"),
      legalName: required(receiver, "Nombre", "receptor"),
      taxRegime: required(receiver, "RegimenFiscalReceptor", "receptor"),
      postalCode: required(receiver, "DomicilioFiscalReceptor", "receptor"),
      cfdiUse: required(receiver, "UsoCFDI", "receptor"),
    },
    concepts,
    uuid: required(stamp, "UUID", "timbre fiscal"),
    stampedAt: required(stamp, "FechaTimbrado", "timbre fiscal"),
    certifierTaxId: required(stamp, "RfcProvCertif", "timbre fiscal"),
    satCertificateNumber: required(stamp, "NoCertificadoSAT", "timbre fiscal"),
    satSeal: required(stamp, "SelloSAT", "timbre fiscal"),
  };
}

export function buildSatVerificationUrl(cfdi: StampedCfdi): string {
  const url = new URL(
    "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx",
  );
  url.searchParams.set("id", cfdi.uuid);
  url.searchParams.set("re", cfdi.issuer.taxId);
  url.searchParams.set("rr", cfdi.receiver.taxId);
  url.searchParams.set("tt", cfdi.total.toFixed(6).padStart(17, "0"));
  url.searchParams.set("fe", cfdi.issuerSeal.slice(-8));
  return url.toString();
}
