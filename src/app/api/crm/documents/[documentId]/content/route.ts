import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmDocuments,
  tenants,
} from "@/db/schema";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

async function getTenantId() {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    throw new ApiError(
      "No autenticado.",
      401,
    );
  }

  if (!orgId) {
    throw new ApiError(
      "No hay una organización activa.",
      400,
    );
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(
      eq(
        tenants.clerkOrganizationId,
        orgId,
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  return tenant.id;
}

function getBucket(): R2Bucket {
  const {
    env,
  } = getCloudflareContext();

  const bucket =
    env.datara_crm_documents;

  if (!bucket) {
    throw new ApiError(
      "El almacenamiento de documentos no está configurado.",
      500,
    );
  }

  return bucket;
}

function getSafeFileName(
  fileName: string,
): string {
  return fileName
    .replace(
      /[\r\n"]/g,
      "_",
    )
    .trim() || "documento";
}

function createErrorResponse(
  error: unknown,
) {
  if (error instanceof ApiError) {
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

  console.error(
    "No fue posible cargar el archivo:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible cargar el archivo.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const tenantId =
      await getTenantId();

    const {
      documentId,
    } = await context.params;

    const [document] = await db
      .select()
      .from(crmDocuments)
      .where(
        and(
          eq(
            crmDocuments.id,
            documentId,
          ),

          eq(
            crmDocuments.tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

    if (!document) {
      throw new ApiError(
        "El documento no existe.",
        404,
      );
    }

    const object =
      await getBucket().get(
        document.storageKey,
      );

    if (!object) {
      throw new ApiError(
        "El archivo no está disponible en el almacenamiento.",
        404,
      );
    }

    const url = new URL(
      request.url,
    );

    const forceDownload =
      url.searchParams.get(
        "download",
      ) === "1";

    const canPreview =
      document.mimeType ===
        "application/pdf" ||
      document.mimeType.startsWith(
        "image/",
      ) ||
      document.mimeType.startsWith(
        "text/",
      );

    const disposition =
      forceDownload ||
      !canPreview
        ? "attachment"
        : "inline";

    const safeFileName =
      getSafeFileName(
        document.originalFileName,
      );

    const encodedFileName =
      encodeURIComponent(
        document.originalFileName,
      );

    return new Response(
      object.body,
      {
        status: 200,

        headers: {
          "Content-Type":
            document.mimeType,

          "Content-Length":
            String(
              object.size,
            ),

          "Content-Disposition":
            `${disposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,

          "Cache-Control":
            "private, no-store",

          ETag:
            object.httpEtag,
        },
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
