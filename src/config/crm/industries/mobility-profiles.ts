export const mobilityProfileIds = [
  "motorcycle",
  "bicycle",
  "scooter",
] as const;

export type MobilityProfileId =
  (typeof mobilityProfileIds)[number];

type MobilityStage = {
  label: string;
  value: string;
};

export type MobilityProfile = {
  id: MobilityProfileId;
  name: string;
  shortDescription: string;
  vehicleSingular: string;
  vehiclePlural: string;
  agencyName: string;
  catalogDescription: string;
  inventoryDescription: string;
  serviceDescription: string;
  productInterestLabel: string;
  productInterestDescription: string;
  productInterestPlaceholder: string;
  modelCategories: string[];
  accessoryCategories: string[];
  serviceCategories: string[];
  stages: MobilityStage[];
};

const closingStages: MobilityStage[] = [
  { label: "Cotización", value: "Cotización" },
  { label: "Negociación", value: "Negociación" },
  { label: "Venta ganada", value: "Venta ganada" },
  { label: "Venta perdida", value: "Venta perdida" },
];

export const mobilityProfiles: Record<
  MobilityProfileId,
  MobilityProfile
> = {
  motorcycle: {
    id: "motorcycle",
    name: "Motocicletas",
    shortDescription:
      "Ventas, inventario por unidad, financiamiento, entregas y taller para agencias de motocicletas.",
    vehicleSingular: "motocicleta",
    vehiclePlural: "motocicletas",
    agencyName: "Agencia de motocicletas",
    catalogDescription:
      "Modelos, accesorios, refacciones y servicios para motocicletas.",
    inventoryDescription: "Motocicletas disponibles por sucursal.",
    serviceDescription: "Atención de taller y servicios para motocicletas.",
    productInterestLabel: "Modelo de interés",
    productInterestDescription:
      "Modelo de motocicleta por el que se interesó el prospecto.",
    productInterestPlaceholder: "Buscar una motocicleta",
    modelCategories: [
      "Urbana", "Trabajo", "Naked", "Deportiva", "Touring",
      "Cruiser", "Adventure", "Doble propósito", "Enduro",
      "Motocross", "Scooter", "Eléctrica", "ATV", "Otro",
    ],
    accessoryCategories: [
      "Cascos", "Guantes", "Protección", "Refacciones",
      "Accesorios", "Llantas", "Lubricantes",
    ],
    serviceCategories: [
      "Mantenimiento preventivo", "Reparación", "Diagnóstico",
      "Instalación de accesorios", "Garantía",
    ],
    stages: [
      { label: "Prospecto", value: "Prospecto" },
      { label: "Contactado", value: "Contactado" },
      { label: "Prueba de manejo agendada", value: "Prueba de manejo agendada" },
      { label: "Prueba de manejo realizada", value: "Prueba de manejo realizada" },
      ...closingStages,
    ],
  },
  bicycle: {
    id: "bicycle",
    name: "Bicicletas",
    shortDescription:
      "Catálogo, tallas, inventario, apartados, entregas y taller para tiendas y agencias de bicicletas.",
    vehicleSingular: "bicicleta",
    vehiclePlural: "bicicletas",
    agencyName: "Tienda o agencia de bicicletas",
    catalogDescription:
      "Bicicletas, componentes, accesorios, equipamiento y servicios de taller.",
    inventoryDescription: "Bicicletas disponibles por sucursal.",
    serviceDescription: "Taller, ajustes y mantenimiento para bicicletas.",
    productInterestLabel: "Bicicleta de interés",
    productInterestDescription:
      "Modelo de bicicleta por el que se interesó el prospecto.",
    productInterestPlaceholder: "Buscar una bicicleta",
    modelCategories: [
      "Montaña", "Ruta", "Gravel", "Urbana", "BMX", "Infantil",
      "Eléctrica", "Plegable", "Híbrida", "Triatlón", "Carga", "Otro",
    ],
    accessoryCategories: [
      "Cascos", "Protección", "Componentes", "Refacciones",
      "Accesorios", "Ropa y calzado", "Herramientas", "Nutrición",
    ],
    serviceCategories: [
      "Afinación", "Mantenimiento preventivo", "Reparación",
      "Ajuste y armado", "Instalación de componentes", "Garantía",
    ],
    stages: [
      { label: "Prospecto", value: "Prospecto" },
      { label: "Necesidad identificada", value: "Necesidad identificada" },
      { label: "Prueba o ajuste agendado", value: "Prueba o ajuste agendado" },
      { label: "Modelo seleccionado", value: "Modelo seleccionado" },
      ...closingStages,
    ],
  },
  scooter: {
    id: "scooter",
    name: "Scooters y movilidad eléctrica",
    shortDescription:
      "Venta, inventario por serie, pruebas, financiamiento y servicio para movilidad urbana eléctrica.",
    vehicleSingular: "scooter",
    vehiclePlural: "scooters",
    agencyName: "Agencia de scooters y movilidad eléctrica",
    catalogDescription:
      "Scooters, vehículos de movilidad eléctrica, accesorios, refacciones y servicios.",
    inventoryDescription: "Scooters y unidades eléctricas disponibles por sucursal.",
    serviceDescription: "Diagnóstico, mantenimiento y soporte de movilidad eléctrica.",
    productInterestLabel: "Unidad de interés",
    productInterestDescription:
      "Scooter o unidad de movilidad por la que se interesó el prospecto.",
    productInterestPlaceholder: "Buscar un scooter",
    modelCategories: [
      "Scooter urbano", "Scooter premium", "Motoneta eléctrica",
      "Patín eléctrico", "Triciclo eléctrico", "Carga y reparto",
      "Movilidad personal", "Otro",
    ],
    accessoryCategories: [
      "Cascos", "Protección", "Baterías", "Cargadores", "Refacciones",
      "Accesorios", "Llantas", "Seguridad",
    ],
    serviceCategories: [
      "Diagnóstico eléctrico", "Mantenimiento preventivo", "Reparación",
      "Cambio de batería", "Actualización y configuración", "Garantía",
    ],
    stages: [
      { label: "Prospecto", value: "Prospecto" },
      { label: "Necesidad identificada", value: "Necesidad identificada" },
      { label: "Demostración agendada", value: "Demostración agendada" },
      { label: "Prueba realizada", value: "Prueba realizada" },
      ...closingStages,
    ],
  },
};

export function isMobilityProfileId(
  value: unknown,
): value is MobilityProfileId {
  return typeof value === "string" &&
    mobilityProfileIds.includes(value as MobilityProfileId);
}

export function resolveMobilityProfile(
  value: unknown,
): MobilityProfile {
  return mobilityProfiles[isMobilityProfileId(value) ? value : "motorcycle"];
}
