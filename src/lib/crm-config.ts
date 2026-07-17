import bajajIzcalliCRMConfig from "@/config/crm/bajaj-izcalli/index";

import type {
  CRMModuleConfig,
  CRMNavigationItemConfig,
  CRMNavigationRole,
  CRMNavigationSectionConfig,
  CRMTenantConfig,
} from "@/types/crm-config";

const crmTenantConfigs: Record<string, CRMTenantConfig> = {
  "bajaj-izcalli": bajajIzcalliCRMConfig,
};

export function getCRMTenantConfig(
  tenantId: string,
): CRMTenantConfig | null {
  return crmTenantConfigs[tenantId] ?? null;
}

export function getCRMModuleConfig(
  tenantId: string,
  moduleId: string,
): CRMModuleConfig | null {
  const tenantConfig = getCRMTenantConfig(tenantId);

  if (!tenantConfig) {
    return null;
  }

  return (
    tenantConfig.modules.find(
      (module) => module.id === moduleId,
    ) ?? null
  );
}

export function getCRMNavigationSectionsConfig(
  tenantId: string,
  role?: string,
): CRMNavigationSectionConfig[] {
  const tenantConfig = getCRMTenantConfig(tenantId);

  if (!tenantConfig) {
    return [];
  }

  const normalizedRole =
    role?.trim().toLowerCase() as
      | CRMNavigationRole
      | undefined;

  return [...tenantConfig.navigationSections]
    .filter((section) => section.visible !== false)
    .filter((section) => {
      if (
        !section.allowedRoles ||
        section.allowedRoles.length === 0
      ) {
        return true;
      }

      if (!normalizedRole) {
        return false;
      }

      return section.allowedRoles.includes(
        normalizedRole,
      );
    })
    .sort((a, b) => a.order - b.order);
}

export function getCRMNavigationConfig(
  tenantId: string,
  role?: string,
): CRMNavigationItemConfig[] {
  const tenantConfig = getCRMTenantConfig(tenantId);

  if (!tenantConfig) {
    return [];
  }

  const normalizedRole =
    role?.trim().toLowerCase() as
      | CRMNavigationRole
      | undefined;

  return [...tenantConfig.navigation]
    .filter((item) => item.visible !== false)
    .filter((item) => item.status !== "hidden")
    .filter((item) => {
      if (
        !item.allowedRoles ||
        item.allowedRoles.length === 0
      ) {
        return true;
      }

      if (!normalizedRole) {
        return false;
      }

      return item.allowedRoles.includes(
        normalizedRole,
      );
    })
    .sort((a, b) => {
      if (a.sectionId === b.sectionId) {
        return a.order - b.order;
      }

      return a.sectionId.localeCompare(
        b.sectionId,
      );
    });
}

export function hasCRMModule(
  tenantId: string,
  moduleId: string,
): boolean {
  return Boolean(
    getCRMModuleConfig(tenantId, moduleId),
  );
}