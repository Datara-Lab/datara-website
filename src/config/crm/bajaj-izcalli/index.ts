import {
  getCRMIndustryTemplate,
} from "@/config/crm/industries";

import {
  createCustomersModule,
} from "@/config/crm/modules/customers";

import {
  createLeadsModule,
} from "@/config/crm/modules/leads";

import {
  createProductsModule,
} from "@/config/crm/modules/products";

import type {
  CRMTenantConfig,
} from "@/types/crm-config";

import {
  bajajIzcalliNavigation,
  bajajIzcalliNavigationSections,
} from "./navigation";

import {
  bajajIzcalliModules,
} from "./modules";

const industryTemplate =
  getCRMIndustryTemplate(
    "motorcycle_dealership",
  );

const leadsTerminology =
  industryTemplate.terminology
    .modules.leads;

export const bajajIzcalliCRMConfig:
  CRMTenantConfig = {
  tenantId: "bajaj-izcalli",
  tenantName: "Bajaj Izcalli",

  industry:
    industryTemplate.id,

  terminology:
    industryTemplate.terminology,

  catalogs:
    industryTemplate.defaultCatalogs,

  navigationSections:
    bajajIzcalliNavigationSections,

  navigation:
    bajajIzcalliNavigation,

  modules: [
    createProductsModule(
      industryTemplate.terminology,
      industryTemplate.defaultCatalogs,
    ),

    createLeadsModule({
      singularLabel:
        leadsTerminology?.singular,

      pluralLabel:
        leadsTerminology?.plural,

      description:
        leadsTerminology?.description,

      productInterestLabel:
        industryTemplate.terminology
          .fields[
            "leads.productInterest"
          ],

      productInterestDescription:
        "Modelo por el que se interesó el prospecto.",

      productInterestPlaceholder:
        "Buscar un modelo",

      sourceOptions:
        industryTemplate
          .defaultCatalogs[
            "leads.source"
          ],

      statusOptions:
        industryTemplate
          .defaultCatalogs[
            "leads.status"
          ],
    }),

    createCustomersModule(
      industryTemplate.terminology,
    ),

    ...bajajIzcalliModules,
  ],

  pipelines: [],
};

export default bajajIzcalliCRMConfig;