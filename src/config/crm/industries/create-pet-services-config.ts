import { getCRMIndustryTemplate } from "@/config/crm/industries";
import { createActivitiesModule } from "@/config/crm/modules/activities";
import { createPetTutorsModule } from "@/config/crm/industries/create-pet-tutors-module";
import { createDealsModule } from "@/config/crm/modules/deals";
import { createDocumentsModule } from "@/config/crm/modules/documents";
import { createLeadsModule } from "@/config/crm/modules/leads";
import { createProductsModule } from "@/config/crm/modules/products";
import { createPetPromotionsModule } from "@/config/crm/industries/create-pet-promotions-module";
import { createQuotesModule } from "@/config/crm/modules/quotes";
import { createCRMNavigation } from "@/config/crm/navigation";
import type { CRMTenantConfig } from "@/types/crm-config";

const industryTemplate = getCRMIndustryTemplate("veterinary");
const stages = [
  { id: "request", label: "Solicitud recibida", probability: 10, color: "slate" as const },
  { id: "assessment", label: "Necesidades confirmadas", probability: 30, color: "blue" as const },
  { id: "scheduled", label: "Cita o reservación confirmada", probability: 60, color: "cyan" as const },
  { id: "checked-in", label: "Check-in", probability: 85, color: "amber" as const },
  { id: "in-service", label: "En atención", probability: 95, color: "emerald" as const },
  { id: "completed", label: "Atención completada", probability: 100, color: "green" as const, isWon: true },
  { id: "cancelled", label: "Cancelada", probability: 0, color: "red" as const, isLost: true },
];

export function createPetServicesCRMConfig({ tenantId, tenantName }: { tenantId: string; tenantName: string }): CRMTenantConfig {
  const terminology = industryTemplate.terminology;
  const catalogs = industryTemplate.defaultCatalogs;
  const navigation = createCRMNavigation(terminology);
  const hiddenNavigationItems = new Set([
    "leads",
    "deals",
    "operations",
    "quotes",
    "sales-orders",
    "after-sales",
  ]);
  navigation.items = navigation.items.filter(
    (item) => !hiddenNavigationItems.has(item.id),
  );
  const salesSection = navigation.sections.find(
    (section) => section.id === "sales",
  );
  if (salesSection) {
    salesSection.label = "Mascotas y tutores";
  }
  navigation.items.push({
    id: "pets", label: "Mascotas", route: "/crm/mascotas", moduleId: "contacts",
    sectionId: "sales", order: 5, status: "active", visible: true,
  });
  navigation.items.push({
    id: "pet-stays", label: "Guardería y pensión", route: "/crm/guarderia-pension", moduleId: "pet-stays",
    sectionId: "commercial-operation", order: 0, status: "active", visible: true,
  });
  navigation.items.push({
    id: "pet-grooming", label: "Grooming y estética", route: "/crm/grooming", moduleId: "pet-grooming",
    sectionId: "commercial-operation", order: 1, status: "active", visible: true,
  });
  navigation.items.push({
    id: "pet-veterinary", label: "Veterinaria", route: "/crm/veterinaria", moduleId: "pet-veterinary",
    sectionId: "commercial-operation", order: 2, status: "active", visible: true,
  });
  return {
    tenantId, tenantName, industry: industryTemplate.id, terminology, catalogs,
    defaultRoles: industryTemplate.defaultRoles,
    navigationSections: navigation.sections,
    navigation: navigation.items,
    modules: [
      createProductsModule(terminology, catalogs, industryTemplate.id),
      createLeadsModule({
        singularLabel: terminology.modules.leads?.singular,
        pluralLabel: terminology.modules.leads?.plural,
        description: terminology.modules.leads?.description,
        productInterestLabel: "Producto o servicio de interés",
        productInterestDescription: "Servicio, paquete o producto solicitado para la mascota.",
        productInterestPlaceholder: "Buscar un servicio, paquete o producto",
        sourceOptions: catalogs["leads.source"], statusOptions: catalogs["leads.status"],
      }),
      createPetTutorsModule(terminology), createPetPromotionsModule(),
      createDealsModule({
        singularLabel: terminology.modules.deals?.singular,
        pluralLabel: terminology.modules.deals?.plural,
        description: terminology.modules.deals?.description,
        itemSingularLabel: "Producto o servicio", itemPluralLabel: "Productos y servicios",
        stageOptions: catalogs["deals.stage"],
        acquisitionChannelOptions: catalogs["deals.acquisitionChannel"],
        paymentMethodOptions: catalogs["deals.paymentMethod"],
      }),
      createActivitiesModule(), createDocumentsModule(), createQuotesModule(),
    ],
    pipelines: [{
      id: "pet-services", label: "Atención de mascotas", moduleId: "deals", stageFieldKey: "stage",
      stages: stages.map((stage, index) => ({ ...stage, order: (index + 1) * 10 })),
    }],
  };
}
