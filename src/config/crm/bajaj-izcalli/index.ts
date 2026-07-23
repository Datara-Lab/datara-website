import {
  getCRMIndustryTemplate,
} from "@/config/crm/industries";

import {
  createActivitiesModule,
} from "@/config/crm/modules/activities";

import {
  createCustomersModule,
} from "@/config/crm/modules/customers";

import {
  createDealsModule,
} from "@/config/crm/modules/deals";

import {
  createDocumentsModule,
} from "@/config/crm/modules/documents";

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
  createCRMNavigation,
} from "@/config/crm/navigation";

import {
  bajajIzcalliModules,
} from "./modules";

const industryTemplate =
  getCRMIndustryTemplate(
    "motorcycle_dealership",
  );

const navigation =
  createCRMNavigation(
    industryTemplate.terminology,
  );

const leadsTerminology =
  industryTemplate.terminology
    .modules.leads;

const dealsTerminology =
  industryTemplate.terminology
    .modules.deals;

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
    navigation.sections,

  navigation:
    navigation.items,

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

        createDealsModule({
      singularLabel:
        dealsTerminology?.singular,

      pluralLabel:
        dealsTerminology?.plural,

      description:
        dealsTerminology?.description,

      itemSingularLabel:
        industryTemplate.terminology
          .modules.products
          ?.singular,

      itemPluralLabel:
        industryTemplate.terminology
          .modules.products
          ?.plural,

      stageOptions:
        industryTemplate
          .defaultCatalogs[
            "deals.stage"
          ],

      acquisitionChannelOptions:
        industryTemplate
          .defaultCatalogs[
            "deals.acquisitionChannel"
          ],

      paymentMethodOptions:
        industryTemplate
          .defaultCatalogs[
            "deals.paymentMethod"
          ],
    }),

    createActivitiesModule(),

    createDocumentsModule(),

  ],

  pipelines: [],
};

export default bajajIzcalliCRMConfig;