import {
    redirect,
} from "next/navigation";

import CommercialCatalogManager from "@/components/administracion/CommercialCatalogManager";

import {
    requirePlatformAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
    "force-dynamic";

export default async function CommercialAdministrationPage() {
    try {
        await requirePlatformAdministrator();
    } catch {
        redirect("/portal");
    }

    return (
        <CommercialCatalogManager />
    );
}