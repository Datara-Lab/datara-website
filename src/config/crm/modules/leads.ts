import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

export type CreateLeadsModuleOptions = {
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;

  productInterestLabel?: string;
  productInterestDescription?: string;
  productInterestPlaceholder?: string;

  sourceOptions?: CRMFieldOption[];
  statusOptions?: CRMFieldOption[];
};

const defaultSourceOptions: CRMFieldOption[] = [
  {
    label: "Sitio web",
    value: "Sitio web",
  },
  {
    label: "Tienda física",
    value: "Tienda física",
  },
  {
    label: "WhatsApp",
    value: "WhatsApp",
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
    label: "TikTok",
    value: "TikTok",
  },
  {
    label: "Llamada telefónica",
    value: "Llamada telefónica",
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
    label: "Evento",
    value: "Evento",
  },
  {
    label: "Campaña",
    value: "Campaña",
  },
  {
    label: "Publicidad",
    value: "Publicidad",
  },
  {
    label: "Otro",
    value: "Otro",
  },
];

const defaultStatusOptions: CRMFieldOption[] = [
  {
    label: "Nuevo",
    value: "Nuevo",
  },
  {
    label: "Contactado",
    value: "Contactado",
  },
  {
    label: "En seguimiento",
    value: "En seguimiento",
  },
  {
    label: "Calificado",
    value: "Calificado",
  },
  {
    label: "No interesado",
    value: "No interesado",
  },
  {
    label: "Convertido",
    value: "Convertido",
  },
];

