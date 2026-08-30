import type {
    CRMIndustryTemplateConfig,
} from "@/types/crm-config";

export const professionalServicesTemplate:
    CRMIndustryTemplateConfig = {
    id: "professional_services",

    name: "Servicios profesionales",

    description:
        "Configuración para consultoras, despachos, agencias, firmas técnicas y empresas que comercializan proyectos, servicios especializados o contratos recurrentes.",

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
                    canCreate: true,
                    canEdit: true,
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
                "Asesoría",
                "Consultoría",
                "Implementación",
                "Proyecto",
                "Servicio técnico",
                "Capacitación",
                "Soporte",
            ],
        },
        {
            key: "subscription",
            name: "Suscripción",
            inventoryTracked: false,
            technicalProfile: null,
            sortOrder: 20,
            categories: [
                "Iguala mensual",
                "Suscripción",
                "Soporte recurrente",
                "Servicio administrado",
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
            { label: "Asesoría", value: "Asesoría" },
            { label: "Consultoría", value: "Consultoría" },
            { label: "Implementación", value: "Implementación" },
            { label: "Proyecto", value: "Proyecto" },
            { label: "Servicio técnico", value: "Servicio técnico" },
            { label: "Capacitación", value: "Capacitación" },
            { label: "Soporte", value: "Soporte" },
            { label: "Iguala mensual", value: "Iguala mensual" },
            { label: "Suscripción", value: "Suscripción" },
            { label: "Soporte recurrente", value: "Soporte recurrente" },
            { label: "Servicio administrado", value: "Servicio administrado" },
            { label: "Producto", value: "Producto" },
            { label: "Otro", value: "Otro" },
        ],

        "deals.stage": [
            { label: "Diagnóstico", value: "Diagnóstico" },
            { label: "Alcance definido", value: "Alcance definido" },
            { label: "Propuesta en preparación", value: "Propuesta en preparación" },
            { label: "Propuesta enviada", value: "Propuesta enviada" },
            { label: "Negociación", value: "Negociación" },
            { label: "Aprobación o contrato", value: "Aprobación o contrato" },
            { label: "Orden de servicio", value: "Orden de servicio" },
            { label: "Servicio activo", value: "Servicio activo" },
            { label: "Cerrada ganada", value: "Cerrada ganada" },
            { label: "Cerrada perdida", value: "Cerrada perdida" },
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
                    "Catálogo de servicios, proyectos, paquetes y contratos recurrentes.",
            },

            leads: {
                singular: "Prospecto",
                plural: "Prospectos",
                description:
                    "Personas y empresas interesadas en contratar los servicios de la organización.",
            },

            contacts: {
                singular: "Cliente",
                plural: "Clientes",
                description:
                    "Empresas y personas que mantienen una relación comercial activa con la organización.",
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