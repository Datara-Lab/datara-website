export const petPromotionBenefits = ["Descuento (%)", "Descuento ($)", "Servicio gratis"];
export const petAutomationEntities = ["customer", "activity", "sales_order"];

export function petPromotionError(values: Record<string, unknown>): string | null {
  if (!petPromotionBenefits.includes(String(values.benefitType ?? ""))) return "En Pets selecciona descuento porcentual, descuento por importe o servicio gratis.";
  if (values.paymentMethod && values.paymentMethod !== "Contado" && values.paymentMethod !== "Ambos") return "Pets no utiliza condiciones de financiamiento en promociones.";
  if (Number(values.minimumDownPayment || 0) !== 0) return "El enganche no aplica a promociones de Pets.";
  if (Array.isArray(values.availableMonths) && values.availableMonths.length) return "Los meses de financiamiento no aplican a Pets.";
  if (values.benefitType === "Descuento (%)" && (!Number.isFinite(Number(values.value)) || Number(values.value) <= 0 || Number(values.value) > 100)) return "El descuento debe ser mayor que 0 y no superar 100%.";
  if (values.benefitType === "Descuento ($)" && (!Number.isFinite(Number(values.value)) || Number(values.value) <= 0)) return "El descuento por importe debe ser mayor que cero.";
  return null;
}
