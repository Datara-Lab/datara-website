"use client";

import {
  useMemo,
} from "react";

import {
  useOrganization,
} from "@clerk/nextjs";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  getCRMIndustryConfig,
  getCRMModuleConfig,
  getCRMNavigationConfig,
} from "@/lib/crm-config";

import {
  resolveCRMIndustryProfile,
} from "@/config/crm/industries/industry-profiles";

export function useCRMConfig() {
  const {
    user,
  } = useAuth();

  const {
    organization,
  } = useOrganization();

  const industryProfile =
    useMemo(() => {
      const metadata =
        organization
          ?.publicMetadata;

      if (
        typeof metadata !==
          "object" ||
        metadata === null
      ) {
        return null;
      }

      const value =
        (
          metadata as {
            industryProfile?: unknown;
          }
        ).industryProfile;

      return resolveCRMIndustryProfile(
        user?.industry ?? "",
        value,
      );
    }, [organization, user?.industry]);

  const tenantConfig =
    useMemo(() => {
      if (
        !user ||
        !user.industry
      ) {
        return null;
      }

      return getCRMIndustryConfig(
        user.industry,
        user.tenantId,
        user.tenantName,
        industryProfile,
      );
    }, [
      user,
      industryProfile,
    ]);

  const navigation =
    useMemo(
      () =>
        getCRMNavigationConfig(
          tenantConfig,
          user?.role,
        ),
      [
        tenantConfig,
        user?.role,
      ],
    );

  function getModule(
    moduleId: string,
  ) {
    return getCRMModuleConfig(
      tenantConfig,
      moduleId,
    );
  }

  return {
    tenantId:
      user?.tenantId ??
      null,

    industry:
      user?.industry ??
      null,

    industryProfile,

    tenantConfig,
    navigation,
    getModule,

    isConfigured:
      Boolean(
        tenantConfig,
      ),
  };
}
