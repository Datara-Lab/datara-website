import type { Metadata } from "next";

export const websiteUrl = "https://datara-lab.com";
export const publicWebsitePages = [
  { path: "/", title: "Datara Lab | CRM, Cloud, Analytics y Sitios Web", description: "Conecta clientes, ventas, operación y datos con Datara Lab. Soluciones de CRM, infraestructura Cloud, Analytics y sitios web para tu empresa." },
  { path: "/sitios-web", title: "Sitios Web para empresas | Datara Lab", description: "Sitios profesionales para atraer clientes, vender y conectar tu negocio. Conoce las opciones de landing page, catálogo, reservas y tienda en línea de Datara." },
  { path: "/cloud", title: "Infraestructura y servicios Cloud | Datara Lab", description: "Conoce la infraestructura y los servicios administrados de Datara Cloud para mantener tus aplicaciones disponibles y acompañar el crecimiento de tu negocio." },
  { path: "/catalogo/crm", title: "CRM y gestión empresarial Datara DBP | Datara Lab", description: "Explora las soluciones de Datara DBP para conectar clientes, ventas, inventario y operación según las necesidades de tu industria." },
] as const;

export function isProductionWebsite() {
  return process.env.DATARA_ENVIRONMENT === "production";
}

export function websiteMetadata(path: string): Metadata {
  const page = publicWebsitePages.find((item) => item.path === path);
  if (!page) throw new Error("Página pública sin configuración SEO.");
  return {
    title: page.title, description: page.description,
    alternates: { canonical: `${websiteUrl}${path === "/" ? "" : path}` },
    robots: { index: isProductionWebsite(), follow: isProductionWebsite() },
    openGraph: { type: "website", locale: "es_MX", siteName: "Datara Lab", title: page.title, description: page.description, url: `${websiteUrl}${path}`, images: [{ url: `${websiteUrl}/opengraph-image`, width: 1200, height: 630, alt: "Datara Lab — CRM, Cloud, Analytics y Sitios Web" }] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [`${websiteUrl}/opengraph-image`] },
  };
}
