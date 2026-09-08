import type { CRMIndustryTemplateConfig } from "@/types/crm-config";

export const petServicesTemplate: CRMIndustryTemplateConfig = {
  id: "veterinary",
  name: "Mascotas",
  description: "Operación para veterinarias, grooming, guarderías, pensiones, tiendas y centros integrales de mascotas.",
  terminology: {
    modules: {
      contacts: { singular: "Tutor", plural: "Tutores", description: "Personas responsables de las mascotas." },
      products: { singular: "Producto o servicio", plural: "Productos y servicios", description: "Servicios, paquetes y productos para mascotas." },
      deals: { singular: "Atención", plural: "Atenciones", description: "Seguimiento de ventas, citas, reservaciones y estancias." },
    },
    fields: {
      "contacts.name": "Nombre del tutor",
      "leads.productInterest": "Servicio de interés",
    },
  },
  defaultModules: ["products", "leads", "contacts", "deals", "activities", "services", "inventory", "documents", "promotions", "quotes", "sales-orders", "automations", "crm-analytics", "pet-veterinary", "pet-grooming", "pet-stays", "pet-store", "qr-codes"],
  defaultRoles: [
    {
      key: "pet_services_manager", name: "Responsable de centro", product: "crm",
      description: "Administra clientes, mascotas, agenda, servicios, estancias, productos y cobros.",
      permissions: ["products", "leads", "contacts", "deals", "activities", "services", "inventory", "documents", "promotions", "quotes", "sales-orders", "automations", "crm-analytics", "pet-veterinary", "pet-grooming", "pet-stays", "pet-store", "qr-codes"].map((moduleId) => ({ moduleId, canView: true, canCreate: true, canEdit: true })),
    },
    {
      key: "pet_care_staff", name: "Personal de atención", product: "crm",
      description: "Consulta tutores y mascotas, gestiona agenda, check-in, servicios y seguimiento.",
      permissions: ["products", "contacts", "deals", "activities", "services", "documents", "sales-orders", "pet-veterinary", "pet-grooming", "pet-stays", "qr-codes"].map((moduleId) => ({ moduleId, canView: true, canCreate: true, canEdit: true })),
    },
  ],
  defaultProductTypes: [
    { key: "pet_service", name: "Servicio para mascota", inventoryTracked: false, technicalProfile: null, sortOrder: 10, categories: ["Consulta", "Grooming", "Guardería", "Pensión", "Transporte"], technicalFields: [
      { key: "durationHours", label: "Horas incluidas", type: "number", required: false, active: true, sortOrder: 10, placeholder: "1, 5, 12…" },
      { key: "durationNights", label: "Noches incluidas", type: "number", required: false, active: true, sortOrder: 20, placeholder: "1, 2, 3…" },
    ] },
    { key: "stay_package", name: "Paquete de estancias", inventoryTracked: false, technicalProfile: null, sortOrder: 20, categories: ["Guardería", "Pensión", "Ambos"], technicalFields: [
      { key: "packageUnitType", label: "Cada uso descuenta", type: "select", required: true, active: true, sortOrder: 10, options: ["Día", "Noche", "Acceso"] },
      { key: "includedUnits", label: "Cantidad incluida", type: "number", required: true, active: true, sortOrder: 20, placeholder: "10" },
      { key: "validityDays", label: "Vigencia después de la compra (días)", type: "number", required: false, active: true, sortOrder: 30, placeholder: "90" },
      { key: "transferableBetweenPets", label: "¿Se puede compartir?", type: "select", required: true, active: true, sortOrder: 40, options: ["Sí", "No"] },
      { key: "includedHours", label: "Horas incluidas por acceso o día", type: "number", required: false, active: true, sortOrder: 50, placeholder: "5" },
      { key: "overagePolicy", label: "Al exceder las horas incluidas", type: "select", required: true, active: true, sortOrder: 70, options: ["Descontar otra unidad", "Cobrar el excedente"] },
    ] },
    { key: "pet_product", name: "Producto para mascota", inventoryTracked: true, technicalProfile: null, sortOrder: 30, categories: ["Alimento", "Higiene", "Accesorio", "Salud", "Juguete"] },
  ],
  defaultCatalogs: {
    "products.category": ["Consulta", "Vacunación", "Grooming", "Guardería", "Pensión", "Paquete de días", "Paquete de noches", "Alimento", "Accesorio", "Transporte"].map((value) => ({ label: value, value })),
    "deals.stage": ["Solicitud recibida", "Necesidades confirmadas", "Reservación confirmada", "Check-in", "En servicio", "Servicio completado", "Cancelado"].map((value) => ({ label: value, value })),
  },
};
