import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";

import {
  CommercialStorageLimitError,
  finalizeStorageReplacement,
  releaseTenantCommercialStorage,
  reserveStorageReplacement,
} from "@/lib/commercial/storage-usage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getTenantContext() {
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
      logoObjectKey: tenants.logoObjectKey,
      logoSizeBytes: tenants.logoSizeBytes,
    })
    .from(tenants)
    .where(eq(tenants.clerkOrganizationId, orgId))
    .limit(1);

  if (!tenant) {
    throw new ApiError("La empresa aún no está sincronizada.", 404);
  }

  return tenant;
}

function getBucket(): R2Bucket {
  const { env } = getCloudflareContext();

  const bucket = env.datara_crm_documents;

  if (!bucket) {
    throw new ApiError("El almacenamiento no está configurado.", 500);
  }

  return bucket;
}

function getExtension(file: File): string {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      throw new ApiError("Formato de imagen no permitido.", 400);
  }
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof ApiError ||
    error instanceof CommercialStorageLimitError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("No fue posible procesar el logo de la empresa:", error);

  return NextResponse.json(
    {
      success: false,
      error: "No fue posible procesar el logo de la empresa.",
    },
    {
      status: 500,
    },
  );
}

export async function POST(request: Request) {
  let reservedStorageBytes = 0;

  let storageTenantId: string | null = null;

  try {
    const tenant = await getTenantContext();
    const bucket = getBucket();

    storageTenantId = tenant.id;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("Selecciona una imagen.", 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      throw new ApiError("Selecciona una imagen PNG, JPG o WEBP.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError("La imagen no puede superar los 2 MB.", 400);
    }

    reservedStorageBytes = await reserveStorageReplacement(
      tenant.id,
      tenant.logoSizeBytes,
      file.size,
    );

    const extension = getExtension(file);

    const objectKey = [
      "tenant-assets",
      tenant.id,
      "branding",
      `company-logo.${extension}`,
    ].join("/");

    const fileBuffer = await file.arrayBuffer();

    await bucket.put(objectKey, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=3600, must-revalidate",
      },
      customMetadata: {
        tenantId: tenant.id,
        assetType: "company-logo",
      },
    });

    if (tenant.logoObjectKey && tenant.logoObjectKey !== objectKey) {
      await bucket.delete(tenant.logoObjectKey);
    }

    await db
      .update(tenants)
      .set({
        logoObjectKey: objectKey,
        logoSizeBytes: file.size,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    await finalizeStorageReplacement(
      tenant.id,
      tenant.logoSizeBytes,
      file.size,
    );

    reservedStorageBytes = 0;

    return NextResponse.json({
      success: true,
      data: {
        objectKey,
        contentUrl: "/api/settings/company-logo/content",
      },
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

export async function DELETE() {
  try {
    const tenant = await getTenantContext();
    const bucket = getBucket();

    if (tenant.logoObjectKey) {
      await bucket.delete(tenant.logoObjectKey);
    }

    await db
      .update(tenants)
      .set({
        logoObjectKey: null,
        logoSizeBytes: 0,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    await releaseTenantCommercialStorage(tenant.id, tenant.logoSizeBytes);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
