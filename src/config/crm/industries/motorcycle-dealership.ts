import type {
  CRMIndustryTemplateConfig,
} from "@/types/crm-config";

export const motorcycleDealershipTemplate:
  CRMIndustryTemplateConfig = {
  id: "motorcycle_dealership",

  name: "Agencia de motocicletas",

  description:
    "Configuración inicial para empresas dedicadas a la venta y servicio de motocicletas.",

  defaultModules: [
    "products",
    "leads",
    "contacts",
    "deals",
    "activities",
    "promotions",
    "quotes",
    "inventory",
    "sales",
    "services",
    "follow-ups",
  ],

  defaultCatalogs: {
  "products.category": [
    {
      label: "Motocicleta urbana",
      value: "Motocicleta urbana",
    },
    {
      label: "Motocicleta de trabajo",
      value: "Motocicleta de trabajo",
    },
    {
      label: "Naked",
      value: "Naked",
    },
    {
      label: "Deportiva",
      value: "Deportiva",
    },
    {
      label: "Sport touring",
      value: "Sport touring",
    },
    {
      label: "Touring",
      value: "Touring",
    },
    {
      label: "Cruiser",
      value: "Cruiser",
    },
    {
      label: "Adventure",
      value: "Adventure",
    },
    {
      label: "Doble propósito",
      value: "Doble propósito",
    },
    {
      label: "Enduro",
      value: "Enduro",
    },
    {
      label: "Motocross",
      value: "Motocross",
    },
    {
      label: "Supermoto",
      value: "Supermoto",
    },
    {
      label: "Scooter",
      value: "Scooter",
    },
    {
      label: "Maxi scooter",
      value: "Maxi scooter",
    },
    {
      label: "Semiautomática",
      value: "Semiautomática",
    },
    {
      label: "Café racer",
      value: "Café racer",
    },
    {
      label: "Scrambler",
      value: "Scrambler",
    },
    {
      label: "Bobber",
      value: "Bobber",
    },
    {
      label: "Chopper",
      value: "Chopper",
    },
    {
      label: "Eléctrica",
      value: "Eléctrica",
    },
    {
      label: "Triciclo",
      value: "Triciclo",
    },
    {
      label: "Cuatrimoto / ATV",
      value: "Cuatrimoto / ATV",
    },
    {
      label: "Vehículo utilitario",
      value: "Vehículo utilitario",
    },
    {
      label: "Otro",
      value: "Otro",
    },
  ],
},

  terminology: {
    modules: {
      products: {
        singular: "Modelo",
        plural: "Modelos",
        description:
          "Catálogo de modelos disponibles para venta.",
      },

      leads: {
        singular: "Prospecto",
        plural: "Prospectos",
        description:
          "Personas interesadas en adquirir una motocicleta.",
      },

      contacts: {
        singular: "Cliente",
        plural: "Clientes",
        description:
          "Personas que mantienen una relación comercial con la agencia.",
      },

      deals: {
        singular: "Oportunidad",
        plural: "Oportunidades",
        description:
          "Procesos comerciales con posibilidad de convertirse en venta.",
      },

      inventory: {
        singular: "Unidad",
        plural: "Inventario",
        description:
          "Motocicletas disponibles por sucursal.",
      },

      services: {
        singular: "Servicio",
        plural: "Servicios",
        description:
          "Atención de taller y servicios para motocicletas.",
      },
    },

    fields: {
      "products.name": "Nombre comercial",
      "products.code":
        "Código del modelo",
      "products.description":
        "Descripción",
      "products.category":
        "Tipo de vehículo",
      "products.unitPrice":
        "Precio de lista",
      "products.currency":
        "Moneda",
      "products.active":
        "Modelo activo",

      "leads.productInterest":
        "Modelo de interés",
      "leads.owner":
        "Asesor responsable",
    },
  },
};

export default motorcycleDealershipTemplate;
