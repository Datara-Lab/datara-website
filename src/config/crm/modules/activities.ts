import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

type CreateActivitiesModuleOptions = {
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;
};

const typeOptions:
  CRMFieldOption[] = [
  {
    label: "Tarea",
    value: "task",
  },
  {
    label: "Llamada",
    value: "call",
  },
  {
    label: "Reunión",
    value: "meeting",
  },
];

const priorityOptions:
  CRMFieldOption[] = [
  {
    label: "Baja",
    value: "Baja",
  },
  {
    label: "Normal",
    value: "Normal",
  },
  {
    label: "Alta",
    value: "Alta",
  },
  {
    label: "Urgente",
    value: "Urgente",
  },
];

export function createActivitiesModule(
  options:
    CreateActivitiesModuleOptions = {},
): CRMModuleConfig {
  const singularLabel =
    options.singularLabel ??
    "Actividad";

  const pluralLabel =
    options.pluralLabel ??
    "Actividades";

  return {
    id: "activities",

    singularLabel,
    pluralLabel,

    description:
      options.description ??
      "Tareas, llamadas y reuniones relacionadas con la operación comercial.",

    route: "/crm/agenda",
    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: true,

    searchFields: [
      "subject",
      "type",
      "status",
      "priority",
      "relatedName",
      "ownerName",
    ],

    defaultSortField:
      "startAt",

    defaultSortDirection:
      "asc",

    fields: [
      {
        key: "subject",
        label: "Asunto",

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
        key: "type",
        label:
          "Tipo de actividad",

        type: "select",
        required: true,
        options: typeOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "140px",
      },

      {
        key: "status",
        label: "Estado",

        type: "select",
        required: true,
        options: [],

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "150px",
      },

      {
        key: "priority",
        label: "Prioridad",

        type: "select",
        required: true,
        options:
          priorityOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 4,
        detailOrder: 4,
        tableWidth: "130px",
      },

      {
        key: "startAt",
        label: "Inicio",

        type: "datetime",

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 5,
        detailOrder: 5,
        tableWidth: "180px",
      },

      {
        key: "dueAt",
        label:
          "Fecha de vencimiento",

        type: "datetime",

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 6,
        detailOrder: 6,
        tableWidth: "180px",
      },

      {
        key: "relatedName",
        label: "Relacionado con",

        type: "lookup",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 7,
        detailOrder: 7,
        tableWidth: "220px",
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

export default createActivitiesModule;
