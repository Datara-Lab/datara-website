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

        pipelines: [
            {
                id: "professional-services-sales",
                label: "Venta de servicios profesionales",
                moduleId: "deals",
                stageFieldKey: "stage",
                stages: [
                    { id: "diagnosis", label: "Diagnóstico", order: 10, probability: 10, color: "slate" },
                    { id: "scope", label: "Alcance definido", order: 20, probability: 20, color: "blue" },
                    { id: "proposal-draft", label: "Propuesta en preparación", order: 30, probability: 35, color: "cyan" },
                    { id: "proposal-sent", label: "Propuesta enviada", order: 40, probability: 50, color: "indigo" },
                    { id: "negotiation", label: "Negociación", order: 50, probability: 65, color: "violet" },
                    { id: "approval", label: "Aprobación o contrato", order: 60, probability: 80, color: "amber" },
                    { id: "service-order", label: "Orden de servicio", order: 70, probability: 90, color: "orange" },
                    { id: "active-service", label: "Servicio activo", order: 80, probability: 100, color: "emerald" },
                    { id: "won", label: "Cerrada ganada", order: 90, probability: 100, color: "green", isWon: true },
                    { id: "lost", label: "Cerrada perdida", order: 100, probability: 0, color: "red", isLost: true },
                ],
            },
        ],
    };
}