import type {
  CRMFieldOption,
  CRMModuleConfig,
  CRMTerminologyConfig,
} from "@/types/crm-config";

function getFieldLabel(
  terminology:
    | CRMTerminologyConfig
    | undefined,
  fieldKey: string,
  fallback: string,
): string {
  return (
    terminology?.fields[
      `products.${fieldKey}`
    ] ?? fallback
  );
}

export function createProductsModule(
  terminology?: CRMTerminologyConfig,
  catalogs?: Record<
    string,
    CRMFieldOption[]
  >,
): CRMModuleConfig {
  const moduleTerminology =
    terminology?.modules.products;

  const singularLabel =
    moduleTerminology?.singular ??
    "Producto";

  const pluralLabel =
    moduleTerminology?.plural ??
    "Productos";

  return {
    id: "products",

    singularLabel,
    pluralLabel,

    description:
      moduleTerminology?.description ??
      "Catálogo de productos y servicios de la empresa.",

    route: "/crm/productos",
    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "name",
      "code",
      "category",
    ],

    defaultSortField: "name",
    defaultSortDirection: "asc",

    formSections: [
      {
        id: "general",
        title: "Información general",
        description:
          `Datos principales del ${singularLabel.toLowerCase()}.`,
        order: 1,
        columns: 2,
      },

      {
        id: "commercial",
        title: "Información comercial",
        description:
          "Precio, moneda y disponibilidad.",
        order: 2,
        columns: 2,
      },
    ],

    fields: [
      {
        key: "name",

        label: getFieldLabel(
          terminology,
          "name",
          "Nombre",
        ),

        placeholder:
          `Nombre del ${singularLabel.toLowerCase()}`,

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

        formOrder: 1,
        tableOrder: 1,
        detailOrder: 1,

        tableWidth: "230px",

        formSectionId: "general",
        formRow: 1,
        formColumn: 1,
      },

      {
        key: "code",

        label: getFieldLabel(
          terminology,
          "code",
          "Código",
        ),

        placeholder:
          "Código o SKU",

        type: "text",
        required: false,

        validation: {
          maxLength: 80,
          message:
            "El código no puede superar los 80 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 2,
        tableOrder: 2,
        detailOrder: 2,

        tableWidth: "180px",

        formSectionId: "general",
        formRow: 1,
        formColumn: 2,
      },

      {
        key: "category",

        label: getFieldLabel(
          terminology,
          "category",
          "Categoría",
        ),

        placeholder:
          "Selecciona el tipo de vehículo",

        type: "select",
        required: true,

        options:
          catalogs?.["products.category"] ??
          [],

        validation: {
          maxLength: 100,
          message:
            "La categoría no puede superar los 100 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formOrder: 3,
        tableOrder: 3,
        detailOrder: 3,

        tableWidth: "170px",

        formSectionId: "general",
        formRow: 2,
        formColumn: 1,
      },

      {
        key: "description",

        label: getFieldLabel(
          terminology,
          "description",
          "Descripción",
        ),

        placeholder:
          `Descripción del ${singularLabel.toLowerCase()}`,

        type: "textarea",
        required: false,

        validation: {
          maxLength: 2000,
          message:
            "La descripción no puede superar los 2000 caracteres.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formOrder: 4,
        detailOrder: 4,

        formSectionId: "general",
        formRow: 3,
        formColumn: 1,
        formSpan: 2,
      },

      {
        key: "unitPrice",

        label: getFieldLabel(
          terminology,
          "unitPrice",
          "Precio unitario",
        ),

        placeholder: "0.00",

        type: "currency",
        required: true,
        defaultValue: 0,

        validation: {
          min: 0,
          message:
            "El precio no puede ser negativo.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 5,
        tableOrder: 4,
        detailOrder: 5,

        tableWidth: "150px",

        formSectionId: "commercial",
        formRow: 1,
        formColumn: 1,
      },

      {
        key: "currency",

        label: getFieldLabel(
          terminology,
          "currency",
          "Moneda",
        ),

        type: "select",
        required: true,
        defaultValue: "MXN",

        options: [
          {
            label: "Peso mexicano (MXN)",
            value: "MXN",
          },
          {
            label:
              "Dólar estadounidense (USD)",
            value: "USD",
          },
        ],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formOrder: 6,
        tableOrder: 5,
        detailOrder: 6,

        tableWidth: "120px",

        formSectionId: "commercial",
        formRow: 1,
        formColumn: 2,
      },

      {
        key: "active",

        label: getFieldLabel(
          terminology,
          "active",
          "Producto activo",
        ),

        description:
          "Los productos inactivos no estarán disponibles en nuevas operaciones.",

        type: "checkbox",
        required: false,
        defaultValue: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formOrder: 7,
        tableOrder: 6,
        detailOrder: 7,

        tableWidth: "130px",

        formSectionId: "commercial",
        formRow: 2,
        formColumn: 1,
        formSpan: 2,
      },

      {
        key: "createdAt",
        label: "Fecha de creación",

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 8,
      },

      {
        key: "updatedAt",
        label: "Última actualización",

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
