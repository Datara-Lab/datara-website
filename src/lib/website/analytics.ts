export const trackedWebsitePaths = ["/", "/sitios-web", "/cloud", "/catalogo/crm"] as const;
export const websiteEventNames = ["page_view", "contact_click", "quote_click", "whatsapp_click", "product_click", "form_start", "form_submit"] as const;
export type WebsiteEventName = (typeof websiteEventNames)[number];
export const websiteSources = ["Directo / desconocido", "Google", "Bing", "Facebook", "Instagram", "LinkedIn", "WhatsApp", "Newsletter", "Otro sitio"] as const;
export type WebsiteSource = (typeof websiteSources)[number];
export type WebsiteAnalyticsContext = {
  sessionId: string;
  path: string;
  source: WebsiteSource;
  device: "mobile" | "tablet" | "desktop";
  consent: true;
};
export type WebsiteEvent = WebsiteAnalyticsContext & { id: string; name: WebsiteEventName; target: string | null };

export function isTrackedWebsitePath(path: string) {
  return (trackedWebsitePaths as readonly string[]).includes(path);
}

export function classifyWebsiteSource(referrer: string, source: string | null, currentHostname: string): WebsiteSource {
  const known: Record<string, WebsiteSource> = { google: "Google", bing: "Bing", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", whatsapp: "WhatsApp", newsletter: "Newsletter" };
  if (source) return known[source.toLowerCase()] ?? "Otro sitio";
  if (!referrer) return "Directo / desconocido";
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname === currentHostname) return "Directo / desconocido";
    if (/(^|\.)google\.[a-z.]+$/.test(hostname)) return "Google";
    for (const [domain, label] of [["bing.com", "Bing"], ["facebook.com", "Facebook"], ["instagram.com", "Instagram"], ["linkedin.com", "LinkedIn"], ["whatsapp.com", "WhatsApp"], ["wa.me", "WhatsApp"]] as const) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return label;
    }
  } catch { return "Directo / desconocido"; }
  return "Otro sitio";
}

export function parseWebsiteEvent(input: unknown, allowFormSubmit = false): WebsiteEvent {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Evento inválido.");
  const value = input as Record<string, unknown>;
  const fields = ["id", "sessionId", "path", "source", "device", "consent", "name", "target"];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (Object.keys(value).some((key) => !fields.includes(key)) || value.consent !== true ||
    typeof value.id !== "string" || !uuid.test(value.id) || typeof value.sessionId !== "string" || !uuid.test(value.sessionId) ||
    typeof value.path !== "string" || !isTrackedWebsitePath(value.path) ||
    typeof value.name !== "string" || !(websiteEventNames as readonly string[]).includes(value.name) ||
    (!allowFormSubmit && value.name === "form_submit") ||
    typeof value.source !== "string" || !(websiteSources as readonly string[]).includes(value.source) ||
    !["mobile", "tablet", "desktop"].includes(String(value.device)) ||
    !(value.target === null || typeof value.target === "string" && /^[a-z0-9-]{1,80}$/.test(value.target))) {
    throw new Error("Evento inválido.");
  }
  return value as WebsiteEvent;
}

export const websiteEventLabels: Record<WebsiteEventName, string> = {
  page_view: "Visitas a páginas", contact_click: "Clics de contacto", quote_click: "Solicitudes de cotización (clic)",
  whatsapp_click: "Clics en WhatsApp", product_click: "Exploración de productos", form_start: "Formularios iniciados", form_submit: "Formularios enviados",
};

export type WebsiteAnalyticsOverview = {
  tenantName: string; days: number; generatedAt: string;
  totals: { pageViews: number; sessions: number; clicks: number; formStarts: number; formSubmits: number; convertingSessions: number };
  daily: { date: string; views: number; submissions: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; sessions: number }[];
  devices: { device: string; sessions: number }[];
  actions: { name: WebsiteEventName; count: number }[];
  recent: { name: WebsiteEventName; path: string; target: string | null; createdAt: string }[];
  seo: { production: boolean; siteUrl: string; pages: { path: string; title: string; description: string }[] };
};
