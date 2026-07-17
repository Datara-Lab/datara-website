import type { CRMTenantConfig } from "@/types/crm-config";

export const bajajIzcalliCRMConfig: CRMTenantConfig = {
  tenantId: "bajaj-izcalli",
  tenantName: "Bajaj Izcalli",

  /*
   * Se completará cuando conectemos la API real de Zoho.
   */
  zohoOrganizationId: undefined,

  navigationSections: [
    {
      id: "main",
      label: "Operación comercial",
      order: 1,
      visible: true,
    },
    {
      id: "administration",
      label: "Administración",
      order: 2,
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
      ],
    },
  ],

  navigation: [
    {
      id: "home",
      label: "Inicio",
      route: "/crm",
      sectionId: "main",
      order: 1,
      status: "active",
      visible: true,
    },
    {
      id: "leads",
      label: "Prospectos",
      route: "/crm/prospectos",
      moduleId: "leads",
      sectionId: "main",
      order: 2,
      status: "active",
      visible: true,
    },
    {
      id: "contacts",
      label: "Clientes",
      route: "/crm/clientes",
      moduleId: "contacts",
      sectionId: "main",
      order: 3,
      status: "active",
      visible: true,
    },
    {
      id: "deals",
      label: "Oportunidades",
      route: "/crm/oportunidades",
      moduleId: "deals",
      sectionId: "main",
      order: 4,
      status: "active",
      visible: true,
    },
    {
      id: "activities",
      label: "Actividades",
      route: "/crm/actividades",
      moduleId: "activities",
      sectionId: "main",
      order: 5,
      status: "active",
      visible: true,
    },
    {
      id: "promotions",
      label: "Promociones",
      route: "/crm/promociones",
      moduleId: "promotions",
      sectionId: "main",
      order: 6,
      status: "active",
      visible: true,
    },
    {
      id: "settings",
      label: "Configuración",
      route: "/crm/configuracion",
      sectionId: "administration",
      order: 1,
      status: "active",
      visible: true,
      allowedRoles: [
        "owner",
        "admin",
      ],
    },
  ],

  modules: [
    {
      id: "leads",
      zohoModuleApiName: "Leads",

      singularLabel: "Prospecto",
      pluralLabel: "Prospectos",

      description:
        "Personas interesadas en adquirir una motocicleta o recibir información comercial.",

      route: "/crm/prospectos",
      primaryView: "table",

      allowCreate: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,

      searchFields: [],
      defaultSortDirection: "desc",

      /*
       * Los campos reales se agregarán cuando revisemos
       * el módulo Posibles clientes en Zoho.
       */
      fields: [],
    },

    {
      id: "contacts",
      zohoModuleApiName: "Contacts",

      singularLabel: "Cliente",
      pluralLabel: "Clientes",

      description:
        "Personas que ya tienen una relación comercial con la agencia.",

      route: "/crm/clientes",
      primaryView: "table",

      allowCreate: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,

      searchFields: [],
      defaultSortDirection: "desc",

      fields: [],
    },

    {
      id: "deals",
      zohoModuleApiName: "Deals",

      singularLabel: "Oportunidad",
      pluralLabel: "Oportunidades",

      description:
        "Operaciones comerciales activas dentro del proceso de venta.",

      route: "/crm/oportunidades",
      primaryView: "pipeline",

      allowCreate: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,

      searchFields: [],
      defaultSortDirection: "desc",

      fields: [],
    },

    {
      id: "activities",

      singularLabel: "Actividad",
      pluralLabel: "Actividades",

      description:
        "Llamadas, tareas, reuniones y seguimientos del equipo comercial.",

      route: "/crm/actividades",
      primaryView: "timeline",

      allowCreate: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: false,

      searchFields: [],
      defaultSortDirection: "desc",

      fields: [],
    },

    {
      id: "promotions",
      zohoModuleApiName: "Promociones",

      singularLabel: "Promoción",
      pluralLabel: "Promociones",

      description:
        "Condiciones comerciales, beneficios y vigencias disponibles para las motocicletas.",

      route: "/crm/promociones",
      primaryView: "table",

      allowCreate: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,

      searchFields: [
        "status",
      ],
      defaultSortField: "priority",
      defaultSortDirection: "asc",

      fields: [
        {
          key: "status",
          zohoApiName: "Estado",

          label: "Estado",
          type: "select",

          required: true,

          options: [
            {
              label: "Programada",
              value: "Programada",
            },
            {
              label: "Activa",
              value: "Activa",
            },
            {
              label: "Pausada",
              value: "Pausada",
            },
            {
              label: "Inactiva",
              value: "Inactiva",
            },
            {
              label: "Expirada",
              value: "Expirada",
            },
          ],

          showInForm: true,
          showInTable: true,
          showInDetail: true,
          showInFilters: true,

          formOrder: 1,
          tableOrder: 1,
          detailOrder: 1,

          tableWidth: "150px",
        },

        {
          key: "priority",
          zohoApiName: "Prioridad",

          label: "Prioridad",
          type: "number",

          required: true,

          validation: {
            min: 1,
            max: 5,
            message: "La prioridad debe estar entre 1 y 5.",
          },

          showInForm: true,
          showInTable: true,
          showInDetail: true,
          showInFilters: false,

          formOrder: 2,
          tableOrder: 2,
          detailOrder: 2,

          tableWidth: "120px",
        },

        {
          key: "promotionStart",
          zohoApiName: "Inicio_de_promocion",

          label: "Inicio de promoción",
          type: "datetime",

          required: true,

          showInForm: true,
          showInTable: true,
          showInDetail: true,
          showInFilters: true,

          formOrder: 3,
          tableOrder: 3,
          detailOrder: 3,

          tableWidth: "210px",
        },

        {
          key: "promotionEnd",
          zohoApiName: "Fin_de_promocion",

          label: "Fin de promoción",
          type: "datetime",

          required: true,

          showInForm: true,
          showInTable: true,
          showInDetail: true,
          showInFilters: true,

          formOrder: 4,
          tableOrder: 4,
          detailOrder: 4,

          tableWidth: "210px",
        },
      ],
    },
  ],

  pipelines: [
    {
      id: "motorcycle-sales",
      label: "Ciclo de Venta Motos",
      moduleId: "deals",
      stageFieldKey: "stage",

      stages: [
        {
          id: "quotation",
          zohoValue: "Cotización",
          label: "Cotización",
          order: 1,
          probability: 20,
        },
        {
          id: "test-drive",
          zohoValue: "Prueba de manejo",
          label: "Prueba de manejo",
          order: 2,
          probability: 40,
        },
        {
          id: "negotiation",
          zohoValue: "Negociación",
          label: "Negociación",
          order: 3,
          probability: 70,
        },
        {
          id: "won",
          zohoValue: "Ganado",
          label: "Ganado",
          order: 4,
          probability: 100,
          isWon: true,
        },
        {
          id: "lost",
          zohoValue: "Perdido",
          label: "Perdido",
          order: 5,
          probability: 0,
          isLost: true,
        },
      ],
    },
  ],
};

export default bajajIzcalliCRMConfig;