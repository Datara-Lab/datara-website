import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

type CreateDocumentsModuleOptions = {
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;
};

const categoryOptions:
  CRMFieldOption[] = [
  {
    label: "Identificación",
    value: "Identificación",
  },
  {
    label: "Comprobante",
    value: "Comprobante",
  },
  {
    label: "Contrato",
    value: "Contrato",
  },
  {
    label: "Cotización",
    value: "Cotización",
  },
  {
    label: "Factura",
    value: "Factura",
  },
  {
    label:
      "Propuesta comercial",
    value:
      "Propuesta comercial",
  },
  {
    label:
      "Documento interno",
    value:
      "Documento interno",
  },
  {
    label: "Imagen",
    value: "Imagen",
  },
  {
    label: "Otro",
    value: "Otro",
  },
];

const statusOptions:
  CRMFieldOption[] = [
  {
    label: "Activo",
    value: "active",
  },
  {
    label: "Archivado",
    value: "archived",
  },
];

export function createDocumentsModule(
  options:
    CreateDocumentsModuleOptions = {},
): CRMModuleConfig {
  const singularLabel =
    options.singularLabel ??
    "Documento";

  const pluralLabel =
    options.pluralLabel ??
    "Documentos";

  return {
    id: "documents",

    singularLabel,
    pluralLabel,

    description:
      options.description ??
      "Archivos comerciales relacionados con clientes, prospectos, oportunidades y actividades.",

    route:
      "/crm/documentos",

    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: false,

    searchFields: [
      "name",
      "originalFileName",
      "category",
      "uploadedByName",
    ],

    defaultSortField:
      "createdTime",

    defaultSortDirection:
      "desc",

    fields: [
      {
        key: "name",
        label:
          "Nombre del documento",

        type: "text",
        required: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "260px",
      },

      {
        key: "category",
        label: "Categoría",

        type: "select",
        required: true,

        options:
          categoryOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "180px",
      },

      {
        key:
          "originalFileName",

        label:
          "Archivo original",

        type: "text",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "240px",
      },

      {
        key: "status",
        label: "Estado",

        type: "select",
        required: true,

        options:
          statusOptions,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 4,
        detailOrder: 4,
        tableWidth: "130px",
      },

      {
        key: "sizeBytes",
        label: "Tamaño",

        type: "number",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 5,
        detailOrder: 5,
        tableWidth: "120px",
      },

      {
        key: "uploadedByName",
        label: "Cargado por",

        type: "text",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 6,
        detailOrder: 6,
        tableWidth: "180px",
      },

      {
        key: "description",
        label: "Descripción",

        type: "textarea",

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 7,
      },

      {
        key: "createdTime",
        label:
          "Fecha de carga",

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 7,
        detailOrder: 8,
        tableWidth: "180px",
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

        detailOrder: 9,
      },
    ],
  };
}

export default createDocumentsModule;
