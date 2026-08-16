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

import {
    promotionsModule,
} from "@/config/crm/modules/promotions";

import {
    createQuotesModule,
} from "@/config/crm/modules/quotes";

import {
    createCRMNavigation,
} from "@/config/crm/navigation";

import type {
    CRMTenantConfig,
} from "@/types/crm-config";

const industryTemplate =
    getCRMIndustryTemplate(
        "professional_services",
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

type ProfessionalServicesConfigOptions = {
    tenantId: string;
    tenantName: string;
};

export function createProfessionalServicesCRMConfig({
    tenantId,
    tenantName,
}: ProfessionalServicesConfigOptions):
    CRMTenantConfig {
    return {
        tenantId,
        tenantName,

        industry:
            industryTemplate.id,

        terminology:
            industryTemplate.terminology,

        catalogs:
            industryTemplate.defaultCatalogs,

        defaultRoles:
            industryTemplate.defaultRoles,

        navigationSections:
            navigation.sections,

        navigation:
            navigation.items,

        modules: [
            createProductsModule(
                industryTemplate.terminology,
                industryTemplate.defaultCatalogs,
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
                    industryTemplate.terminology
                        .fields[
                    "leads.productInterest"
                    ],

                productInterestDescription:
                    "Producto o servicio por el que se interesó el prospecto.",

                productInterestPlaceholder:
                    "Buscar un producto o servicio",

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

            promotionsModule,

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

            createQuotesModule(),
        ],

        pipelines: [],
    };
}