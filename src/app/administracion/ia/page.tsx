import {
    redirect,
} from "next/navigation";

import AIProviderManager from "@/components/administracion/AIProviderManager";

import {
    requirePlatformAdministrator,
} from "@/lib/platform/authorization";

export const dynamic =
    "force-dynamic";

export default async function AIAdministrationPage() {
    try {
        await requirePlatformAdministrator();
    } catch {
        redirect("/portal");
    }

    return <AIProviderManager />;
}
