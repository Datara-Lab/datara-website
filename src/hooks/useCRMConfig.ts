"use client";

import {
  useMemo,
} from "react";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  getCRMIndustryConfig,
  getCRMModuleConfig,
  getCRMNavigationConfig,
} from "@/lib/crm-config";

export function useCRMConfig() {
  const {
    user,
  } = useAuth();

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
      );
    }, [
      user,
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

    tenantConfig,
    navigation,
    getModule,

    isConfigured:
      Boolean(
        tenantConfig,
      ),
  };
}