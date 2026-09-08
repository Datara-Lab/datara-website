import { NextResponse } from "next/server";
import { PlatformAuthorizationError, requirePlatformAdministrator } from "@/lib/platform/authorization";
import { catalogRecord, parseCatalogId, parseCatalogVersion, parseServiceCatalogValues, parseServiceCategory, ServiceCatalogError } from "@/lib/commercial/service-catalog-validation";
import { createServiceCatalogItem, deleteServiceCatalogItem, getAdminServiceCatalog, getServiceCatalogItem, updateServiceCatalogItem } from "@/lib/commercial/service-catalog-store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

function errorResponse(error: unknown) {
  if (error instanceof ServiceCatalogError || error instanceof PlatformAuthorizationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ success: false, error: "El JSON enviado no es válido." }, { status: 400, headers });
  }
  const cause = error instanceof Error ? error.cause : undefined;
  if ([error, cause].some((value) => value && typeof value === "object" && "code" in value && value.code === "23505")) {
    return NextResponse.json({ success: false, error: "Ya existe un producto con esa clave en la categoría." }, { status: 409, headers });
  }
  console.error("No fue posible procesar el catálogo de servicios.", error);
  return NextResponse.json({ success: false, error: "No fue posible procesar el catálogo de servicios." }, { status: 500, headers });
}

export async function GET(request: Request) {
  try {
    await requirePlatformAdministrator();
    const category = parseServiceCategory(new URL(request.url).searchParams.get("category"));
    const items = await getAdminServiceCatalog(category);
    return NextResponse.json({ success: true, data: { items } }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const administrator = await requirePlatformAdministrator();
    const values = parseServiceCatalogValues(await request.json());
    const item = await createServiceCatalogItem(values, administrator.userId);
    return NextResponse.json({ success: true, data: { item } }, { status: 201, headers });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const administrator = await requirePlatformAdministrator();
    const payload = catalogRecord(await request.json());
    const id = parseCatalogId(payload.id);
    const category = parseServiceCategory(payload.category);
    const version = parseCatalogVersion(payload.updatedAt);
    const existing = await getServiceCatalogItem(id, category);
    const { createdAt, updatedByClerkUserId, ...editable } = existing;
    void createdAt; void updatedByClerkUserId;
    const values = parseServiceCatalogValues({ ...editable, ...payload });
    const item = await updateServiceCatalogItem(id, values, version, administrator.userId);
    return NextResponse.json({ success: true, data: { item } }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const administrator = await requirePlatformAdministrator();
    const payload = catalogRecord(await request.json());
    const id = parseCatalogId(payload.id);
    const category = parseServiceCategory(payload.category);
    const version = parseCatalogVersion(payload.updatedAt);
    await getServiceCatalogItem(id, category);
    await deleteServiceCatalogItem(id, category, version, administrator.userId);
    return NextResponse.json({ success: true }, { headers });
  } catch (error) { return errorResponse(error); }
}
