import { NextResponse } from "next/server";
import { getPublicServiceCatalog } from "@/lib/commercial/service-catalog-store";
import { parseServiceCategory, ServiceCatalogError } from "@/lib/commercial/service-catalog-validation";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const category = parseServiceCategory(new URL(request.url).searchParams.get("category"));
    const items = await getPublicServiceCatalog(category);
    return NextResponse.json({ success: true, data: { items } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ServiceCatalogError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("No fue posible consultar el catálogo de servicios.", error);
    return NextResponse.json({ success: false, error: "No fue posible cargar el catálogo. Inténtalo de nuevo." }, { status: 500 });
  }
}
