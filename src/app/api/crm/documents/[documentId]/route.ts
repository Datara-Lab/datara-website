import { auth } from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmDocumentRelations,
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

type DocumentPayload = {
  name?: unknown;
  description?: unknown;
  category?: unknown;
  status?: unknown;

  entityType?: unknown;
  entityId?: unknown;
  entityName?: unknown;
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized || undefined;
}

function getNullableString(
  value: unknown,
): string | null {
  return (
    getOptionalString(value) ??
    null
  );
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
    "No fue posible actualizar el documento:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible actualizar el documento.",
    },
    {
      status: 500,
    },
  );
}

function serializeDocument(
  document:
    typeof crmDocuments.$inferSelect,

  relations: Array<
    typeof crmDocumentRelations.$inferSelect
  >,
) {
  return {
    id: document.id,

    name: document.name,

    originalFileName:
      document.originalFileName,

    description:
      document.description,

    category:
      document.category,

    mimeType:
      document.mimeType,

    extension:
      document.extension,

    sizeBytes:
      document.sizeBytes,

    status:
      document.status,

    version:
      document.version,

    uploadedByClerkUserId:
      document
        .uploadedByClerkUserId,

    uploadedByName:
      document.uploadedByName,

    uploadedByEmail:
      document.uploadedByEmail,

    relations:
      relations.map(
        (relation) => ({
          id: relation.id,

          entityType:
            relation.entityType,

          entityId:
            relation.entityId,

          entityName:
            relation.entityName,
        }),
      ),

    createdTime:
      document.createdAt
        .toISOString(),

    modifiedTime:
      document.updatedAt
        .toISOString(),

    archivedTime:
      document.archivedAt
        ?.toISOString() ?? null,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const tenantId =
      await getTenantId();

    const {
      documentId,
    } = await context.params;

    const requestBody:
      unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "Los datos del documento no son válidos.",
        400,
      );
    }

    const values =
      requestBody as DocumentPayload;

    const [existingDocument] =
      await db
        .select()
        .from(crmDocuments)
        .where(
          and(
            eq(
              crmDocuments.id,
              documentId,
            ),

            eq(
              crmDocuments
                .tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!existingDocument) {
      throw new ApiError(
        "El documento no existe.",
        404,
      );
    }

    const requestedName =
      getOptionalString(
        values.name,
      );

    if (
      "name" in values &&
      !requestedName
    ) {
      throw new ApiError(
        "El nombre del documento es obligatorio.",
        400,
      );
    }

    const requestedCategory =
      getOptionalString(
        values.category,
      );

    if (
      "category" in values &&
      !requestedCategory
    ) {
      throw new ApiError(
        "La categoría es obligatoria.",
        400,
      );
    }

    const requestedStatus =
      getOptionalString(
        values.status,
      );

    if (
      requestedStatus &&
      requestedStatus !==
        "active" &&
      requestedStatus !==
        "archived"
    ) {
      throw new ApiError(
        "El estado del documento no es válido.",
        400,
      );
    }

    const now = new Date();

    const [document] = await db
      .update(crmDocuments)
      .set({
        name:
          requestedName ??
          existingDocument.name,

        description:
          "description" in values
            ? getNullableString(
                values.description,
              )
            : existingDocument
                .description,

        category:
          requestedCategory ??
          existingDocument
            .category,

        status:
          requestedStatus ??
          existingDocument.status,

        archivedAt:
          requestedStatus ===
          "archived"
            ? existingDocument
                .archivedAt ??
              now
            : requestedStatus ===
                "active"
              ? null
              : existingDocument
                  .archivedAt,

        updatedAt: now,
      })
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
      .returning();

    const relationWasProvided =
      "entityType" in values ||
      "entityId" in values ||
      "entityName" in values;

    if (relationWasProvided) {
      const entityType =
        getOptionalString(
          values.entityType,
        );

      const entityId =
        getOptionalString(
          values.entityId,
        );

      const entityName =
        getOptionalString(
          values.entityName,
        );

      if (
        Boolean(entityType) !==
        Boolean(entityId)
      ) {
        throw new ApiError(
          "La relación del documento está incompleta.",
          400,
        );
      }

      await db
        .delete(
          crmDocumentRelations,
        )
        .where(
          and(
            eq(
              crmDocumentRelations
                .tenantId,
              tenantId,
            ),

            eq(
              crmDocumentRelations
                .documentId,
              documentId,
            ),
          ),
        );

      if (
        entityType &&
        entityId
      ) {
        await db
          .insert(
            crmDocumentRelations,
          )
          .values({
            tenantId,
            documentId,

            entityType,
            entityId,

            entityName:
              entityName ?? null,
          });
      }
    }

    const relations =
      await db
        .select()
        .from(
          crmDocumentRelations,
        )
        .where(
          and(
            eq(
              crmDocumentRelations
                .tenantId,
              tenantId,
            ),

            eq(
              crmDocumentRelations
                .documentId,
              documentId,
            ),
          ),
        );

    return NextResponse.json({
      success: true,

      message:
        requestedStatus ===
        "archived"
          ? "El documento fue archivado."
          : requestedStatus ===
              "active"
            ? "El documento fue restaurado."
            : "El documento fue actualizado.",

      data:
        serializeDocument(
          document,
          relations,
        ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}
