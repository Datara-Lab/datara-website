import type { MetadataRoute } from "next";
import { isProductionWebsite, websiteUrl } from "@/lib/website/seo";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  if (!isProductionWebsite()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/administracion", "/crm", "/analytics", "/portal", "/pos", "/login", "/demo", "/contratar", "/seleccionar-empresa"] },
    sitemap: `${websiteUrl}/sitemap.xml`, host: websiteUrl,
  };
}