export function createLeadsModule(
  options: CreateLeadsModuleOptions = {},
): CRMModuleConfig {
  const singularLabel =
    options.singularLabel ??
    "Prospecto";

  const pluralLabel =
    options.pluralLabel ??
    "Prospectos";

  return {
    id: "leads",

    singularLabel,
    pluralLabel,

    description:
      options.description ??
      "Registra, asigna y da seguimiento a las personas interesadas en los productos o servicios de la empresa.",

    route: "/crm/prospectos",
    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "firstName",
      "lastName",
      "email",
      "phone",
      "mobile",
      "company",
      "leadSource",
      "leadStatus",
    ],

    defaultSortField: "createdTime",
    defaultSortDirection: "desc",

    formSections: [
      {
        id: "contact-information",
        title: "Información de contacto",
        description:
          "Datos principales para identificar y contactar al prospecto.",
        order: 1,
        columns: 2,
      },
      {
        id: "commercial-information",
        title: "Información comercial",
        description:
          "Origen, estado, interés y responsable del seguimiento.",
        order: 2,
        columns: 2,
      },
      {
        id: "additional-information",
        title: "Información adicional",
        description:
          "Consentimiento comercial y notas relevantes.",
        order: 3,
        columns: 2,
      },
    ],

    fields: [
      {
        key: "firstName",
        label: "Nombre",
        placeholder:
          "Nombre del prospecto",
        type: "text",
        required: true,

        validation: {
          maxLength: 80,
          message:
            "El nombre no puede superar los 80 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 1,
        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "170px",

        formSectionId:
          "contact-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,
      },

      {
        key: "lastName",
        label: "Apellidos",
        placeholder:
          "Apellidos del prospecto",
        type: "text",
        required: false,

        validation: {
          maxLength: 120,
          message:
            "Los apellidos no pueden superar los 120 caracteres.",
        },

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 2,
        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "190px",

        formSectionId:
          "contact-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,
      },

      {
        key: "email",
        label: "Correo electrónico",
        placeholder:
          "correo@empresa.com",
        description:
          "Es necesario capturar al menos un correo o teléfono.",
        type: "email",
        required: false,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 3,
        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "230px",

        formSectionId:
          "contact-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 1,
      },

      {
        key: "phone",
        label: "Teléfono",
        placeholder:
          "55 0000 0000",
        description:
          "Es necesario capturar al menos un correo o teléfono.",
        type: "phone",
        required: false,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        formOrder: 4,
        tableOrder: 4,
        detailOrder: 4,
        tableWidth: "160px",

        formSectionId:
          "contact-information",
        formRow: 2,
        formColumn: 2,
        formSpan: 1,
      },

      {
        key: "mobile",
        label: "Teléfono móvil",
        placeholder:
          "55 0000 0000",
        type: "phone",
        required: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formOrder: 5,
        detailOrder: 5,

        formSectionId:
          "contact-information",
        formRow: 3,
        formColumn: 1,
        formSpan: 1,
      },

      {
        key: "company",
        label: "Empresa",
        placeholder:
          "Nombre de la empresa",
        type: "text",
        required: false,

        validation: {
          maxLength: 160,
          message:
            "El nombre de la empresa no puede superar los 160 caracteres.",
        },

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        formOrder: 6,
        detailOrder: 6,

        formSectionId:
          "contact-information",
        formRow: 3,
        formColumn: 2,
        formSpan: 1,
      },

      {
        key: "leadSource",
        label: "Origen del prospecto",
        description:
          "Canal por el que llegó el prospecto.",
        placeholder:
          "Selecciona el origen",
        type: "select",
        required: false,

        options:
          options.sourceOptions ??
          defaultSourceOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formOrder: 7,
        tableOrder: 5,
        detailOrder: 7,
        tableWidth: "180px",

        formSectionId:
          "commercial-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 1,
      },

      {
        key: "leadStatus",
        label: "Estado del prospecto",
        placeholder:
          "Selecciona el estado",
        type: "select",
        required: true,
        defaultValue: "Nuevo",

        options:
          options.statusOptions ??
          defaultStatusOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        formOrder: 8,
        tableOrder: 6,
        detailOrder: 8,
        tableWidth: "170px",

        formSectionId:
          "commercial-information",
        formRow: 1,
        formColumn: 2,
        formSpan: 1,
      },

      {
        key: "productId",
        label:
          options.productInterestLabel ??
          "Producto de interés",
        description:
          options.productInterestDescription ??
          "Producto o servicio por el que se interesó el prospecto.",
        placeholder:
          options.productInterestPlaceholder ??
          "Buscar un producto",
        type: "lookup",
        formVariant: "searchable",
        required: false,
        options: [],

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formOrder: 9,
        detailOrder: 9,

        formSectionId:
          "commercial-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 1,
      },

      {
        key: "ownerClerkUserId",
        label: "Responsable",
        description:
          "Usuario encargado de contactar y dar seguimiento al prospecto.",
        placeholder:
          "Selecciona un responsable",
        type: "lookup",
        formVariant: "searchable",
        required: false,
        options: [],

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formOrder: 10,
        detailOrder: 10,

        formSectionId:
          "commercial-information",
        formRow: 2,
        formColumn: 2,
        formSpan: 1,
      },

      {
        key: "commercialConsent",
        label:
          "Autoriza comunicaciones comerciales",
        description:
          "Indica si el prospecto autorizó recibir mensajes, llamadas o correos comerciales.",
        type: "checkbox",
        required: false,
        defaultValue: false,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: true,

        formOrder: 11,
        detailOrder: 11,

        formSectionId:
          "additional-information",
        formRow: 1,
        formColumn: 1,
        formSpan: 2,
      },

      {
        key: "notes",
        label: "Notas",
        placeholder:
          "Agrega comentarios relevantes para el seguimiento",
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

        formOrder: 12,
        detailOrder: 12,

        formSectionId:
          "additional-information",
        formRow: 2,
        formColumn: 1,
        formSpan: 2,
      },

      {
        key: "createdTime",
        label: "Fecha de registro",
        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 7,
        detailOrder: 13,
        tableWidth: "190px",
      },

      {
        key: "modifiedTime",
        label: "Última modificación",
        type: "datetime",
        readOnly: true,

        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 14,
      },
    ],
  };
}

export default createLeadsModule;
