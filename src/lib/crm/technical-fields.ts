import type {
  CRMFieldConfig,
  CRMFieldType,
} from "@/types/crm-config";

export const technicalFieldTypes = [
  "text",
  "textarea",
  "number",
  "select",
] as const;

export type TechnicalFieldType =
  (typeof technicalFieldTypes)[number];

export type TechnicalFieldDefinition = {
  key: string;
  label: string;
  type: TechnicalFieldType;
  required: boolean;
  active: boolean;
  sortOrder: number;
  placeholder?: string;
  options?: string[];
};

export const defaultMobilityTechnicalFields: TechnicalFieldDefinition[] = [
  { key: "modelYear", label: "Año del modelo", type: "number", required: false, active: true, sortOrder: 10, placeholder: "2026" },
  { key: "colors", label: "Colores disponibles", type: "text", required: false, active: true, sortOrder: 20, placeholder: "Negro, azul, rojo" },
  { key: "engine", label: "Motor o sistema de propulsión", type: "text", required: false, active: true, sortOrder: 30 },
  { key: "displacement", label: "Cilindrada, batería o capacidad", type: "text", required: false, active: true, sortOrder: 40 },
  { key: "power", label: "Potencia", type: "text", required: false, active: true, sortOrder: 50 },
  { key: "transmission", label: "Transmisión", type: "text", required: false, active: true, sortOrder: 60 },
  { key: "loadCapacity", label: "Capacidad de carga", type: "text", required: false, active: true, sortOrder: 70 },
  { key: "passengerCapacity", label: "Capacidad de pasajeros", type: "text", required: false, active: true, sortOrder: 80 },
  { key: "warranty", label: "Garantía", type: "text", required: false, active: true, sortOrder: 90 },
];

function normalizeKey(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

export function sanitizeTechnicalFields(
  value: unknown,
  fallback: TechnicalFieldDefinition[] = [],
): TechnicalFieldDefinition[] {
  if (!Array.isArray(value)) return fallback.map((field) => ({ ...field }));

  const keys = new Set<string>();
  const fields: TechnicalFieldDefinition[] = [];

  for (const [index, candidate] of value.entries()) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    const key = normalizeKey(typeof record.key === "string" ? record.key : "");
    const label = typeof record.label === "string" ? record.label.trim().slice(0, 100) : "";
    if (!key || !label || keys.has(key)) continue;
    keys.add(key);
    const type = technicalFieldTypes.includes(record.type as TechnicalFieldType)
      ? record.type as TechnicalFieldType
      : "text";
    fields.push({
      key,
      label,
      type,
      required: record.required === true,
      active: record.active !== false,
      sortOrder: Number.isInteger(record.sortOrder) && Number(record.sortOrder) >= 0
        ? Number(record.sortOrder)
        : (index + 1) * 10,
      placeholder: typeof record.placeholder === "string" ? record.placeholder.trim().slice(0, 150) || undefined : undefined,
      options: type === "select" && Array.isArray(record.options)
        ? record.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter(Boolean).slice(0, 50)
        : undefined,
    });
  }

  return fields.sort((first, second) => first.sortOrder - second.sortOrder);
}

export function getTechnicalFieldsFromMetadata(
  metadata: unknown,
  technicalProfile?: string | null,
): TechnicalFieldDefinition[] {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  return sanitizeTechnicalFields(
    record.technicalFields,
    technicalProfile ? defaultMobilityTechnicalFields : [],
  );
}

export function buildTechnicalCRMFields(
  productTypes: Array<{
    id: string;
    technicalFields: TechnicalFieldDefinition[];
  }>,
): CRMFieldConfig[] {
  const definitions = new Map<string, {
    field: TechnicalFieldDefinition;
    typeIds: string[];
  }>();

  for (const productType of productTypes) {
    for (const field of productType.technicalFields.filter((item) => item.active)) {
      const formKey = `technical__${field.key}`;
      const existing = definitions.get(formKey);
      if (existing) {
        existing.typeIds.push(productType.id);
      } else {
        definitions.set(formKey, { field, typeIds: [productType.id] });
      }
    }
  }

  return [...definitions.entries()].map(([key, definition], index) => ({
    key,
    label: definition.field.label,
    type: definition.field.type as CRMFieldType,
    required: definition.field.required,
    placeholder: definition.field.placeholder,
    options: definition.field.options?.map((option) => ({ label: option, value: option })),
    showInForm: true,
    showInDetail: true,
    formSectionId: "technical-specifications",
    formRow: Math.floor(index / 2) + 1,
    formColumn: (index % 2) + 1 as 1 | 2,
    visibleWhen: { fieldKey: "productTypeId", in: definition.typeIds },
  }));
}
