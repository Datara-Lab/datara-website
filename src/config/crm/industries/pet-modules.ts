export const petModuleIds = ["pet-veterinary", "pet-grooming", "pet-stays", "pet-store"] as const;
export type PetModuleId = (typeof petModuleIds)[number];
export type PetModuleDefinition = { id: PetModuleId; name: string; shortDescription: string; capabilities: string[] };

export const petModules: Record<PetModuleId, PetModuleDefinition> = {
  "pet-veterinary": { id: "pet-veterinary", name: "Veterinaria", shortDescription: "Expedientes, consultas, vacunas, tratamientos, recetas y seguimiento clínico.", capabilities: ["Expediente por mascota", "Vacunas y tratamientos", "Agenda clínica"] },
  "pet-grooming": { id: "pet-grooming", name: "Grooming y estética", shortDescription: "Agenda, preferencias, paquetes, evidencias y servicios recurrentes.", capabilities: ["Agenda de grooming", "Preferencias por mascota", "Paquetes y recurrencia"] },
  "pet-stays": { id: "pet-stays", name: "Guardería y pensión", shortDescription: "Reservaciones, disponibilidad, check-in/out y paquetes de días o noches.", capabilities: ["Reservaciones y aforo", "Check-in y check-out", "Paquetes con saldo automático"] },
  "pet-store": { id: "pet-store", name: "Tienda de mascotas", shortDescription: "Catálogo, inventario, ventas, promociones, facturación y recompra.", capabilities: ["Catálogo e inventario", "Ventas y facturación", "Promociones y lealtad"] },
};

export const petIntegratedPackage = {
  id: "pet-integrated",
  name: "Centro integral",
  moduleIds: petModuleIds,
  shortDescription: "Activa todos los módulos sobre una sola base de tutores, mascotas y operación.",
} as const;

export function isPetModuleId(value: unknown): value is PetModuleId {
  return typeof value === "string" && petModuleIds.includes(value as PetModuleId);
}
