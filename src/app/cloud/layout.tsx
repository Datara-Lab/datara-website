import type { ReactNode } from "react";
import { websiteMetadata } from "@/lib/website/seo";

export const metadata = websiteMetadata("/cloud");
export default function PublicCatalogLayout({ children }: { children: ReactNode }) { return children; }
