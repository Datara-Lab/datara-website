import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

type CreateQuotesModuleOptions = {
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;

  statusOptions?:
    CRMFieldOption[];
};

const defaultStatusOptions:
  CRMFieldOption[] = [
  {
    label: "Borrador",
    value: "Borrador",
  },
  {
    label: "Enviada",
    value: "Enviada",
  },
  {
    label: "Aceptada",
    value: "Aceptada",
  },
  {
    label: "Rechazada",
    value: "Rechazada",
  },
  {
    label: "Vencida",
    value: "Vencida",
  },
  {
    label: "Convertida",
    value: "Convertida",
  },
  {
    label: "Cancelada",
    value: "Cancelada",
  },
];

export function createQuotesModule(
  options:
    CreateQuotesModuleOptions = {},
): CRMModuleConfig {
  const singularLabel =
    options.singularLabel ??
    "Cotización";

  const pluralLabel =
    options.pluralLabel ??
    "Cotizaciones";

  return {
    id: "quotes",

    singularLabel,
    pluralLabel,

    description:
      options.description ??
      "Propuestas económicas con productos, promociones, impuestos y condiciones comerciales.",

    route:
      "/crm/cotizaciones",

    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "quoteNumber",
      "subject",
      "status",
      "relatedName",
      "ownerName",
    ],

    defaultSortField:
      "createdTime",

    defaultSortDirection:
      "desc",

    fields: [
      {
        key: "quoteNumber",
        label:
          "N.º de cotización",

        type: "text",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "180px",
      },

      {
        key: "subject",
        label: "Asunto",

        type: "text",
        required: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "260px",
      },

      {
        key: "status",
        label: "Estado",

        type: "select",
        required: true,

        options:
          options.statusOptions ??
          defaultStatusOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "150px",
      },

      {
        key: "relatedName",
        label:
          "Relacionado con",

        type: "lookup",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 4,
        detailOrder: 4,
        tableWidth: "220px",
      },

      {
        key: "validUntil",
        label:
          "Válida hasta",

        type: "date",

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 5,
        detailOrder: 5,
        tableWidth: "150px",
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

        tableOrder: 6,
        detailOrder: 6,
        tableWidth: "170px",
      },

      {
        key: "paymentMethod",
        label:
          "Forma de pago",

        type: "select",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 7,
        detailOrder: 7,
        tableWidth: "160px",
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

        tableOrder: 8,
        detailOrder: 8,
        tableWidth: "190px",
      },

      {
        key: "description",
        label: "Descripción",

        type: "textarea",

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 9,
      },

      {
        key: "createdTime",
        label:
          "Fecha de creación",

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 10,
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

        detailOrder: 11,
      },
    ],
  };
}

export default createQuotesModule;
