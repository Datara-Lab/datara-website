import type {
  CRMIndustryRoleConfig,
  CRMIndustryRolePermissionConfig,
} from "@/types/crm-config";

const crmModules = [
  "products",
  "leads",
  "contacts",
  "deals",
  "quotes",
  "sales-orders",
  "inventory",
  "services",
  "promotions",
  "activities",
  "documents",
  "campaigns",
  "crm-users",
  "crm-settings",
  "integrations",
  "automations",
  "crm-analytics",
] as const;

type CRMModuleId =
  typeof crmModules[number];

function createPermissions(
  moduleIds:
    readonly CRMModuleId[],
  permissions:
    Omit<
      CRMIndustryRolePermissionConfig,
      "moduleId"
    >,
): CRMIndustryRolePermissionConfig[] {
  return moduleIds.map(
    (moduleId) => ({
      moduleId,
      ...permissions,
    }),
  );
}

const commercialModules = [
  "leads",
  "contacts",
  "deals",
  "quotes",
  "sales-orders",
  "activities",
  "documents",
] as const;

const commercialReferenceModules = [
  "products",
  "promotions",
  "inventory",
  "crm-analytics",
] as const;

const marketingModules = [
  "leads",
  "promotions",
  "activities",
  "documents",
  "campaigns",
  "integrations",
  "automations",
] as const;

const marketingReferenceModules = [
  "products",
  "contacts",
  "deals",
  "crm-analytics",
] as const;

export const baseCRMProductRoles:
  CRMIndustryRoleConfig[] = [
  {
    key: "crm_admin",
    name: "Administrador CRM",
    product: "crm",
    description:
      "Administra todos los módulos y configuraciones de Datara CRM.",
    permissions:
      createPermissions(
        crmModules,
        {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canManage: true,
        },
      ),
  },
  {
    key: "crm_manager",
    name: "Gerente comercial",
    product: "crm",
    description:
      "Supervisa equipos, oportunidades, cotizaciones y resultados comerciales.",
    permissions: [
      ...createPermissions(
        crmModules,
        {
          canView: true,
        },
      ),
      ...createPermissions(
        [
          ...commercialModules,
          "inventory",
          "services",
          "promotions",
        ],
        {
          canView: true,
          canCreate: true,
          canEdit: true,
        },
      ),
      ...createPermissions(
        [
          "crm-users",
          "crm-analytics",
        ],
        {
          canView: true,
          canManage: true,
        },
      ),
    ],
  },
  {
    key: "crm_sales",
    name: "Vendedor",
    product: "crm",
    description:
      "Administra prospectos, clientes, oportunidades y actividades asignadas.",
    permissions: [
      ...createPermissions(
        commercialModules,
        {
          canView: true,
          canCreate: true,
          canEdit: true,
        },
      ),
      ...createPermissions(
        commercialReferenceModules,
        {
          canView: true,
        },
      ),
    ],
  },
  {
    key: "crm_marketing",
    name: "Marketing",
    product: "crm",
    description:
      "Administra campañas, promociones y generación de prospectos.",
    permissions: [
      ...createPermissions(
        marketingModules,
        {
          canView: true,
          canCreate: true,
          canEdit: true,
        },
      ),
      ...createPermissions(
        marketingReferenceModules,
        {
          canView: true,
        },
      ),
    ],
  },
  {
    key: "crm_readonly",
    name: "Solo lectura CRM",
    product: "crm",
    description:
      "Puede consultar información del CRM sin modificarla.",
    permissions:
      createPermissions(
        crmModules,
        {
          canView: true,
        },
      ),
  },
];

export default baseCRMProductRoles;
