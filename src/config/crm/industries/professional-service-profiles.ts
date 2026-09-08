export const professionalServiceProfileIds = [
  "general",
  "consulting",
  "software_development",
  "managed_infrastructure",
  "creative_agency",
  "professional_firm",
  "technical_services",
] as const;

export type ProfessionalServiceProfileId =
  (typeof professionalServiceProfileIds)[number];

type ProfileStage = {
  id: string;
  label: string;
  probability: number;
  color:
    | "slate"
    | "blue"
    | "cyan"
    | "indigo"
    | "violet"
    | "amber"
    | "orange"
    | "emerald"
    | "green"
    | "red";
  isWon?: boolean;
  isLost?: boolean;
};

export type ProfessionalServiceProfile = {
  id: ProfessionalServiceProfileId;
  name: string;
  shortDescription: string;
  pipelineLabel: string;
  productSingular: string;
  productPlural: string;
  productDescription: string;
  productInterestLabel: string;
  ownerLabel: string;
  categories: string[];
  stages: ProfileStage[];
};

const closedStages: ProfileStage[] = [
  { id: "won", label: "Ganada", probability: 100, color: "green", isWon: true },
  { id: "lost", label: "Perdida", probability: 0, color: "red", isLost: true },
];

export const professionalServiceProfiles: Record<
  ProfessionalServiceProfileId,
  ProfessionalServiceProfile
