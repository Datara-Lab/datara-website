import {
  getCRMIndustryTemplate,
} from "@/config/crm/industries";

import {
  resolveProfessionalServiceProfile,
  type ProfessionalServiceProfileId,
} from "@/config/crm/industries/professional-service-profiles";

import { createActivitiesModule } from "@/config/crm/modules/activities";
import { createCustomersModule } from "@/config/crm/modules/customers";
import { createDealsModule } from "@/config/crm/modules/deals";
import { createDocumentsModule } from "@/config/crm/modules/documents";
import { createLeadsModule } from "@/config/crm/modules/leads";
import { createProductsModule } from "@/config/crm/modules/products";
import { promotionsModule } from "@/config/crm/modules/promotions";
import { createQuotesModule } from "@/config/crm/modules/quotes";
import { createCRMNavigation } from "@/config/crm/navigation";

import type {
  CRMFieldOption,
  CRMTerminologyConfig,
  CRMTenantConfig,
} from "@/types/crm-config";

const industryTemplate =
  getCRMIndustryTemplate(
    "professional_services",
  );

type ProfessionalServicesConfigOptions = {
  tenantId: string;
  tenantName: string;
  profile?: ProfessionalServiceProfileId | null;
};

export function createProfessionalServicesCRMConfig({
  tenantId,
  tenantName,
  profile: requestedProfile,
}: ProfessionalServicesConfigOptions): CRMTenantConfig {
  const profile =
    resolveProfessionalServiceProfile(
      requestedProfile,
    );

  const terminology:
    CRMTerminologyConfig = {
      ...industryTemplate.terminology,
      modules: {
        ...industryTemplate
          .terminology.modules,
        products: {
          singular:
            profile.productSingular,
          plural:
            profile.productPlural,
          description:
            profile.productDescription,
        },
      },
      fields: {
        ...industryTemplate
          .terminology.fields,
        "products.name":
          `Nombre del ${profile.productSingular.toLowerCase()}`,
        "products.category":
          `Tipo de ${profile.productSingular.toLowerCase()}`,
        "leads.productInterest":
          profile.productInterestLabel,
        "leads.owner":
          profile.ownerLabel,
      },
    };

  const catalogs: Record<
    string,
    CRMFieldOption[]
  > = {
    ...industryTemplate.defaultCatalogs,
    "products.category":
      profile.categories.map(
        (category) => ({
          label: category,
          value: category,
        }),
      ),
    "deals.stage":
      profile.stages.map(
        (stage) => ({
          label: stage.label,
          value: stage.label,
        }),
      ),
  };

  const navigation =
    createCRMNavigation(
      terminology,
    );

  const leadsTerminology =
    terminology.modules.leads;

  const dealsTerminology =
    terminology.modules.deals;

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
    navigation:
      navigation.items,
    modules: [
      createProductsModule(
        terminology,
        catalogs,
        industryTemplate.id,
      ),
      createLeadsModule({
        singularLabel:
          leadsTerminology?.singular,
        pluralLabel:
          leadsTerminology?.plural,
        description:
          leadsTerminology?.description,
        productInterestLabel:
          profile.productInterestLabel,
        productInterestDescription:
          "Servicio o solución por el que se interesó el prospecto.",
        productInterestPlaceholder:
          "Buscar un servicio o solución",
        sourceOptions:
          catalogs["leads.source"],
        statusOptions:
          catalogs["leads.status"],
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
          profile.productSingular,
        itemPluralLabel:
          profile.productPlural,
        stageOptions:
          catalogs["deals.stage"],
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
    ],
    pipelines: [
      {
        id:
          `professional-services-${profile.id}`,
        label:
          profile.pipelineLabel,
        moduleId: "deals",
        stageFieldKey: "stage",
        stages:
          profile.stages.map(
            (stage, index) => ({
              id: stage.id,
              label: stage.label,
              order:
                (index + 1) * 10,
              probability:
                stage.probability,
              color: stage.color,
              isWon: stage.isWon,
              isLost: stage.isLost,
            }),
          ),
      },
    ],
  };
}
