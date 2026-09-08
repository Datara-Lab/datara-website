import { legalBundleVersion } from "@/lib/legal/legal-documents";
export class ServiceCommerceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const serviceStages = {
  awaiting_quote: "Cotización en preparación", awaiting_payment: "Pendiente de pago",
  paid: "Pago confirmado", in_progress: "En desarrollo", review: "En revisión",
  delivered: "Entregado", cancelled: "Cancelado",
} as const;
export const billingLabels: Record<string, string> = { unpaid: "Sin pago", paid: "Pagado", active: "Mensualidad activa", past_due: "Pago pendiente", unpaid_subscription: "Mensualidad vencida", canceled: "Mensualidad cancelada", incomplete: "Pago incompleto", incomplete_expired: "Pago vencido", trialing: "Periodo de prueba", paused: "Pausada" };
export function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new ServiceCommerceError("Solicitud no válida.");
  return value as Record<string, unknown>;
}
export function textValue(value: unknown, label: string, max: number, optional = false): string {
  if (optional && (value === undefined || value === null || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ServiceCommerceError(`${label} no es válido.`);
  return value.trim();
}
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ServiceCommerceError("Identificador no válido.");
  return value;
}
export function money(value: unknown): string {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) throw new ServiceCommerceError("Importe no válido.");
  return Number(value).toFixed(2);
}
export function parseRequest(value: unknown) {
  const v = record(value, ["id", "catalogItemId", "companyName", "phone", "brief"]);
  return { id: uuid(v.id), catalogItemId: uuid(v.catalogItemId), companyName: textValue(v.companyName, "La empresa", 200), phone: textValue(v.phone, "El teléfono", 40, true), brief: textValue(v.brief, "La descripción del proyecto", 5000) };
}
export function parseAcceptance(value: unknown) {
  const v = record(value, ["version", "legalBundleVersion", "documentsAccepted", "recurringChargesAccepted"]);
  if (!Number.isInteger(v.version) || Number(v.version) < 1 || v.legalBundleVersion !== legalBundleVersion || v.documentsAccepted !== true || typeof v.recurringChargesAccepted !== "boolean") throw new ServiceCommerceError("Revisa y acepta la cotización y los términos vigentes.");
  return { version: Number(v.version), recurringChargesAccepted: v.recurringChargesAccepted };
}
export function parseAdminUpdate(value: unknown) {
  const v = record(value, ["id", "version", "action", "oneTimePrice", "monthlyPrice", "scope", "status", "publicUpdate", "deliveryUrl"]);
  const id = uuid(v.id);
  if (!Number.isInteger(v.version) || Number(v.version) < 1) throw new ServiceCommerceError("Versión no válida.");
  if (v.action === "quote") {
    const oneTimePrice = money(v.oneTimePrice), monthlyPrice = money(v.monthlyPrice);
    if (Number(oneTimePrice) + Number(monthlyPrice) <= 0) throw new ServiceCommerceError("La cotización debe tener un importe mayor a cero.");
    return { id, version: Number(v.version), action: "quote" as const, oneTimePrice, monthlyPrice, scope: textValue(v.scope, "El alcance", 12000) };
  }
  if (v.action !== "progress" || !["in_progress", "review", "delivered", "cancelled"].includes(String(v.status))) throw new ServiceCommerceError("Estado no válido.");
  const deliveryUrl = textValue(v.deliveryUrl, "El enlace de entrega", 2000, true);
  if (deliveryUrl) { try { const url = new URL(deliveryUrl); if (url.protocol !== "https:" || url.username || url.password) throw Error(); } catch { throw new ServiceCommerceError("Utiliza un enlace HTTPS válido."); } }
  return { id, version: Number(v.version), action: "progress" as const, status: String(v.status), publicUpdate: textValue(v.publicUpdate, "La actualización", 5000, true), deliveryUrl };
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new ServiceCommerceError("Origen no permitido.", 403);
}
