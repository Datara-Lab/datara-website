"use client";

import { useMemo } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  getCRMModuleConfig,
  getCRMNavigationConfig,
  getCRMTenantConfig,
} from "@/lib/crm-config";

const demoTenantMap: Record<string, string> = {
  "bajaj-izcalli": "bajaj-izcalli",
  "bajaj izcalli": "bajaj-izcalli",
  "datara-lab": "bajaj-izcalli",
  motoraton: "bajaj-izcalli",
  "datara lab": "bajaj-izcalli",
  datara: "bajaj-izcalli",
  tenant_datara: "bajaj-izcalli",
};

function normalizeTenantValue(
  value?: string,
): string {
  return value?.trim().toLowerCase() ?? "";
}

export function useCRMConfig() {
  const { user } = useAuth();

  const resolvedTenantId = useMemo(() => {
    if (!user) {
      return null;
    }

    const normalizedTenantId =
      normalizeTenantValue(user.tenantId);

    if (
      getCRMTenantConfig(
        normalizedTenantId,
      )
    ) {
      return normalizedTenantId;
    }

    const tenantFromId =
      demoTenantMap[normalizedTenantId];

    if (tenantFromId) {
      return tenantFromId;
    }

    const normalizedTenantName =
      normalizeTenantValue(
        user.tenantName,
      );

    return (
      demoTenantMap[
        normalizedTenantName
      ] ?? null
    );
  }, [user]);

  const tenantConfig = useMemo(() => {
    if (!resolvedTenantId) {
      return null;
    }

    return getCRMTenantConfig(
      resolvedTenantId,
    );
  }, [resolvedTenantId]);

  const navigation = useMemo(() => {
    if (!resolvedTenantId) {
      return [];
    }

    return getCRMNavigationConfig(
      resolvedTenantId,
      user?.role,
    );
  }, [
    resolvedTenantId,
    user?.role,
  ]);

  function getModule(
    moduleId: string,
  ) {
    if (!resolvedTenantId) {
      return null;
    }

    return getCRMModuleConfig(
      resolvedTenantId,
      moduleId,
    );
  }

  return {
    tenantId: resolvedTenantId,
    tenantConfig,
    navigation,
    getModule,
    isConfigured:
      Boolean(tenantConfig),
  };
}