import type {
    CRMIndustryTemplateConfig,
} from "@/types/crm-config";

export const professionalServicesTemplate:
    CRMIndustryTemplateConfig = {
    id: "professional_services",

    name: "Servicios profesionales",

    description:
        "Configuración para empresas que venden software, consultoría, implementación y servicios especializados.",

    defaultModules: [
        "products",
        "leads",
        "contacts",
        "deals",
        "activities",
        "documents",
        "integrations",
        "automations",
        "crm-analytics",
        "promotions",
        "quotes",
        "sales-orders",
    ],

    defaultRoles: [
        {
            key: "sales_consultant",
            name: "Consultor comercial",
            product: "crm",

            description:
                "Gestiona prospectos, clientes, oportunidades, cotizaciones y seguimiento comercial.",

            permissions: [
                {
                    moduleId: "products",
                    canView: true,
                },
                {
                    moduleId: "leads",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "contacts",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "deals",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "activities",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "documents",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "promotions",
                    canView: true,
                },
                {
                    moduleId: "quotes",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "sales-orders",
                    canView: true,
                },
                {
                    moduleId: "automations",
                    canView: true,
                },
                {
                    moduleId: "crm-analytics",
                    canView: true,
                },
            ],
        },
        {
            key: "customer_success",
            name: "Éxito del cliente",
            product: "crm",

            description:
                "Da seguimiento a clientes activos, implementaciones, adopción y renovaciones.",

            permissions: [
                {
                    moduleId: "products",
                    canView: true,
                },
                {
                    moduleId: "contacts",
                    canView: true,
                    canEdit: true,
                },
                {
                    moduleId: "deals",
                    canView: true,
                },
                {
                    moduleId: "activities",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "documents",
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                },
                {
                    moduleId: "quotes",
                    canView: true,
                },
                {
                    moduleId: "sales-orders",
                    canView: true,
                },
                {
                    moduleId: "automations",
                    canView: true,
                },
                {
                    moduleId: "crm-analytics",
                    canView: true,
                },
            ],
        },
    ],

    defaultProductTypes: [
        {
            key: "service",
            name: "Servicio",
            inventoryTracked: false,
            technicalProfile: null,
            sortOrder: 10,
            categories: [
                "Implementación",
                "Consultoría",
                "Integración",
                "Capacitación",
                "Soporte",
                "Proyecto de analítica",
            ],
        },
        {
            key: "subscription",
            name: "Suscripción",
            inventoryTracked: false,
            technicalProfile: null,
            sortOrder: 20,
            categories: [
                "Suscripción de software",
                "Almacenamiento",
            ],
        },
        {
            key: "product",
            name: "Producto",
            inventoryTracked: true,
            technicalProfile: null,
            sortOrder: 30,
            categories: [
                "Otro",
            ],
        },
    ],

    defaultCatalogs: {
        "products.category": [
            {
                label: "Suscripción de software",
                value: "Suscripción de software",
            },
            {
                label: "Implementación",
                value: "Implementación",
            },
            {
                label: "Consultoría",
                value: "Consultoría",
            },
            {
                label: "Integración",
                value: "Integración",
            },
            {
                label: "Capacitación",
                value: "Capacitación",
            },
            {
                label: "Soporte",
                value: "Soporte",
            },
            {
                label: "Proyecto de analítica",
                value: "Proyecto de analítica",
            },
            {
                label: "Almacenamiento",
                value: "Almacenamiento",
            },
            {
                label: "Otro",
                value: "Otro",
            },
        ],

        "deals.stage": [
            {
                label: "Nuevo prospecto",
                value: "Nuevo prospecto",
            },
            {
                label: "Descubrimiento",
                value: "Descubrimiento",
            },
            {
                label: "Demo agendado",
                value: "Demo agendado",
            },
            {
                label: "Demo realizado",
                value: "Demo realizado",
            },
            {
                label: "Propuesta enviada",
                value: "Propuesta enviada",
            },
            {
                label: "Negociación",
                value: "Negociación",
            },
            {
                label: "Pago pendiente",
                value: "Pago pendiente",
            },
            {
                label: "Venta ganada",
                value: "Venta ganada",
            },
            {
                label: "Venta perdida",
                value: "Venta perdida",
            },
        ],

        "deals.acquisitionChannel": [
            {
                label: "Sitio web",
                value: "Sitio web",
            },
            {
                label: "Facebook",
                value: "Facebook",
            },
            {
                label: "Instagram",
                value: "Instagram",
            },
            {
                label: "LinkedIn",
                value: "LinkedIn",
            },
            {
                label: "WhatsApp",
                value: "WhatsApp",
            },
            {
                label: "Correo electrónico",
                value: "Correo electrónico",
            },
            {
                label: "Referido",
                value: "Referido",
            },
            {
                label: "Socio comercial",
                value: "Socio comercial",
            },
            {
                label: "Evento",
                value: "Evento",
            },
            {
                label: "Prospección directa",
                value: "Prospección directa",
            },
            {
                label: "Otro",
                value: "Otro",
            },
        ],

        "deals.paymentMethod": [
            {
                label: "Tarjeta",
                value: "Tarjeta",
            },
            {
                label: "Transferencia",
                value: "Transferencia",
            },
            {
                label: "Domiciliación",
                value: "Domiciliación",
            },
            {
                label: "Por definir",
                value: "Por definir",
            },
        ],
    },

    terminology: {
        modules: {
            products: {
                singular: "Producto o servicio",
                plural: "Productos y servicios",
                description:
                    "Catálogo de suscripciones, implementaciones y servicios profesionales.",
            },

            leads: {
                singular: "Prospecto",
                plural: "Prospectos",
                description:
                    "Personas y empresas interesadas en las soluciones de Datara.",
            },

            contacts: {
                singular: "Cliente",
                plural: "Clientes",
                description:
                    "Empresas y personas que mantienen una relación comercial con Datara.",
            },

            deals: {
                singular: "Oportunidad",
                plural: "Oportunidades",
                description:
                    "Procesos comerciales con posibilidad de convertirse en contratación.",
            },
        },

        fields: {
            "products.name":
                "Nombre del producto o servicio",

            "products.code":
                "Código comercial",

            "products.description":
                "Descripción",

            "products.category":
                "Tipo de producto o servicio",

            "products.unitPrice":
                "Precio de lista",

            "products.currency":
                "Moneda",

            "products.active":
                "Producto activo",

            "leads.productInterest":
                "Solución de interés",

            "leads.owner":
                "Consultor responsable",
        },
    },
};

export default professionalServicesTemplate;