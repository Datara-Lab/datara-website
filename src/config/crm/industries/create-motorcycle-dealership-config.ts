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
  createQuotesModule,
} from "@/config/crm/modules/quotes";

import {
  createLeadsModule,
} from "@/config/crm/modules/leads";

import {
  createProductsModule,
} from "@/config/crm/modules/products";

import {
  promotionsModule,
} from "@/config/crm/modules/promotions";

import {
  createServicesModule,
} from "@/config/crm/modules/services";

import type {
  CRMFieldOption,
  CRMTerminologyConfig,
  CRMTenantConfig,
} from "@/types/crm-config";

import {
  resolveMobilityProfile,
  type MobilityProfileId,
} from "@/config/crm/industries/mobility-profiles";

import {
  createCRMNavigation,
} from "@/config/crm/navigation";

const industryTemplate =
  getCRMIndustryTemplate(
    "motorcycle_dealership",
  );

type MotorcycleDealershipConfigOptions = {
  tenantId: string;
  tenantName: string;
  profile?: MobilityProfileId | null;
};

export function createMotorcycleDealershipCRMConfig({
  tenantId,
  tenantName,
  profile,
}: MotorcycleDealershipConfigOptions): CRMTenantConfig {
  const mobility = resolveMobilityProfile(profile);
  const catalogs: Record<string, CRMFieldOption[]> = {
    ...industryTemplate.defaultCatalogs,
    "products.category": mobility.modelCategories.map((value) => ({ label: value, value })),
    "deals.stage": mobility.stages,
  };
  const terminology: CRMTerminologyConfig = {
    ...industryTemplate.terminology,
    modules: {
      ...industryTemplate.terminology.modules,
      products: { ...industryTemplate.terminology.modules.products, description: mobility.catalogDescription },
      leads: {
        ...industryTemplate.terminology.modules.leads,
        description: "Personas interesadas en adquirir " +
          (mobility.vehicleSingular === "scooter" ? "un " : "una ") + mobility.vehicleSingular + ".",
      },
      inventory: { ...industryTemplate.terminology.modules.inventory, description: mobility.inventoryDescription },
      services: { ...industryTemplate.terminology.modules.services, description: mobility.serviceDescription },
    },
    fields: {
      ...industryTemplate.terminology.fields,
      "leads.productInterest": mobility.productInterestLabel,
    },
  };
  const productTypes = industryTemplate.defaultProductTypes.map((productType) => ({
    ...productType,
    categories: productType.key === "product"
      ? mobility.accessoryCategories
      : productType.key === "service"
        ? mobility.serviceCategories
        : productType.categories,
  }));
  const navigation = createCRMNavigation(terminology);
  const leadsTerminology = terminology.modules.leads;
  const dealsTerminology = terminology.modules.deals;

  return {
    tenantId,
    tenantName,

  industry:
    industryTemplate.id,

  terminology,

  catalogs,

  defaultRoles:
    industryTemplate.defaultRoles,

  navigationSections:
    navigation.sections,

  navigation: [
    ...navigation.items,

    {
      id: "services",

      label:
        industryTemplate
          .terminology
          .modules.services
          ?.plural ??
        "Servicios",

      route:
        "/crm/servicios",

      moduleId:
        "services",

      sectionId:
        "commercial-operation",

      order: 6,

      status:
        "active",

      visible: true,
    },
  ],

  modules: [
    createProductsModule(
      terminology,
      catalogs,
      industryTemplate.id,
      productTypes,
    ),

    createLeadsModule({
      singularLabel:
        leadsTerminology?.singular,

      pluralLabel:
        leadsTerminology?.plural,

      description:
        leadsTerminology?.description,

      productInterestLabel:
        mobility.productInterestLabel,

      productInterestDescription:
        mobility.productInterestDescription,

      productInterestPlaceholder:
        mobility.productInterestPlaceholder,

      sourceOptions:
        catalogs[
            "leads.source"
          ],

      statusOptions:
        catalogs[
            "leads.status"
          ],
    }),

    createCustomersModule(
      terminology,
    ),

    promotionsModule,

        createDealsModule({
      singularLabel:
        dealsTerminology?.singular,

      pluralLabel:
        dealsTerminology?.plural,

      description:
        dealsTerminology?.description,

      itemSingularLabel:
        terminology
          .modules.products
          ?.singular,

      itemPluralLabel:
        terminology
          .modules.products
          ?.plural,

      stageOptions:
        catalogs[
            "deals.stage"
          ],

      acquisitionChannelOptions:
        catalogs[
            "deals.acquisitionChannel"
          ],

      paymentMethodOptions:
        catalogs[
            "deals.paymentMethod"
          ],
    }),

    createActivitiesModule(),

    createDocumentsModule(),

    createQuotesModule(),

    createServicesModule(),

  ],

    pipelines: [],
  };
}
