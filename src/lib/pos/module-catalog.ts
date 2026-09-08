export const POS_CORE_MODULE_IDS = [
  "pos-terminal",
  "pos-cash",
  "pos-catalog",
  "pos-inventory",
  "pos-reports",
  "pos-settings",
] as const;

export type POSModuleId =
  (typeof POS_CORE_MODULE_IDS)[number];

export const POS_MODULES: Record<
  POSModuleId,
  {
    id: POSModuleId;
    name: string;
    description: string;
  }
> = {
  "pos-terminal": {
    id: "pos-terminal",
    name: "Punto de venta",
    description: "Carrito, órdenes pendientes, cobro y tickets.",
  },
  "pos-cash": {
    id: "pos-cash",
    name: "Caja",
    description: "Apertura, movimientos, arqueo y cierre.",
  },
  "pos-catalog": {
    id: "pos-catalog",
    name: "Catálogo",
    description: "Productos, servicios, precios y códigos de barras.",
  },
  "pos-inventory": {
    id: "pos-inventory",
    name: "Inventario",
    description: "Existencias y movimientos ligados a las ventas.",
  },
  "pos-reports": {
    id: "pos-reports",
    name: "Reportes",
    description: "Ventas, pagos, cortes y diferencias de caja.",
  },
  "pos-settings": {
    id: "pos-settings",
    name: "Configuración",
    description: "Terminales, recibos, métodos de pago y reglas.",
  },
};

export function isPOSModuleId(value: unknown): value is POSModuleId {
  return (
    typeof value === "string" &&
    POS_CORE_MODULE_IDS.some((moduleId) => moduleId === value)
  );
}
