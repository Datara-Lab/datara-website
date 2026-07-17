import type { CRMModuleConfig } from "@/types/crm-config";

export const promotionsModule: CRMModuleConfig = {
  id: "promotions",
  zohoModuleApiName: "Promoci_n",

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
    "promotionName",
    "status",
    "promotionGroup",
    "benefitType",
    "paymentMethod",
    "customerType",
    "channel",
  ],

  defaultSortField: "priority",
  defaultSortDirection: "asc",

  formSections: [
    {
      id: "promotion-information",
      title: "Información de la promoción",
      description:
        "Datos generales, vigencia y clasificación de la promoción.",
      order: 1,
      columns: 2,
      visible: true,
    },
    {
      id: "applicability",
      title: "Aplicabilidad",
      description:
        "Productos, beneficios y condiciones comerciales que recibirá el cliente.",
      order: 2,
      columns: 2,
      visible: true,
    },
    {
      id: "application-rules",
      title: "Reglas de aplicación",
      description:
        "Canales, formas de pago, límites y segmentos permitidos.",
      order: 3,
      columns: 2,
      visible: true,
    },
    {
      id: "ownership-information",
      title: "Información del propietario",
      description:
        "Responsable y datos de auditoría del registro.",
      order: 4,
      columns: 2,
      visible: true,
    },
  ],

  fields: [
    {
      key: "promotionName",
      zohoApiName: "Name",

      label: "Nombre de la promoción",
      description:
        "Nombre comercial con el que se identificará la promoción.",
      placeholder: "Ej. 12 MSI Dominar",

      type: "text",
      required: true,

      validation: {
        minLength: 3,
        maxLength: 120,
        message:
          "El nombre de la promoción debe tener entre 3 y 120 caracteres.",
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 1,
      tableOrder: 1,
      detailOrder: 1,

      tableWidth: "260px",

      formSectionId: "promotion-information",
      formRow: 1,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "status",
      zohoApiName: "Estado",

      label: "Estado",
      description:
        "Datara determina el estado con base en la vigencia y las reglas de la promoción.",

      type: "select",
      required: false,
      readOnly: true,
      defaultValue: "Programada",

      options: [
        {
          label: "Activa",
          value: "Activa",
        },
        {
          label: "Programada",
          value: "Programada",
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

      formOrder: 2,
      tableOrder: 2,
      detailOrder: 2,

      tableWidth: "150px",

      formSectionId: "promotion-information",
      formRow: 1,
      formColumn: 2,
      formSpan: 1,
      formVariant: "readonly",
    },

    {
      key: "promotionStart",
      zohoApiName: "Inicio_de_promoci_n",

      label: "Inicio de promoción",
      description:
        "Fecha y hora a partir de la cual puede aplicarse la promoción.",

      type: "datetime",
      required: true,

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 3,
      tableOrder: 4,
      detailOrder: 3,

      tableWidth: "200px",

      formSectionId: "promotion-information",
      formRow: 2,
      formColumn: 1,
      formSpan: 1,
      formVariant: "compact",
    },

    {
      key: "promotionEnd",
      zohoApiName: "Fin_de_promoci_n",

      label: "Fin de promoción",
      description:
        "Fecha y hora hasta la cual permanecerá disponible la promoción.",

      type: "datetime",
      required: true,

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 4,
      tableOrder: 5,
      detailOrder: 4,

      tableWidth: "200px",

      formSectionId: "promotion-information",
      formRow: 2,
      formColumn: 2,
      formSpan: 1,
      formVariant: "compact",
    },

    {
      key: "promotionGroup",
      zohoApiName: "Grupo_de_Promoci_n",

      label: "Grupo de promoción",
      description:
        "Clasificación interna de la promoción.",

      type: "select",
      required: true,

      options: [
        {
          label: "Condición comercial",
          value: "Condición comercial",
        },
        {
          label: "Regalo",
          value: "Regalo",
        },
        {
          label: "Seguro",
          value: "Seguro",
        },
        {
          label: "Accesorios",
          value: "Accesorios",
        },
        {
          label: "Servicio",
          value: "Servicio",
        },
        {
          label: "Otro",
          value: "Otro",
        },
      ],

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 5,
      detailOrder: 5,

      formSectionId: "promotion-information",
      formRow: 3,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "priority",
      zohoApiName: "Prioridad",

      label: "Prioridad",
      description:
        "Orden en el que se evaluará cuando existan varias promociones aplicables.",
      placeholder: "1",

      type: "number",
      required: true,
      defaultValue: 1,

      validation: {
        min: 1,
        max: 5,
        message:
          "La prioridad debe estar entre 1 y 5.",
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 6,
      tableOrder: 3,
      detailOrder: 6,

      tableWidth: "110px",

      formSectionId: "promotion-information",
      formRow: 3,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "conditions",
      zohoApiName: "Descripci_n",

      label: "Descripción y condiciones",
      description:
        "Reglas, restricciones y condiciones comerciales de la promoción.",
      placeholder:
        "Ej. Sujeto a disponibilidad y autorización de crédito.",

      type: "textarea",
      required: false,

      validation: {
        maxLength: 2000,
        message:
          "La descripción no puede superar los 2,000 caracteres.",
      },

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 7,
      detailOrder: 7,

      formSectionId: "promotion-information",
      formRow: 4,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "paused",
      zohoApiName: "Pausada",

      label: "Promoción pausada",
      description:
        "Suspende temporalmente la aplicación de la promoción.",

      type: "checkbox",
      required: false,
      defaultValue: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 8,
      detailOrder: 8,

      formSectionId: "promotion-information",
      formRow: 4,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "applicableProducts",
      zohoApiName: "Productos_aplicables",

      label: "Productos aplicables",
      description:
        "Motocicletas a las que puede aplicarse esta promoción.",
      placeholder: "Buscar motocicletas",

      type: "lookup",
      required: false,

      /*
       * Se llenará desde el módulo Products de Zoho.
       */
      options: [],

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 9,
      detailOrder: 9,

      formSectionId: "applicability",
      formRow: 1,
      formColumn: 1,
      formSpan: 1,
      formVariant: "searchable",
    },

    {
      key: "benefitType",
      zohoApiName: "Tipo_de_beneficio",

      label: "Tipo de beneficio",
      description:
        "Beneficio principal que recibirá el cliente.",

      type: "select",
      required: true,

      options: [
        {
          label: "Descuento (%)",
          value: "Descuento (%)",
        },
        {
          label: "Descuento ($)",
          value: "Descuento ($)",
        },
        {
          label: "Accesorio gratis",
          value: "Accesorio gratis",
        },
        {
          label: "Seguro gratis",
          value: "Seguro gratis",
        },
        {
          label: "Servicio gratis",
          value: "Servicio gratis",
        },
        {
          label: "Meses sin intereses",
          value: "Meses sin intereses",
        },
        {
          label: "Bono",
          value: "Bono",
        },
      ],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 10,
      tableOrder: 6,
      detailOrder: 10,

      tableWidth: "190px",

      formSectionId: "applicability",
      formRow: 1,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "value",
      zohoApiName: "Valor",

      label: "Valor",
      description:
        "Monto, porcentaje o valor numérico asociado al beneficio.",
      placeholder: "0",

      type: "number",
      required: false,

      validation: {
        min: 0,
        message:
          "El valor no puede ser menor a cero.",
      },

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 11,
      detailOrder: 11,

      formSectionId: "applicability",
      formRow: 2,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "availableMonths",
      zohoApiName: "Meses_disponibles",

      label: "Meses disponibles",
      description:
        "Plazos permitidos cuando el beneficio sea meses sin intereses.",

      type: "multiselect",
      required: false,

      options: [
        {
          label: "3 meses",
          value: "3",
        },
        {
          label: "6 meses",
          value: "6",
        },
        {
          label: "9 meses",
          value: "9",
        },
        {
          label: "12 meses",
          value: "12",
        },
        {
          label: "18 meses",
          value: "18",
        },
        {
          label: "24 meses",
          value: "24",
        },
        {
          label: "48 meses",
          value: "48",
        },
      ],

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 12,
      detailOrder: 12,

      formSectionId: "applicability",
      formRow: 2,
      formColumn: 2,
      formSpan: 1,
      formVariant: "tags",
    },

    {
      key: "commercialMessage",
      zohoApiName: "Mensaje_comercial",

      label: "Mensaje comercial",
      description:
        "Mensaje que podrá utilizarse para comunicar la promoción.",
      placeholder:
        "Ej. Llévate tu motocicleta a 12 meses sin intereses.",

      type: "textarea",
      required: false,

      validation: {
        maxLength: 1000,
        message:
          "El mensaje comercial no puede superar los 1,000 caracteres.",
      },

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 13,
      detailOrder: 13,

      formSectionId: "applicability",
      formRow: 3,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "requiresSelection",
      zohoApiName: "Requiere_elecci_n",

      label: "Requiere elección",
      description:
        "Indica si el usuario debe elegir entre varias alternativas del beneficio.",

      type: "checkbox",
      required: false,
      defaultValue: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 14,
      detailOrder: 14,

      formSectionId: "applicability",
      formRow: 3,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "paymentMethod",
      zohoApiName: "Forma_de_pago",

      label: "Forma de pago",
      description:
        "Método de pago requerido para utilizar la promoción.",

      type: "select",
      required: true,

      options: [
        {
          label: "Contado",
          value: "Contado",
        },
        {
          label: "Financiamiento",
          value: "Financiamiento",
        },
        {
          label: "Ambos",
          value: "Ambos",
        },
      ],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 15,
      tableOrder: 7,
      detailOrder: 15,

      tableWidth: "170px",

      formSectionId: "application-rules",
      formRow: 1,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "minimumDownPayment",
      zohoApiName: "Enganche_m_nimo1",

      label: "Enganche mínimo (%)",
      description:
        "Porcentaje mínimo requerido cuando se utilice financiamiento.",
      placeholder: "20",

      type: "percentage",
      required: false,

      validation: {
        min: 0,
        max: 100,
        message:
          "El enganche debe estar entre 0% y 100%.",
      },

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 16,
      detailOrder: 16,

      formSectionId: "application-rules",
      formRow: 1,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "channel",
      zohoApiName: "Canal_aplicable",

      label: "Canal aplicable",
      description:
        "Canales comerciales en los que estará disponible la promoción.",

      type: "multiselect",
      required: true,

      options: [
        {
          label: "Todos",
          value: "Todos",
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
          label: "WhatsApp",
          value: "WhatsApp",
        },
        {
          label: "Sitio web",
          value: "Sitio web",
        },
        {
          label: "Tienda física",
          value: "Tienda física",
        },
        {
          label: "Referido",
          value: "Referido",
        },
        {
          label: "Llamada",
          value: "Llamada",
        },
        {
          label: "Campaña",
          value: "Campaña",
        },
        {
          label: "Marketplace",
          value: "Marketplace",
        },
      ],

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 17,
      detailOrder: 17,

      formSectionId: "application-rules",
      formRow: 2,
      formColumn: 1,
      formSpan: 1,
      formVariant: "tags",
    },

    {
      key: "customerType",
      zohoApiName: "Tipo_de_cliente",

      label: "Tipo de cliente",
      description:
        "Segmento de clientes al que está dirigida la promoción.",

      type: "select",
      required: true,

      options: [
        {
          label: "Todos",
          value: "Todos",
        },
        {
          label: "Nuevo",
          value: "Nuevo",
        },
        {
          label: "Recurrente",
          value: "Recurrente",
        },
      ],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 18,
      tableOrder: 8,
      detailOrder: 18,

      tableWidth: "160px",

      formSectionId: "application-rules",
      formRow: 2,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "limitPromotion",
      zohoApiName: "Limitar_promoci_n",

      label: "Limitar promoción",
      description:
        "Permite establecer una cantidad máxima de beneficios.",

      type: "checkbox",
      required: false,
      defaultValue: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 19,
      detailOrder: 19,

      formSectionId: "application-rules",
      formRow: 3,
      formColumn: 1,
      formSpan: 1,
    },

    {
      key: "maximumBenefits",
      zohoApiName: "M_ximo_de_beneficios",

      label: "Máximo de beneficios",
      description:
        "Cantidad máxima de veces que puede utilizarse la promoción.",
      placeholder: "50",

      type: "number",
      required: false,

      validation: {
        min: 1,
        message:
          "El máximo de beneficios debe ser mayor a cero.",
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 20,
      tableOrder: 9,
      detailOrder: 20,

      tableWidth: "150px",

      formSectionId: "application-rules",
      formRow: 3,
      formColumn: 2,
      formSpan: 1,
    },

    {
      key: "usedBenefits",
      zohoApiName: "Beneficios_entregados",

      label: "Beneficios entregados",
      description:
        "Cantidad de beneficios que ya fueron utilizados.",

      type: "number",
      required: false,
      readOnly: true,
      defaultValue: 0,

      validation: {
        min: 0,
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 21,
      tableOrder: 10,
      detailOrder: 21,

      tableWidth: "160px",

      formSectionId: "application-rules",
      formRow: 4,
      formColumn: 2,
      formSpan: 1,
      formVariant: "readonly",
    },

    {
      key: "owner",
      zohoApiName: "Owner",

      label: "Propietario de la promoción",
      description:
        "Usuario responsable de administrar la promoción.",

      type: "lookup",
      required: false,
      readOnly: true,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 22,
      detailOrder: 22,

      formSectionId: "ownership-information",
      formRow: 1,
      formColumn: 1,
      formSpan: 1,
      formVariant: "readonly",
    },

    {
      key: "createdTime",
      zohoApiName: "Created_Time",

      label: "Fecha de creación",

      type: "datetime",
      required: false,
      readOnly: true,

      showInForm: false,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      detailOrder: 23,

      formSectionId: "ownership-information",
      formRow: 1,
      formColumn: 2,
      formSpan: 1,
      formVariant: "readonly",
    },

    {
      key: "modifiedTime",
      zohoApiName: "Modified_Time",

      label: "Última modificación",

      type: "datetime",
      required: false,
      readOnly: true,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 23,
      detailOrder: 24,

      formSectionId: "ownership-information",
      formRow: 2,
      formColumn: 1,
      formSpan: 1,
      formVariant: "readonly",
    },
  ],
};

export default promotionsModule;