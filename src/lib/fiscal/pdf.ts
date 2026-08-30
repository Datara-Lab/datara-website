import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

import {
  buildSatVerificationUrl,
  parseStampedCfdi,
  type StampedCfdi,
} from "@/lib/fiscal/stamped-cfdi";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 38;
const QR_SIZE = 82;
const navy = rgb(0.035, 0.075, 0.17);
const slate = rgb(0.30, 0.35, 0.43);
const pale = rgb(0.95, 0.97, 0.98);
const emerald = rgb(0.02, 0.58, 0.38);

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value);
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(",")[1];
  if (!encoded) throw new Error("No fue posible generar el QR fiscal.");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function generateFiscalPdf(xml: string): Promise<{
  bytes: Uint8Array;
  cfdi: StampedCfdi;
  verificationUrl: string;
}> {
  const cfdi = parseStampedCfdi(xml);
  const verificationUrl = buildSatVerificationUrl(cfdi);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#020617", light: "#FFFFFF" },
  });
  const document = await PDFDocument.create();
  document.setTitle(`CFDI ${cfdi.series ?? ""}${cfdi.folio ?? cfdi.uuid}`);
  document.setAuthor(cfdi.issuer.legalName);
  document.setSubject("Representación impresa de CFDI 4.0");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const qr = await document.embedPng(dataUrlBytes(qrDataUrl));
  let page!: PDFPage;
  let y = 0;

  function addPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH, height: 7, color: emerald });
    page.drawText("DATARA", { x: MARGIN, y: y - 6, size: 10, font: bold, color: emerald });
    page.drawText("COMPROBANTE FISCAL DIGITAL", { x: MARGIN, y: y - 27, size: 16, font: bold, color: navy });
    page.drawText(`CFDI ${cfdi.version}`, { x: PAGE_WIDTH - MARGIN - 55, y: y - 24, size: 9, font: bold, color: slate });
    y -= 48;
  }

  function ensure(height: number) {
    if (y - height < 72) addPage();
  }

  function text(value: string, x: number, size = 8, font = regular, color = navy, maxWidth = PAGE_WIDTH - MARGIN * 2) {
    const lines = wrap(value || "—", font, size, maxWidth);
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color });
      y -= size + 3;
    }
  }

  function label(value: string) {
    page.drawText(value.toUpperCase(), { x: MARGIN, y, size: 6.5, font: bold, color: slate });
    y -= 11;
  }

  function section(value: string) {
    ensure(30);
    y -= 7;
    page.drawRectangle({ x: MARGIN, y: y - 4, width: PAGE_WIDTH - MARGIN * 2, height: 21, color: pale });
    page.drawText(value.toUpperCase(), { x: MARGIN + 8, y: y + 3, size: 7.5, font: bold, color: navy });
    y -= 26;
  }

  addPage();
  const headerTop = y;
  page.drawRectangle({ x: MARGIN, y: y - 68, width: PAGE_WIDTH - MARGIN * 2, height: 68, borderColor: pale, borderWidth: 1 });
  page.drawText("FOLIO FISCAL (UUID)", { x: MARGIN + 10, y: y - 15, size: 6.5, font: bold, color: slate });
  page.drawText(cfdi.uuid, { x: MARGIN + 10, y: y - 29, size: 10, font: bold, color: navy });
  const displayFolio = [cfdi.series, cfdi.folio].filter(Boolean).join("-") || "Sin folio interno";
  page.drawText(`Serie / folio: ${displayFolio}`, { x: MARGIN + 10, y: y - 47, size: 8, font: regular, color: slate });
  page.drawText(`Fecha de emisión: ${cfdi.issuedAt}`, { x: MARGIN + 245, y: y - 47, size: 8, font: regular, color: slate });
  y = headerTop - 78;

  section("Emisor");
  label("Nombre o razón social"); text(cfdi.issuer.legalName, MARGIN, 9, bold);
  label("RFC · Régimen fiscal · Lugar de expedición");
  text(`${cfdi.issuer.taxId}  ·  ${cfdi.issuer.taxRegime}  ·  C.P. ${cfdi.expeditionPostalCode}`, MARGIN);

  section("Receptor");
  label("Nombre o razón social"); text(cfdi.receiver.legalName, MARGIN, 9, bold);
  label("RFC · Régimen fiscal · Domicilio fiscal · Uso CFDI");
  text(`${cfdi.receiver.taxId}  ·  ${cfdi.receiver.taxRegime}  ·  C.P. ${cfdi.receiver.postalCode}  ·  ${cfdi.receiver.cfdiUse}`, MARGIN);

  section("Conceptos");
  for (const concept of cfdi.concepts) {
    ensure(54);
    text(concept.description, MARGIN, 8.5, bold, navy, 285);
    page.drawText(`${concept.productServiceCode} · ${concept.unitCode} · Objeto imp. ${concept.taxObject}`, { x: MARGIN, y, size: 6.5, font: regular, color: slate });
    page.drawText(`${concept.quantity} × ${money(concept.unitAmount, cfdi.currency)}`, { x: 350, y: y + 12, size: 7.5, font: regular, color: slate });
    const itemTotal = money(concept.amount - concept.discount, cfdi.currency);
    page.drawText(itemTotal, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(itemTotal, 8.5), y: y + 12, size: 8.5, font: bold, color: navy });
    y -= 16;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: pale });
    y -= 9;
  }

  ensure(180);
  section("Totales y datos fiscales");
  const totalsX = 355;
  const totalRows: Array<[string, string]> = [
    ["Subtotal", money(cfdi.subtotal, cfdi.currency)],
    ...(cfdi.discount ? [["Descuento", money(cfdi.discount, cfdi.currency)] as [string, string]] : []),
    ["Total", `${money(cfdi.total, cfdi.currency)} ${cfdi.currency}`],
  ];
  for (const [name, value] of totalRows) {
    page.drawText(name, { x: totalsX, y, size: name === "Total" ? 9 : 8, font: name === "Total" ? bold : regular, color: slate });
    page.drawText(value, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(value, name === "Total" ? 10 : 8), y, size: name === "Total" ? 10 : 8, font: bold, color: navy });
    y -= 17;
  }
  y -= 3;
  text(`Forma de pago: ${cfdi.paymentForm ?? "—"}  ·  Método de pago: ${cfdi.paymentMethod ?? "—"}`, MARGIN, 7.5, regular, slate);

  ensure(210);
  section("Timbre fiscal digital");
  const qrY = y - QR_SIZE;
  page.drawImage(qr, { x: MARGIN, y: qrY, width: QR_SIZE, height: QR_SIZE });
  const fiscalX = MARGIN + QR_SIZE + 14;
  const fiscalWidth = PAGE_WIDTH - MARGIN - fiscalX;
  let fiscalY = y;
  const detailRows = [
    `Fecha de timbrado: ${cfdi.stampedAt}`,
    `RFC proveedor de certificación: ${cfdi.certifierTaxId}`,
    `No. certificado emisor: ${cfdi.certificateNumber}`,
    `No. certificado SAT: ${cfdi.satCertificateNumber}`,
  ];
  for (const detail of detailRows) {
    page.drawText(detail, { x: fiscalX, y: fiscalY, size: 7, font: regular, color: slate, maxWidth: fiscalWidth });
    fiscalY -= 13;
  }
  page.drawText("Verificación SAT", { x: fiscalX, y: fiscalY, size: 7, font: bold, color: navy });
  fiscalY -= 10;
  for (const line of wrap(verificationUrl, regular, 5.5, fiscalWidth)) {
    page.drawText(line, { x: fiscalX, y: fiscalY, size: 5.5, font: regular, color: slate });
    fiscalY -= 8;
  }
  y = Math.min(qrY, fiscalY) - 14;
  label("Sello digital del CFDI"); text(cfdi.issuerSeal, MARGIN, 5.5, regular, slate);
  label("Sello digital del SAT"); text(cfdi.satSeal, MARGIN, 5.5, regular, slate);

  const pages = document.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: PAGE_WIDTH - MARGIN, y: 48 }, thickness: 0.5, color: pale });
    current.drawText("Este documento es una representación impresa de un CFDI.", { x: MARGIN, y: 31, size: 6.5, font: regular, color: slate });
    const number = `Página ${index + 1} de ${pages.length}`;
    current.drawText(number, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(number, 6.5), y: 31, size: 6.5, font: regular, color: slate });
  });

  return { bytes: await document.save(), cfdi, verificationUrl };
}
