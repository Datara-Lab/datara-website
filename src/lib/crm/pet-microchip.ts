/** Ausencia de microchip no es un identificador y nunca debe participar en unicidad. */
export function normalizePetMicrochip(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const absence = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  return ["", "no", "sin microchip", "sin chip", "no tiene", "ninguno", "n/a", "no aplica"].includes(absence) ? null : text;
}

export function isDuplicatePetMicrochip(error: unknown): boolean {
  let current = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (record.code === "23505" && record.constraint === "crm_pets_tenant_microchip_unique") return true;
    current = record.cause;
  }
  return false;
}
