import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

type CreateDealsModuleOptions = {
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;

  itemSingularLabel?: string;
  itemPluralLabel?: string;

  stageOptions?: CRMFieldOption[];

  acquisitionChannelOptions?:
    CRMFieldOption[];

  paymentMethodOptions?:
    CRMFieldOption[];
};

const defaultStageOptions:
  CRMFieldOption[] = [
  {
    label: "Nueva",
    value: "Nueva",
  },
  {
    label: "En seguimiento",
    value: "En seguimiento",
  },
  {
    label: "Propuesta",
    value: "Propuesta",
  },
  {
    label: "Negociación",
    value: "Negociación",
  },
  {
    label: "Ganada",
    value: "Ganada",
  },
  {
    label: "Perdida",
    value: "Perdida",
  },
];

const defaultChannelOptions:
  CRMFieldOption[] = [
  {
    label: "Sitio web",
    value: "Sitio web",
  },
  {
    label: "Llamada",
    value: "Llamada",
  },
  {
    label: "Correo electrónico",
    value: "Correo electrónico",
  },
  {
    label: "Redes sociales",
    value: "Redes sociales",
  },
  {
    label: "Referido",
    value: "Referido",
  },
  {
    label: "Otro",
    value: "Otro",
  },
];

const defaultPaymentMethodOptions:
  CRMFieldOption[] = [
  {
    label: "Contado",
    value: "Contado",
  },
  {
    label: "Financiamiento",
    value: "Financiamiento",
  },
  {
    label: "Mixto",
    value: "Mixto",
  },
  {
    label: "Por definir",
    value: "Por definir",
  },
];

