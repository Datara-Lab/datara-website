import type {
  CRMModuleConfig,
} from "@/types/crm-config";

type ModuleTerminology = {
  singular?: string;
  plural?: string;
  description?: string;
};

type CustomersTerminology = {
  modules?: Record<
    string,
    ModuleTerminology
  >;

  fields?: Record<
    string,
    string
  >;
};

function getFieldLabel(
  terminology:
    | CustomersTerminology
    | undefined,
  key: string,
  fallback: string,
): string {
  return (
    terminology
      ?.fields?.[`contacts.${key}`] ??
    fallback
  );
}

export function createCustomersModule(
  terminology?: CustomersTerminology,
): CRMModuleConfig {
  const moduleTerminology =
    terminology
      ?.modules?.contacts;

  const singularLabel =
    moduleTerminology?.singular ??
    "Cliente";

  const pluralLabel =
    moduleTerminology?.plural ??
    "Clientes";

  return {
    id: "contacts",

    singularLabel,
    pluralLabel,

    description:
      moduleTerminology
        ?.description ??
      "Personas y empresas que mantienen una relación comercial con tu negocio.",

    route: "/crm/clientes",
    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "displayName",
      "companyName",
      "email",
      "phone",
      "mobile",
      "taxId",
      "status",
    ],

    defaultSortField:
      "createdTime",

    defaultSortDirection:
      "desc",

    formSections: [
      {
        id: "customer-information",
        title:
          "Información del cliente",
        description:
          "Datos principales de la persona o empresa.",
        order: 1,
        columns: 2,
      },

      {
        id: "contact-information",
        title:
          "Información de contacto",
        description:
          "Medios disponibles para contactar al cliente.",
        order: 2,
        columns: 2,
      },

      {
        id: "commercial-information",
        title:
          "Información comercial",
        description:
          "Responsable, estado y relaciones comerciales.",
        order: 3,
        columns: 2,
      },

      {
        id: "fiscal-information",
        title:
          "Información fiscal",
        description:
          "Datos fiscales y razón social del cliente.",
        order: 4,
        columns: 2,
      },

      {
        id: "address-information",
        title: "Dirección",
        description:
          "Ubicación principal del cliente.",
        order: 5,
        columns: 2,
      },

      {
        id: "additional-information",
        title:
          "Información adicional",
        description:
          "Consentimiento comercial y notas relevantes.",
        order: 6,
        columns: 2,
      },
    ],

    fields: [
      {
        key: "displayName",
        label:
          getFieldLabel(
            terminology,
            "displayName",
            "Cliente",
          ),

        type: "text",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "230px",
      },

      {
        key: "customerType",
        label:
          getFieldLabel(
            terminology,
            "customerType",
            "Tipo de cliente",
          ),

        description:
          "Selecciona si el cliente es una persona o una empresa.",

        type: "select",
        required: true,
        defaultValue: "Persona",

        options: [
          {
            label: "Persona",
            value: "Persona",
          },
          {
            label: "Empresa",
            value: "Empresa",
          },
        ],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "customer-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,

        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "150px",
      },

      {
        key: "status",
        label:
          getFieldLabel(
            terminology,
            "status",
            "Estado",
          ),

        type: "select",
        required: true,
        defaultValue: "Activo",

        options: [
          {
            label: "Activo",
            value: "Activo",
          },
          {
            label: "Inactivo",
            value: "Inactivo",
          },
          {
            label: "Suspendido",
            value: "Suspendido",
          },
        ],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "customer-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,

        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "140px",
      },

      {
        key: "name",
        label:
          getFieldLabel(
            terminology,
            "name",
            "Nombre o contacto principal",
          ),

        placeholder:
          "Nombre de la persona",

        description:
          "Para empresas, captura aquí el nombre del contacto principal.",

        type: "text",
        required: true,

        validation: {
          maxLength: 100,
          message:
            "El nombre no puede superar los 100 caracteres.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "customer-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 4,
      },

      {
        key: "lastName",
        label:
          getFieldLabel(
            terminology,
            "lastName",
            "Apellidos",
          ),

        placeholder:
          "Apellidos de la persona",

        type: "text",
        required: false,

        validation: {
          maxLength: 120,
          message:
            "Los apellidos no pueden superar los 120 caracteres.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "customer-information",
        formRow: 2,
        formColumn: 2,
        formSpan: 1,

        detailOrder: 5,
      },

      {
        key: "companyName",
        label:
          getFieldLabel(
            terminology,
            "companyName",
            "Nombre comercial",
          ),

        placeholder:
          "Nombre comercial de la empresa",

        description:
          "Obligatorio cuando el tipo de cliente es Empresa.",

        type: "text",
        required: false,

        visibleWhen: {
          fieldKey: "customerType",
          equals: "Empresa",
        },

        validation: {
          maxLength: 160,
          message:
            "El nombre comercial no puede superar los 160 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "customer-information",
        formRow: 3,
        formColumn: 1,
        formSpan: 2,

        tableOrder: 4,
        detailOrder: 6,
        tableWidth: "220px",
      },

      {
        key: "email",
        label:
          getFieldLabel(
            terminology,
            "email",
            "Correo electrónico",
          ),

        placeholder:
          "correo@ejemplo.com",

        type: "email",
        required: false,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "contact-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,

        tableOrder: 5,
        detailOrder: 7,
        tableWidth: "230px",
      },

      {
        key: "phone",
        label:
          getFieldLabel(
            terminology,
            "phone",
            "Teléfono",
          ),

        placeholder:
          "55 0000 0000",

        type: "phone",
        required: false,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "contact-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,

        tableOrder: 6,
        detailOrder: 8,
        tableWidth: "160px",
      },

      {
        key: "mobile",
        label:
          getFieldLabel(
            terminology,
            "mobile",
            "Teléfono móvil",
          ),

        placeholder:
          "55 0000 0000",

        type: "phone",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "contact-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 9,
      },

      {
        key: "productId",
        label:
          getFieldLabel(
            terminology,
            "productId",
            "Producto relacionado",
          ),

        placeholder:
          "Buscar un producto",

        type: "lookup",
        formVariant: "searchable",
        required: false,
        options: [],

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "commercial-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 10,
      },

      {
        key: "ownerClerkUserId",
        label:
          getFieldLabel(
            terminology,
            "owner",
            "Responsable",
          ),

        placeholder:
          "Selecciona un responsable",

        type: "lookup",
        formVariant: "searchable",
        required: false,
        options: [],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "commercial-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,

        tableOrder: 7,
        detailOrder: 11,
        tableWidth: "190px",
      },

      {
        key: "sourceLeadId",
        label:
          getFieldLabel(
            terminology,
            "sourceLeadId",
            "Prospecto de origen",
          ),

        description:
          "Prospecto del cual se originó este cliente.",

        type: "lookup",
        readOnly: true,
        required: false,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 12,
      },

      {
        key: "legalName",
        label:
          getFieldLabel(
            terminology,
            "legalName",
            "Razón social",
          ),

        placeholder:
          "Razón social registrada",

        type: "text",
        required: false,

        visibleWhen: {
          fieldKey: "customerType",
          equals: "Empresa",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "fiscal-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 13,
      },

      {
        key: "taxId",
        label:
          getFieldLabel(
            terminology,
            "taxId",
            "RFC o identificación fiscal",
          ),

        placeholder:
          "RFC o identificación fiscal",

        type: "text",
        required: false,

        validation: {
          maxLength: 40,
          message:
            "La identificación fiscal no puede superar los 40 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "fiscal-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,

        tableOrder: 8,
        detailOrder: 14,
        tableWidth: "180px",
      },

      {
        key: "addressLine",
        label:
          getFieldLabel(
            terminology,
            "addressLine",
            "Calle y número",
          ),

        placeholder:
          "Calle, número exterior e interior",

        type: "text",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "address-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 2,

        detailOrder: 15,
      },

      {
        key: "city",
        label:
          getFieldLabel(
            terminology,
            "city",
            "Ciudad o municipio",
          ),

        placeholder:
          "Ciudad o municipio",

        type: "text",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "address-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 16,
      },

      {
        key: "state",
        label:
          getFieldLabel(
            terminology,
            "state",
            "Estado",
          ),

        placeholder:
          "Estado o provincia",

        type: "text",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "address-information",
        formRow: 2,
        formColumn: 2,
        formSpan: 1,

        detailOrder: 17,
      },

      {
        key: "postalCode",
        label:
          getFieldLabel(
            terminology,
            "postalCode",
            "Código postal",
          ),

        placeholder:
          "Código postal",

        type: "text",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "address-information",
        formRow: 3,
        formColumn: 1,
        formSpan: 1,

        detailOrder: 18,
      },

      {
        key: "country",
        label:
          getFieldLabel(
            terminology,
            "country",
            "País",
          ),

        placeholder:
          "Código de país",

        type: "text",
        required: true,
        defaultValue: "MX",

        validation: {
          maxLength: 3,
          message:
            "Utiliza el código corto del país.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "address-information",
        formRow: 3,
        formColumn: 2,
        formSpan: 1,

        detailOrder: 19,
      },

      {
        key: "commercialConsent",
        label:
          getFieldLabel(
            terminology,
            "commercialConsent",
            "Acepta comunicaciones comerciales",
          ),

        description:
          "Indica si el cliente autorizó recibir comunicaciones comerciales.",

        type: "checkbox",
        required: false,
        defaultValue: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formSectionId:
          "additional-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 2,

        detailOrder: 20,
      },

      {
        key: "notes",
        label:
          getFieldLabel(
            terminology,
            "notes",
            "Notas",
          ),

        placeholder:
          "Agrega observaciones relevantes sobre el cliente",

        type: "textarea",
        required: false,

        validation: {
          maxLength: 4000,
          message:
            "Las notas no pueden superar los 4,000 caracteres.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formSectionId:
          "additional-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 2,

        detailOrder: 21,
      },

      {
        key: "createdTime",
        label:
          getFieldLabel(
            terminology,
            "createdTime",
            "Fecha de creación",
          ),

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 22,
        tableOrder: 9,
        tableWidth: "190px",
      },

      {
        key: "modifiedTime",
        label:
          getFieldLabel(
            terminology,
            "modifiedTime",
            "Última modificación",
          ),

        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 23,
        tableOrder: 10,
        tableWidth: "190px",
      },
    ],
  };
}

export default createCustomersModule;
