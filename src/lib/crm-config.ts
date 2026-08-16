import {
  createMotorcycleDealershipCRMConfig,
} from "@/config/crm/industries/create-motorcycle-dealership-config";

import {
  createProfessionalServicesCRMConfig,
} from "@/config/crm/industries/create-professional-services-config";

import type {
  CRMModuleConfig,
  CRMNavigationItemConfig,
  CRMNavigationRole,
  CRMNavigationSectionConfig,
  CRMTenantConfig,
} from "@/types/crm-config";

export function getCRMIndustryConfig(
  industry: string,
  tenantId: string,
  tenantName: string,
): CRMTenantConfig | null {
  if (
    industry ===
    "motorcycle_dealership"
  ) {
    return createMotorcycleDealershipCRMConfig({
      tenantId,
      tenantName,
    });
  }

  if (
    industry ===
    "professional_services"
  ) {
    return createProfessionalServicesCRMConfig({
      tenantId,
      tenantName,
    });
  }

  return null;
}

export function getCRMModuleConfig(
  tenantConfig:
    | CRMTenantConfig
    | null,
  moduleId: string,
): CRMModuleConfig | null {
  if (!tenantConfig) {
    return null;
  }

  return (
    tenantConfig.modules.find(
      (module) =>
        module.id ===
        moduleId,
    ) ?? null
  );
}

export function getCRMNavigationSectionsConfig(
  tenantConfig:
    | CRMTenantConfig
    | null,
  role?: string,
): CRMNavigationSectionConfig[] {
  if (!tenantConfig) {
    return [];
  }

  const normalizedRole =
    role
      ?.trim()
      .toLowerCase() as
        | CRMNavigationRole
        | undefined;

  return [
    ...tenantConfig
      .navigationSections,
  ]
    .filter(
      (section) =>
        section.visible !==
        false,
    )
    .filter((section) => {
      if (
        !section.allowedRoles ||
        section.allowedRoles
          .length === 0
      ) {
        return true;
      }

      if (!normalizedRole) {
        return false;
      }

      return section
        .allowedRoles
        .includes(
          normalizedRole,
        );
    })
    .sort(
      (first, second) =>
        first.order -
        second.order,
    );
}

export function getCRMNavigationConfig(
  tenantConfig:
    | CRMTenantConfig
    | null,
  role?: string,
): CRMNavigationItemConfig[] {
  if (!tenantConfig) {
    return [];
  }

  const normalizedRole =
    role
      ?.trim()
      .toLowerCase() as
        | CRMNavigationRole
        | undefined;

  const sectionOrder =
    new Map(
      tenantConfig
        .navigationSections
        .map(
          (section) => [
            section.id,
            section.order,
          ],
        ),
    );

  return [
    ...tenantConfig.navigation,
  ]
    .filter(
      (item) =>
        item.visible !== false,
    )
    .filter(
      (item) =>
        item.status !==
        "hidden",
    )
    .filter((item) => {
      if (
        !item.allowedRoles ||
        item.allowedRoles
          .length === 0
      ) {
        return true;
      }

      if (!normalizedRole) {
        return false;
      }

      return item
        .allowedRoles
        .includes(
          normalizedRole,
        );
    })
    .sort((first, second) => {
      if (
        first.sectionId ===
        second.sectionId
      ) {
        return (
          first.order -
          second.order
        );
      }

      const firstSectionOrder =
        sectionOrder.get(
          first.sectionId,
        ) ??
        Number.MAX_SAFE_INTEGER;

      const secondSectionOrder =
        sectionOrder.get(
          second.sectionId,
        ) ??
        Number.MAX_SAFE_INTEGER;

      return (
        firstSectionOrder -
        secondSectionOrder
      );
    });
}

export function hasCRMModule(
  tenantConfig:
    | CRMTenantConfig
    | null,
  moduleId: string,
): boolean {
  return Boolean(
    getCRMModuleConfig(
      tenantConfig,
      moduleId,
    ),
  );
}