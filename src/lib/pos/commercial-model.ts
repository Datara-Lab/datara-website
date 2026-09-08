export const EMBEDDED_CHECKOUT_MODULE_ID =
  "embedded-checkout" as const;

export const EMBEDDED_CHECKOUT_TRIGGER_MODULE_IDS = [
  "sales-orders",
  "services",
  "pet-veterinary",
  "pet-grooming",
  "pet-stays",
  "pet-store",
] as const;

export const POS_FULL_LICENSE_MODULE_IDS = [
  "pos-terminal",
  "pos-cash",
  "pos-catalog",
  "pos-inventory",
  "pos-reports",
  "pos-settings",
] as const;

export function requiresEmbeddedCheckout(
  moduleIds: Iterable<string>,
): boolean {
  const selected = new Set(moduleIds);

  return EMBEDDED_CHECKOUT_TRIGGER_MODULE_IDS.some(
    (moduleId) => selected.has(moduleId),
  );
}
