import type {
  CRMFieldOption,
  CRMModuleConfig,
} from "@/types/crm-config";

const statusOptions:
  CRMFieldOption[] = [
  {
    label: "Borrador",
    value: "Borrador",
  },
  {
    label: "Programada",
    value: "Programada",
  },
  {
    label: "En proceso",
    value: "En proceso",
  },
  {
    label: "Pausada",
    value: "Pausada",
  },
  {
    label: "Completada",
    value: "Completada",
  },
  {
    label: "Cancelada",
    value: "Cancelada",
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

export function createServicesModule(): CRMModuleConfig {
  return {
    id: "services",

    singularLabel: "Servicio",
    pluralLabel: "Servicios",

    description:
      "Órdenes de servicio y atención de taller para motocicletas.",

    route: "/crm/servicios",
    primaryView: "table",

    allowCreate: true,
    allowEdit: true,
    allowDelete: false,
    allowExport: false,

    searchFields: [
      "reference",
      "customerName",
      "unitModel",
      "unitPlate",
      "unitIdentifier",
      "status",
      "ownerName",
    ],

    defaultSortField:
      "createdTime",

    defaultSortDirection:
      "desc",

    fields: [
      {
        key: "reference",
        label: "Orden",

        type: "text",
        readOnly: true,

        showInForm: false,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 1,
        detailOrder: 1,
        tableWidth: "160px",
      },
      {
        key: "customerName",
        label: "Cliente",

        type: "lookup",
        required: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "220px",
      },
      {
        key: "unitModel",
        label: "Motocicleta",

        type: "text",
        required: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 3,
        detailOrder: 3,
        tableWidth: "220px",
      },
      {
        key: "serviceType",
        label:
          "Tipo de servicio",

        type: "text",
        required: true,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 4,
        detailOrder: 4,
        tableWidth: "190px",
      },
      {
        key: "status",
        label: "Estado",

        type: "select",
        required: true,
        options: statusOptions,

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 5,
        detailOrder: 5,
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

        tableOrder: 6,
        detailOrder: 6,
        tableWidth: "130px",
      },
      {
        key: "scheduledAt",
        label: "Programada",

        type: "datetime",

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: true,

        tableOrder: 7,
        detailOrder: 7,
        tableWidth: "180px",
      },
      {
        key: "owner",
        label: "Responsable",

        type: "lookup",

        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,

        tableOrder: 8,
        detailOrder: 8,
        tableWidth: "190px",
      },
      {
        key: "reportedProblem",
        label:
          "Problema reportado",

        type: "textarea",
        required: true,

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 9,
      },
      {
        key: "diagnosis",
        label: "Diagnóstico",

        type: "textarea",

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 10,
      },
      {
        key: "result",
        label: "Resultado",

        type: "textarea",

        showInForm: true,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,

        detailOrder: 11,
      },
    ],
  };
}

export default createServicesModule;