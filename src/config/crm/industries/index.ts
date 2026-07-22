import type {
  CRMIndustry,
  CRMIndustryTemplateConfig,
} from "@/types/crm-config";

import {
  motorcycleDealershipTemplate,
} from "./motorcycle-dealership";

function createPendingTemplate(
  id: CRMIndustry,
  name: string,
  description: string,
): CRMIndustryTemplateConfig {
  return {
    id,
    name,
    description,

    terminology: {
      modules: {},
      fields: {},
    },

    defaultModules: [],

    defaultCatalogs: {},
  };
}

const industryTemplates: Record<
  CRMIndustry,
  CRMIndustryTemplateConfig
> = {
  motorcycle_dealership:
    motorcycleDealershipTemplate,

  automotive_dealership:
    createPendingTemplate(
      "automotive_dealership",
      "Agencia automotriz",
      "Plantilla pendiente de configuración.",
    ),

  veterinary:
    createPendingTemplate(
      "veterinary",
      "Veterinaria",
      "Plantilla pendiente de configuración.",
    ),

  real_estate:
    createPendingTemplate(
      "real_estate",
      "Inmobiliaria",
      "Plantilla pendiente de configuración.",
    ),

  retail:
    createPendingTemplate(
      "retail",
      "Comercio",
      "Plantilla pendiente de configuración.",
    ),

  professional_services:
    createPendingTemplate(
      "professional_services",
      "Servicios profesionales",
      "Plantilla pendiente de configuración.",
    ),

  other:
    createPendingTemplate(
      "other",
      "Otra industria",
      "Configuración general de CRM.",
    ),
};

export function getCRMIndustryTemplate(
  industry: CRMIndustry,
): CRMIndustryTemplateConfig {
  return industryTemplates[industry];
}

export function getCRMIndustryTemplates():
  CRMIndustryTemplateConfig[] {
  return Object.values(
    industryTemplates,
  );
}