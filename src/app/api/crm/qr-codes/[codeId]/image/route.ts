import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { entityQrCodes } from "@/db/schema";
import { createQrApiErrorResponse, getQrApiContext, QrApiError } from "@/lib/qr/api-context";
import { buildQrScanPayload } from "@/lib/qr/runtime";

type RouteContext = { params: Promise<{ codeId: string }> };
function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}
export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantId } = await getQrApiContext("view");
    const { codeId } = await context.params;
    const [code] = await db.select().from(entityQrCodes).where(and(
      eq(entityQrCodes.id, codeId), eq(entityQrCodes.tenantId, tenantId), eq(entityQrCodes.status, "active"),
    )).limit(1);
    if (!code) throw new QrApiError("No se encontró un identificador activo.", 404);
    const dataUrl = await QRCode.toDataURL(buildQrScanPayload(code.publicToken), {
      width: 600, margin: 4, errorCorrectionLevel: "H",
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    const title = escapeXml((code.label ?? "Identificador Datara").slice(0, 60));
    const compact = new URL(request.url).searchParams.get("compact") === "1";
    const height = compact ? 760 : 850;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}">
      <rect width="760" height="${height}" fill="white"/>
      <rect x="12" y="12" width="736" height="736" rx="24" fill="white" stroke="#e2e8f0" stroke-width="2"/>
      <image href="${dataUrl}" x="80" y="80" width="600" height="600"/>
      ${compact ? "" : `<text x="380" y="798" text-anchor="middle" font-family="Arial,sans-serif" font-size="${title.length > 30 ? 20 : 28}" font-weight="600" fill="#0f172a">${title}</text>
      <text x="380" y="831" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#64748b">Datara · Identificador permanente</text>`}
    </svg>`;
    return new Response(svg, { headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="datara-qr-${code.id}.svg"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    return createQrApiErrorResponse(error, "No fue posible generar la imagen QR.");
  }
}
