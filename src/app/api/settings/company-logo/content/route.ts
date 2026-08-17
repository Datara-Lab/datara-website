import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getTenant(
  requestedTenantId:
    string | null,
) {
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

  if (
    !requestedTenantId &&
    !orgId
  ) {
    throw new ApiError(
      "No hay una organización activa.",
      400,
    );
  }

  const [tenant] =
    await db
      .select({
        id:
          tenants.id,

        name:
          tenants.name,

        logoObjectKey:
          tenants.logoObjectKey,
      })
      .from(
        tenants,
      )
      .innerJoin(
        tenantMembers,
        eq(
          tenantMembers.tenantId,
          tenants.id,
        ),
      )
      .where(
        and(
          eq(
            tenantMembers.clerkUserId,
            userId,
          ),

          eq(
            tenantMembers.status,
            "active",
          ),

          requestedTenantId
            ? eq(
                tenants.id,
                requestedTenantId,
              )
            : eq(
                tenants.clerkOrganizationId,
                orgId!,
              ),
        ),
      )
      .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada o no pertenece al usuario.",
      404,
    );
  }

  return tenant;
}

function getBucket(): R2Bucket {
  const { env } = getCloudflareContext();

  const bucket = env.datara_crm_documents;

  if (!bucket) {
    throw new ApiError(
      "El almacenamiento no está configurado.",
      500,
    );
  }

  return bucket;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createFallbackLogo(
  companyName: string,
): Response {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join("");

  const safeInitials = escapeXml(
    initials || "D",
  );

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      role="img"
      aria-label="Logo de ${escapeXml(companyName)}"
    >
      <defs>
        <linearGradient
          id="background"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>

      <circle
        cx="80"
        cy="80"
        r="80"
        fill="url(#background)"
      />

      <text
        x="80"
        y="88"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#ffffff"
        font-family="Arial, sans-serif"
        font-size="56"
        font-weight="800"
      >
        ${safeInitials}
      </text>
    </svg>
  `;

  return new Response(svg, {
    headers: {
      "content-type":
        "image/svg+xml; charset=utf-8",

      "cache-control":
        "private, no-store",
    },
  });
}

function createErrorResponse(error: unknown) {
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
    "No fue posible obtener el logo de la empresa:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible obtener el logo de la empresa.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const requestUrl =
      new URL(
        request.url,
      );

    const requestedTenantId =
      requestUrl.searchParams
        .get(
          "tenant",
        )
        ?.trim() ??
      null;

    const tenant =
      await getTenant(
        requestedTenantId,
      );

    if (!tenant.logoObjectKey) {
      return createFallbackLogo(
        tenant.name,
      );
    }

    const bucket = getBucket();

    const object = await bucket.get(
      tenant.logoObjectKey,
    );

    if (!object) {
      return createFallbackLogo(
        tenant.name,
      );
    }

    const headers = new Headers();

    headers.set(
      "content-type",
      object.httpMetadata?.contentType ??
        "application/octet-stream",
    );

    headers.set(
      "etag",
      object.httpEtag,
    );

    headers.set(
      "cache-control",
      "private, max-age=300",
    );

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}