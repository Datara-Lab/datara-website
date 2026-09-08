import type { MetadataRoute } from "next";
import { isProductionWebsite, publicWebsitePages, websiteUrl } from "@/lib/website/seo";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionWebsite()) return [];
  return publicWebsitePages.map((page) => ({ url: `${websiteUrl}${page.path === "/" ? "" : page.path}` }));
}
