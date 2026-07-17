import type { CRMModuleConfig } from "@/types/crm-config";

export const leadsModule: CRMModuleConfig = {
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

  searchFields: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "leadStatus",
  ],

  defaultSortField: "createdTime",
  defaultSortDirection: "desc",

  fields: [
    {
      key: "firstName",
      zohoApiName: "First_Name",

      label: "Nombre",
      placeholder: "Nombre del prospecto",

      type: "text",

      required: false,

      validation: {
        maxLength: 40,
        message: "El nombre no puede superar los 40 caracteres.",
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 1,
      tableOrder: 1,
      detailOrder: 1,

      tableWidth: "170px",
    },

    {
      key: "lastName",
      zohoApiName: "Last_Name",

      label: "Apellidos",
      placeholder: "Apellidos del prospecto",

      type: "text",

      required: true,

      validation: {
        maxLength: 80,
        message: "Los apellidos no pueden superar los 80 caracteres.",
      },

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 2,
      tableOrder: 2,
      detailOrder: 2,

      tableWidth: "190px",
    },

    {
      key: "email",
      zohoApiName: "Email",

      label: "Correo electrónico",
      placeholder: "correo@ejemplo.com",

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
    },

    {
      key: "phone",
      zohoApiName: "Phone",

      label: "Teléfono",
      placeholder: "55 0000 0000",

      type: "phone",

      required: true,

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: false,

      formOrder: 4,
      tableOrder: 4,
      detailOrder: 4,

      tableWidth: "160px",
    },

    {
      key: "mobile",
      zohoApiName: "Mobile",

      label: "Teléfono móvil",
      placeholder: "55 0000 0000",

      type: "phone",

      required: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 5,
      detailOrder: 5,
    },

    {
      key: "leadSource",
      zohoApiName: "Lead_Source",

      label: "Origen del prospecto",
      description:
        "Canal mediante el cual el prospecto conoció la agencia.",

      type: "select",

      required: false,

      options: [
        {
          label: "Tienda física",
          value: "Tienda física",
        },
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
          label: "WhatsApp",
          value: "WhatsApp",
        },
        {
          label: "Referido",
          value: "Referido",
        },
        {
          label: "Otro",
          value: "Otro",
        },
      ],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 6,
      tableOrder: 5,
      detailOrder: 6,

      tableWidth: "170px",
    },

    {
      key: "leadStatus",
      zohoApiName: "Lead_Status",

      label: "Estado del prospecto",

      type: "select",

      required: true,

      defaultValue: "Nuevo",

      options: [
        {
          label: "Nuevo",
          value: "Nuevo",
        },
        {
          label: "Contactado",
          value: "Contactado",
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
      ],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 7,
      tableOrder: 6,
      detailOrder: 7,

      tableWidth: "160px",
    },

    {
      key: "motorcycleModel",
      zohoApiName: "Modelo_de_interes",

      label: "Modelo de interés",
      description:
        "Motocicleta por la que el prospecto mostró interés.",

      placeholder: "Selecciona un modelo",

      type: "lookup",

      required: false,

      /*
       * Las opciones se cargarán desde el módulo Motocicletas
       * cuando conectemos Datara con Zoho.
       */
      options: [],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 8,
      tableOrder: 7,
      detailOrder: 8,

      tableWidth: "190px",
    },

    {
      key: "testDriveRequested",
      zohoApiName: "Prueba_de_manejo_solicitada",

      label: "Prueba de manejo solicitada",

      type: "checkbox",

      required: false,

      defaultValue: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: true,

      formOrder: 9,
      detailOrder: 9,
    },

    {
      key: "preferredContactDate",
      zohoApiName: "Fecha_de_contacto_preferida",

      label: "Fecha de contacto preferida",

      type: "datetime",

      required: false,

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 10,
      detailOrder: 10,
    },

    {
      key: "assignedTo",
      zohoApiName: "Owner",

      label: "Responsable",

      type: "lookup",

      required: true,

      /*
       * Se llenará con los usuarios disponibles en la
       * organización correspondiente de Zoho CRM.
       */
      options: [],

      showInForm: true,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      formOrder: 11,
      tableOrder: 8,
      detailOrder: 11,

      tableWidth: "180px",
    },

    {
      key: "description",
      zohoApiName: "Description",

      label: "Notas",
      placeholder:
        "Agrega comentarios, necesidades o información relevante del prospecto.",

      type: "textarea",

      required: false,

      validation: {
        maxLength: 2000,
        message: "Las notas no pueden superar los 2,000 caracteres.",
      },

      showInForm: true,
      showInTable: false,
      showInDetail: true,
      showInFilters: false,

      formOrder: 12,
      detailOrder: 12,
    },

    {
      key: "createdTime",
      zohoApiName: "Created_Time",

      label: "Fecha de registro",

      type: "datetime",

      required: false,
      readOnly: true,

      showInForm: false,
      showInTable: true,
      showInDetail: true,
      showInFilters: true,

      tableOrder: 9,
      detailOrder: 13,

      tableWidth: "190px",
    },
  ],
};

export default leadsModule;