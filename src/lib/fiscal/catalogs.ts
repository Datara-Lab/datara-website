export const SAT_TAX_REGIMES = [
  { value: "601", label: "601 · General de Ley Personas Morales" },
  { value: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 · Sueldos y Salarios" },
  { value: "606", label: "606 · Arrendamiento" },
  { value: "608", label: "608 · Demás ingresos" },
  { value: "612", label: "612 · Personas Físicas con Actividades Empresariales y Profesionales" },
  { value: "616", label: "616 · Sin obligaciones fiscales" },
  { value: "621", label: "621 · Incorporación Fiscal" },
  { value: "625", label: "625 · Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { value: "626", label: "626 · Régimen Simplificado de Confianza" },
] as const;

export const SAT_CFDI_USES = [
  { value: "G01", label: "G01 · Adquisición de mercancías" },
  { value: "G02", label: "G02 · Devoluciones, descuentos o bonificaciones" },
  { value: "G03", label: "G03 · Gastos en general" },
  { value: "I01", label: "I01 · Construcciones" },
  { value: "I02", label: "I02 · Mobiliario y equipo de oficina" },
  { value: "I03", label: "I03 · Equipo de transporte" },
  { value: "I04", label: "I04 · Equipo de cómputo y accesorios" },
  { value: "I08", label: "I08 · Otra maquinaria y equipo" },
  { value: "S01", label: "S01 · Sin efectos fiscales" },
  { value: "CP01", label: "CP01 · Pagos" },
  { value: "CN01", label: "CN01 · Nómina" },
] as const;

export const SAT_UNIT_CODES = [
  { value: "H87", label: "H87 · Pieza" },
  { value: "E48", label: "E48 · Unidad de servicio" },
  { value: "ACT", label: "ACT · Actividad" },
  { value: "EA", label: "EA · Elemento" },
  { value: "KGM", label: "KGM · Kilogramo" },
  { value: "LTR", label: "LTR · Litro" },
  { value: "MTR", label: "MTR · Metro" },
  { value: "DAY", label: "DAY · Día" },
] as const;

export const SAT_TAX_OBJECTS = [
  { value: "01", label: "01 · No objeto de impuesto" },
  { value: "02", label: "02 · Sí objeto de impuesto" },
  { value: "03", label: "03 · Sí objeto de impuesto, sin desglose" },
  { value: "04", label: "04 · Sí objeto de impuesto y no causa impuesto" },
] as const;

export const SAT_TRANSFERRED_TAXES = [
  { value: "001", label: "001 · ISR" },
  { value: "002", label: "002 · IVA" },
  { value: "003", label: "003 · IEPS" },
] as const;

export const SAT_FACTOR_TYPES = [
  { value: "Tasa", label: "Tasa" },
  { value: "Cuota", label: "Cuota" },
  { value: "Exento", label: "Exento" },
] as const;

export function isSatCatalogValue<T extends readonly { value: string }[]>(
  catalog: T,
  value: string | undefined,
): boolean {
  return !value || catalog.some((item) => item.value === value);
}

export function normalizeMexicanTaxId(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function isValidMexicanTaxId(value: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalizeMexicanTaxId(value));
}

export function isValidMexicanPostalCode(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}