export function createDealsModule(
  options:
    CreateDealsModuleOptions = {},
): CRMModuleConfig {
  const singularLabel =
    options.singularLabel ??
    "Oportunidad";

  const pluralLabel =
    options.pluralLabel ??
    "Oportunidades";

  const itemSingularLabel =
    options.itemSingularLabel ??
    "Producto o servicio";

  const itemPluralLabel =
    options.itemPluralLabel ??
    "Productos y servicios";

  return {
    id: "deals",

    singularLabel,
    pluralLabel,

    description:
      options.description ??
      "Procesos comerciales con posibilidad de convertirse en una venta.",

    route: "/crm/oportunidades",
    primaryView: "pipeline",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "name",
      "customerName",
      "itemsSummary",
      "stage",
      "status",
      "ownerName",
      "acquisitionChannel",
    ],

    defaultSortField:
      "createdTime",

    defaultSortDirection:
      "desc",

    formSections: [
      {
        id: "deal-information",
        title:
          "Información general",
        description:
          "Datos principales del proceso comercial.",
        order: 1,
        columns: 2,
      },

      {
        id: "deal-items",
        title: itemPluralLabel,
        description:
          `Agrega uno o más ${itemPluralLabel.toLowerCase()} a la operación.`,
        order: 2,
        columns: 1,
      },

      {
        id: "deal-promotions",
        title:
          "Promociones disponibles",
        description:
          "Promociones compatibles con cada partida de la operación.",
        order: 3,
        columns: 1,
      },

      {
        id: "deal-summary",
        title:
          "Resumen de la oportunidad",
        description:
          "Importes, descuentos, financiamiento y promociones aplicadas.",
        order: 4,
        columns: 2,
      },

      {
        id: "deal-additional",
        title:
          "Información adicional",
        description:
          "Siguiente paso y observaciones de la oportunidad.",
        order: 5,
        columns: 2,
      },
    ],

    fields: [
      {
        key: "name",
        label: singularLabel,
        placeholder:
          `Nombre de la ${singularLabel.toLowerCase()}`,

        type: "text",
        required: true,

        validation: {
          maxLength: 160,
          message:
            "El nombre no puede superar los 160 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 1,
        formColumn: 1,

        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "240px",
      },

      {
        key: "stage",
        label: "Etapa",

        type: "select",
        required: true,

        defaultValue:
          options.stageOptions?.[0]
            ?.value ??
          defaultStageOptions[0].value,

        options:
          options.stageOptions ??
          defaultStageOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "deal-information",
        formRow: 3,
        formColumn: 1,

        tableOrder: 2,
        detailOrder: 5,
        tableWidth: "190px",
      },

      {
        key: "status",
        label: "Estado",

        type: "select",
        required: true,
        defaultValue: "Abierta",

        options: [
          {
            label: "Abierta",
            value: "Abierta",
          },
          {
            label: "Ganada",
            value: "Ganada",
          },
          {
            label: "Perdida",
            value: "Perdida",
          },
          {
            label: "Cancelada",
            value: "Cancelada",
          },
        ],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "deal-information",
        formRow: 3,
        formColumn: 2,

        tableOrder: 3,
        detailOrder: 6,
        tableWidth: "140px",
      },

      {
        key: "customerId",
        label: "Cliente",
        placeholder:
          "Buscar un cliente",

        type: "lookup",
        formVariant: "searchable",
        required: false,
        options: [],

        showInForm: true,
        showInTable: false,
        showInDetail: false,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 2,
        formColumn: 2,
      },

      {
        key: "customer",
        label: "Cliente",

        type: "lookup",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 2,
        formColumn: 1,

        tableOrder: 4,
        detailOrder: 3,
        tableWidth: "220px",
      },
      {
        key: "sourceLead",
        label: "Prospecto de origen",

        type: "lookup",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 2,
        formColumn: 2,

        detailOrder: 4,
      },

      {
        key: "ownerClerkUserId",
        label: "Responsable",
        placeholder:
          "Selecciona un responsable",

        type: "lookup",
        formVariant: "searchable",
        required: true,
        options: [],

        showInForm: true,
        showInTable: false,
        showInDetail: false,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 2,
        formColumn: 2,
      },

      {
        key: "owner",
        label: "Responsable",

        type: "lookup",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 1,
        formColumn: 2,

        tableOrder: 5,
        detailOrder: 2,
        tableWidth: "190px",
      },

      {
        key: "acquisitionChannel",
        label:
          "Canal de adquisición",

        type: "select",
        required: false,

        options:
          options
            .acquisitionChannelOptions ??
          defaultChannelOptions,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "deal-information",
        formRow: 4,
        formColumn: 1,

        detailOrder: 7,
      },

      {
        key: "expectedCloseAt",
        label:
          "Fecha estimada de cierre",

        type: "date",
        required: false,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "deal-information",
        formRow: 4,
        formColumn: 2,

        tableOrder: 6,
        detailOrder: 8,
        tableWidth: "170px",
      },

      {
        key: "probability",
        label:
          "Probabilidad de cierre",

        type: "percentage",
        required: false,

        validation: {
          min: 0,
          max: 100,
          message:
            "La probabilidad debe estar entre 0 y 100.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-information",
        formRow: 5,
        formColumn: 1,

        detailOrder: 9,
      },

      {
        key: "itemsSummary",
        label: itemPluralLabel,

        type: "textarea",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-items",

        tableOrder: 7,
        detailOrder: 9,
        tableWidth: "260px",
      },

      {
        key: "baseAmount",
        label: "Subtotal",

        type: "currency",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-summary",

        detailOrder: 10,
      },

      {
        key: "discountAmount",
        label:
          "Descuento aplicado",

        type: "currency",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-summary",

        detailOrder: 11,
      },

      {
        key: "totalAmount",
        label: "Total",

        type: "currency",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-summary",

        tableOrder: 8,
        detailOrder: 12,
        tableWidth: "160px",
      },

      {
        key: "paymentMethod",
        label: "Forma de pago",

        type: "select",
        required: false,

        options:
          options.paymentMethodOptions ??
          defaultPaymentMethodOptions,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,
        formSectionId:
          "deal-summary",

        detailOrder: 13,
      },

      {
        key: "promotionsSummary",
        label:
          "Promociones aplicadas",

        type: "textarea",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-summary",

        detailOrder: 14,
      },

      {
        key: "minimumDownPayment",
        label:
          "Enganche mínimo calculado",

        type: "currency",
        readOnly: true,

        visibleWhen: {
          fieldKey:
            "financingMonths",
          hasValue: true,
        },

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-summary",

        detailOrder: 15,
      },

      {
        key: "customerDownPayment",
        label:
          "Enganche del cliente",

        type: "currency",

        visibleWhen: {
          fieldKey:
            "financingMonths",
          hasValue: true,
        },

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-summary",

        detailOrder: 16,
      },

      {
        key: "financedAmount",
        label:
          "Saldo a financiar",

        type: "currency",
        readOnly: true,

        visibleWhen: {
          fieldKey:
            "financingMonths",
          hasValue: true,
        },

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-summary",

        detailOrder: 17,
      },

      {
        key: "financingMonths",
        label:
          "Plazo de financiamiento",

        type: "number",
        readOnly: true,

        visibleWhen: {
          fieldKey:
            "financingMonths",
          hasValue: true,
        },

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-summary",

        detailOrder: 18,
      },

      {
        key: "estimatedPayment",
        label:
          "Mensualidad estimada",

        type: "currency",
        readOnly: true,

        visibleWhen: {
          fieldKey:
            "financingMonths",
          hasValue: true,
        },

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-summary",

        detailOrder: 19,
      },
      {
        key: "nextStep",
        label: "Siguiente paso",
        placeholder:
          "Describe la siguiente acción comercial",

        type: "text",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-additional",
        formRow: 1,
        formColumn: 1,
        formSpan: 2,

        detailOrder: 20,
      },

      {
        key: "notes",
        label: "Observaciones",
        placeholder:
          "Información adicional de la oportunidad",

        type: "textarea",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "deal-additional",
        formRow: 2,
        formColumn: 1,
        formSpan: 2,

        detailOrder: 21,
      },

      {
        key: "createdTime",
        label: "Fecha de creación",

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-additional",

        detailOrder: 22,
      },

      {
        key: "modifiedTime",
        label:
          "Última actualización",

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId:
          "deal-additional",

        detailOrder: 23,
      },
    ],
  };
}

export default createDealsModule;