> = {
  general: {
    id: "general",
    name: "Servicios profesionales (general)",
    shortDescription: "Una configuración flexible para empresas que venden conocimiento, proyectos o servicios recurrentes.",
    pipelineLabel: "Venta de servicios profesionales",
    productSingular: "Producto o servicio",
    productPlural: "Productos y servicios",
    productDescription: "Catálogo de servicios, proyectos, paquetes y contratos recurrentes.",
    productInterestLabel: "Solución de interés",
    ownerLabel: "Consultor responsable",
    categories: ["Asesoría", "Consultoría", "Implementación", "Proyecto", "Servicio técnico", "Capacitación", "Soporte", "Iguala mensual", "Suscripción", "Servicio administrado", "Producto", "Otro"],
    stages: [
      { id: "diagnosis", label: "Diagnóstico", probability: 10, color: "slate" },
      { id: "scope", label: "Alcance definido", probability: 25, color: "blue" },
      { id: "proposal", label: "Propuesta enviada", probability: 50, color: "cyan" },
      { id: "negotiation", label: "Negociación", probability: 70, color: "violet" },
      { id: "contract", label: "Aprobación o contrato", probability: 85, color: "amber" },
      { id: "active", label: "Servicio activo", probability: 95, color: "emerald" },
      ...closedStages,
    ],
  },
  consulting: {
    id: "consulting",
    name: "Consultoría",
    shortDescription: "Para firmas y consultores que diagnostican, proponen y ejecutan proyectos de transformación.",
    pipelineLabel: "Venta de consultoría",
    productSingular: "Servicio de consultoría",
    productPlural: "Servicios de consultoría",
    productDescription: "Diagnósticos, proyectos, acompañamientos, talleres e igualas de consultoría.",
    productInterestLabel: "Necesidad de consultoría",
    ownerLabel: "Consultor líder",
    categories: ["Diagnóstico", "Estrategia", "Implementación", "Acompañamiento", "Auditoría", "Taller", "Capacitación", "Iguala"],
    stages: [
      { id: "discovery", label: "Descubrimiento", probability: 10, color: "slate" },
      { id: "diagnosis", label: "Diagnóstico", probability: 25, color: "blue" },
      { id: "scope", label: "Alcance y entregables", probability: 40, color: "cyan" },
      { id: "proposal", label: "Propuesta enviada", probability: 55, color: "indigo" },
      { id: "negotiation", label: "Negociación", probability: 70, color: "violet" },
      { id: "contract", label: "Contrato", probability: 90, color: "amber" },
      ...closedStages,
    ],
  },
  software_development: {
    id: "software_development",
    name: "Software y desarrollo",
    shortDescription: "Para fábricas de software, integradores y equipos que venden proyectos o capacidad de desarrollo.",
    pipelineLabel: "Venta de soluciones de software",
    productSingular: "Solución o servicio",
    productPlural: "Soluciones y servicios",
    productDescription: "Desarrollo, implementación, licencias, integraciones, soporte y servicios recurrentes.",
    productInterestLabel: "Solución tecnológica de interés",
    ownerLabel: "Responsable comercial",
    categories: ["Desarrollo a medida", "Implementación", "Integración", "Licencia", "Suscripción", "Soporte", "Mantenimiento", "Bolsa de horas", "Discovery"],
    stages: [
      { id: "discovery", label: "Discovery", probability: 10, color: "slate" },
      { id: "requirements", label: "Levantamiento", probability: 25, color: "blue" },
      { id: "solution", label: "Diseño de solución", probability: 40, color: "cyan" },
      { id: "proposal", label: "Propuesta enviada", probability: 55, color: "indigo" },
      { id: "technical-validation", label: "Validación técnica", probability: 70, color: "violet" },
      { id: "contract", label: "Contrato y arranque", probability: 90, color: "amber" },
      ...closedStages,
    ],
  },
  managed_infrastructure: {
    id: "managed_infrastructure",
    name: "Infraestructura administrada",
    shortDescription: "Para proveedores de nube, redes, seguridad, soporte y servicios administrados.",
    pipelineLabel: "Venta de infraestructura y servicios administrados",
    productSingular: "Servicio de infraestructura",
    productPlural: "Servicios de infraestructura",
    productDescription: "Infraestructura, seguridad, nube, respaldo, monitoreo, soporte y servicios administrados.",
    productInterestLabel: "Servicio de infraestructura de interés",
    ownerLabel: "Arquitecto o ejecutivo responsable",
    categories: ["Nube", "Hosting", "Redes", "Seguridad", "Respaldo", "Monitoreo", "Mesa de ayuda", "Soporte", "Servicio administrado", "Migración"],
    stages: [
      { id: "assessment", label: "Evaluación técnica", probability: 10, color: "slate" },
      { id: "architecture", label: "Arquitectura propuesta", probability: 30, color: "blue" },
      { id: "quotation", label: "Cotización", probability: 50, color: "cyan" },
      { id: "validation", label: "Validación técnica", probability: 65, color: "indigo" },
      { id: "approval", label: "Aprobación", probability: 80, color: "violet" },
      { id: "provisioning", label: "Aprovisionamiento", probability: 95, color: "amber" },
      ...closedStages,
    ],
  },
  creative_agency: {
    id: "creative_agency",
    name: "Agencia creativa o de marketing",
    shortDescription: "Para agencias que convierten briefs en campañas, producciones y relaciones recurrentes.",
    pipelineLabel: "Venta de proyectos de agencia",
    productSingular: "Servicio de agencia",
    productPlural: "Servicios de agencia",
    productDescription: "Estrategia, creatividad, campañas, producción, pauta e igualas mensuales.",
    productInterestLabel: "Servicio o campaña de interés",
    ownerLabel: "Ejecutivo de cuenta",
    categories: ["Estrategia", "Branding", "Campaña", "Contenido", "Diseño", "Producción", "Pauta", "Social media", "Iguala", "Evento"],
    stages: [
      { id: "brief", label: "Brief recibido", probability: 10, color: "slate" },
      { id: "qualification", label: "Calificación", probability: 25, color: "blue" },
      { id: "creative-proposal", label: "Propuesta creativa", probability: 45, color: "cyan" },
      { id: "presentation", label: "Presentación", probability: 60, color: "indigo" },
      { id: "adjustments", label: "Ajustes y negociación", probability: 75, color: "violet" },
      { id: "approval", label: "Aprobación", probability: 90, color: "amber" },
      ...closedStages,
    ],
  },
  professional_firm: {
    id: "professional_firm",
    name: "Despacho profesional",
    shortDescription: "Para despachos legales, contables y especializados que venden asuntos, igualas y servicios recurrentes.",
    pipelineLabel: "Contratación de servicios profesionales",
    productSingular: "Servicio profesional",
    productPlural: "Servicios profesionales",
    productDescription: "Consultas, asuntos, trámites, representaciones, auditorías e igualas.",
    productInterestLabel: "Asunto o servicio de interés",
    ownerLabel: "Profesional responsable",
    categories: ["Consulta", "Asunto", "Trámite", "Representación", "Auditoría", "Dictamen", "Iguala", "Cumplimiento", "Capacitación"],
    stages: [
      { id: "initial-consultation", label: "Consulta inicial", probability: 10, color: "slate" },
      { id: "assessment", label: "Evaluación del asunto", probability: 30, color: "blue" },
      { id: "fees", label: "Propuesta de honorarios", probability: 50, color: "cyan" },
      { id: "documents", label: "Documentación", probability: 65, color: "indigo" },
      { id: "engagement", label: "Carta o contrato", probability: 85, color: "amber" },
      { id: "opened", label: "Asunto abierto", probability: 95, color: "emerald" },
      ...closedStages,
    ],
  },
  technical_services: {
    id: "technical_services",
    name: "Servicios técnicos",
    shortDescription: "Para instalación, mantenimiento, reparación y soporte técnico en campo o remoto.",
    pipelineLabel: "Venta de servicios técnicos",
    productSingular: "Servicio técnico",
    productPlural: "Servicios técnicos",
    productDescription: "Diagnósticos, instalaciones, mantenimientos, reparaciones, pólizas y soporte.",
    productInterestLabel: "Servicio técnico requerido",
    ownerLabel: "Asesor técnico responsable",
    categories: ["Diagnóstico", "Instalación", "Mantenimiento preventivo", "Mantenimiento correctivo", "Reparación", "Póliza", "Soporte remoto", "Visita técnica", "Refacción"],
    stages: [
      { id: "request", label: "Solicitud recibida", probability: 10, color: "slate" },
      { id: "diagnosis", label: "Diagnóstico", probability: 30, color: "blue" },
      { id: "quotation", label: "Cotización", probability: 50, color: "cyan" },
      { id: "authorization", label: "Autorización", probability: 70, color: "indigo" },
      { id: "scheduled", label: "Servicio programado", probability: 85, color: "amber" },
      { id: "execution", label: "En ejecución", probability: 95, color: "emerald" },
      ...closedStages,
    ],
  },
};

export function isProfessionalServiceProfileId(
  value: unknown,
): value is ProfessionalServiceProfileId {
  return typeof value === "string" && professionalServiceProfileIds.includes(value as ProfessionalServiceProfileId);
}

export function resolveProfessionalServiceProfile(
  value: unknown,
): ProfessionalServiceProfile {
  return professionalServiceProfiles[
    isProfessionalServiceProfileId(value) ? value : "general"
  ];
}
