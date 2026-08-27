import { getCloudflareContext } from "@opennextjs/cloudflare";

import { auth } from "@clerk/nextjs/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import { crmProducts, tenants } from "@/db/schema";

import {
  CRMPermissionError,
  type CRMModulePermission,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

import {
  CommercialStorageLimitError,
  finalizeStorageReplacement,
  releaseTenantCommercialStorage,
  reserveStorageReplacement,
} from "@/lib/commercial/storage-usage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maximumFileSize = 8 * 1024 * 1024;

async function getTenantId(permission: CRMModulePermission) {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new ApiError("No autenticado.", 401);
  }

  if (!orgId) {
    throw new ApiError("No hay una organización activa.", 400);
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(eq(tenants.clerkOrganizationId, orgId))
    .limit(1);

  if (!tenant) {
    throw new ApiError("La empresa aún no está sincronizada.", 404);
  }

  await requireCRMModulePermission(tenant.id, userId, "products", permission);

  return tenant.id;
}
function getBucket(): R2Bucket {
  const { env } = getCloudflareContext();

  const bucket = env.datara_crm_documents;

  if (!bucket) {
    throw new ApiError(
      "El almacenamiento de imágenes no está configurado.",
      500,
    );
  }

  return bucket;
}

async function getProduct(tenantId: string, productId: string) {
  const [product] = await db
    .select({
      id: crmProducts.id,

      name: crmProducts.name,

      imageObjectKey: crmProducts.imageObjectKey,

      imageSizeBytes: crmProducts.imageSizeBytes,
    })
    .from(crmProducts)
    .where(
      and(
        eq(crmProducts.id, productId),

        eq(crmProducts.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!product) {
    throw new ApiError("El producto no existe.", 404);
  }

  return product;
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      throw new ApiError("El formato de imagen no es válido.", 400);
  }
}

function createErrorResponse(error: unknown) {
  const status =
    error instanceof ApiError ||
    error instanceof CommercialStorageLimitError ||
    error instanceof CRMPermissionError
      ? error.status
      : 500;

  console.error("Error de imagen de producto:", error);

  return Response.json(
    {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "No fue posible procesar la imagen.",
    },
    {
      status,
    },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const tenantId = await getTenantId("view");

    const { productId } = await context.params;

    const product = await getProduct(tenantId, productId);

    if (!product.imageObjectKey) {
      throw new ApiError("El producto no tiene imagen.", 404);
    }

    const object = await getBucket().get(product.imageObjectKey);

    if (!object) {
      throw new ApiError("La imagen del producto no está disponible.", 404);
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType ?? "application/octet-stream",
    );

    if (object.httpMetadata?.contentDisposition) {
      headers.set(
        "Content-Disposition",
        object.httpMetadata.contentDisposition,
      );
    }

    headers.set("ETag", object.httpEtag);

    headers.set("Cache-Control", "private, max-age=3600");

    const imageBytes = await object.arrayBuffer();

    headers.set("Content-Length", String(imageBytes.byteLength));

    return new Response(imageBytes, {
      headers,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let reservedStorageBytes = 0;

  let storageTenantId: string | null = null;

  try {
    const tenantId = await getTenantId("edit");

    storageTenantId = tenantId;

    const { productId } = await context.params;

    const product = await getProduct(tenantId, productId);

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("Selecciona una imagen.", 400);
    }

    if (file.size === 0) {
      throw new ApiError("La imagen está vacía.", 400);
    }

    if (file.size > maximumFileSize) {
      throw new ApiError("La imagen no puede superar 8 MB.", 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      throw new ApiError("Usa una imagen JPG, PNG o WEBP.", 400);
    }

    reservedStorageBytes = await reserveStorageReplacement(
      tenantId,
      product.imageSizeBytes,
      file.size,
    );

    const extension = getExtension(file.type);

    const objectKey = [
      "tenants",
      tenantId,
      "products",
      productId,
      `${crypto.randomUUID()}.${extension}`,
    ].join("/");

    const bucket = getBucket();

    const fileBytes = await file.arrayBuffer();

    await bucket.put(objectKey, fileBytes, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    await db
      .update(crmProducts)
      .set({
        imageObjectKey: objectKey,

        imageSizeBytes: file.size,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmProducts.id, productId),

          eq(crmProducts.tenantId, tenantId),
        ),
      );

    if (product.imageObjectKey && product.imageObjectKey !== objectKey) {
      await bucket.delete(product.imageObjectKey);
    }

    await finalizeStorageReplacement(
      tenantId,
      product.imageSizeBytes,
      file.size,
    );

    reservedStorageBytes = 0;

    return Response.json({
      success: true,

      data: {
        imageUrl: `/api/crm/products/${productId}/image`,
      },

      message: "Imagen del producto actualizada.",
    });
  } catch (error) {
    if (storageTenantId && reservedStorageBytes > 0) {
      await releaseTenantCommercialStorage(
        storageTenantId,
        reservedStorageBytes,
      );
    }

    return createErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const tenantId = await getTenantId("delete");

    const { productId } = await context.params;

    const product = await getProduct(tenantId, productId);

    if (product.imageObjectKey) {
      await getBucket().delete(product.imageObjectKey);
    }

    await db
      .update(crmProducts)
      .set({
        imageObjectKey: null,

        imageSizeBytes: 0,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmProducts.id, productId),

          eq(crmProducts.tenantId, tenantId),
        ),
      );

    await releaseTenantCommercialStorage(tenantId, product.imageSizeBytes);

    return Response.json({
      success: true,

      message: "Imagen del producto eliminada.",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
