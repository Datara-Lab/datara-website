import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmDocumentRelations,
  crmDocuments,
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic =
  "force-dynamic";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const allowedMimeTypes =
  new Set([
    "application/pdf",

    "image/jpeg",
    "image/png",
    "image/webp",

    "text/plain",
    "text/csv",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);

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

function getOptionalString(
  value: FormDataEntryValue | null,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getExtension(
  fileName: string,
): string | null {
  const parts =
    fileName.split(".");

  if (parts.length < 2) {
    return null;
  }

  const extension =
    parts.at(-1)
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        "",
      );

  return extension || null;
}

function getDocumentName(
  requestedName:
    string | undefined,
  originalFileName: string,
): string {
  if (requestedName) {
    return requestedName;
  }

  const lastDot =
    originalFileName.lastIndexOf(
      ".",
    );

  if (lastDot <= 0) {
    return originalFileName;
  }

  return (
    originalFileName.slice(
      0,
      lastDot,
    ) || originalFileName
  );
}

function bytesToHex(
  value: ArrayBuffer,
): string {
  return Array.from(
    new Uint8Array(value),
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

async function getTenantContext() {
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

  const [member] = await db
    .select({
      firstName:
        tenantMembers.firstName,

      lastName:
        tenantMembers.lastName,

      email:
        tenantMembers.email,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(
          tenantMembers.tenantId,
          tenant.id,
        ),
        eq(
          tenantMembers.clerkUserId,
          userId,
        ),
      ),
    )
    .limit(1);

  const memberName = [
    member?.firstName,
    member?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    tenantId: tenant.id,
    userId,

    userName:
      memberName || null,

    userEmail:
      member?.email ?? null,
  };
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
    "No fue posible procesar los documentos:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible procesar los documentos.",
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

export async function GET() {
  try {
    const {
      tenantId,
    } = await getTenantContext();

    const documents = await db
      .select()
      .from(crmDocuments)
      .where(
        eq(
          crmDocuments.tenantId,
          tenantId,
        ),
      )
      .orderBy(
        desc(
          crmDocuments.createdAt,
        ),
      );

    const documentIds =
      documents.map(
        (document) =>
          document.id,
      );

    const relations =
      documentIds.length > 0
        ? await db
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

                inArray(
                  crmDocumentRelations
                    .documentId,
                  documentIds,
                ),
              ),
            )
        : [];

    const relationsByDocument =
      new Map<
        string,
        typeof relations
      >();

    for (
      const relation of relations
    ) {
      const documentRelations =
        relationsByDocument.get(
          relation.documentId,
        ) ?? [];

      documentRelations.push(
        relation,
      );

      relationsByDocument.set(
        relation.documentId,
        documentRelations,
      );
    }

    const data =
      documents.map(
        (document) =>
          serializeDocument(
            document,

            relationsByDocument.get(
              document.id,
            ) ?? [],
          ),
      );

    return NextResponse.json({
      success: true,
      data,

      meta: {
        count: data.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  let uploadedStorageKey:
    string | null = null;

  let createdDocumentId:
    string | null = null;

  try {
    const {
      tenantId,
      userId,
      userName,
      userEmail,
    } = await getTenantContext();

    const formData =
      await request.formData();

    const fileValue =
      formData.get("file");

    if (
      !(fileValue instanceof File)
    ) {
      throw new ApiError(
        "Selecciona un archivo.",
        400,
      );
    }

    if (fileValue.size <= 0) {
      throw new ApiError(
        "El archivo está vacío.",
        400,
      );
    }

    if (
      fileValue.size >
      MAX_FILE_SIZE
    ) {
      throw new ApiError(
        "El archivo no puede superar los 20 MB.",
        400,
      );
    }

    if (
      !allowedMimeTypes.has(
        fileValue.type,
      )
    ) {
      throw new ApiError(
        "El tipo de archivo no está permitido. Usa PDF, imágenes, Word, Excel, PowerPoint, TXT o CSV.",
        400,
      );
    }

    const originalFileName =
      fileValue.name.trim();

    if (!originalFileName) {
      throw new ApiError(
        "El archivo no tiene un nombre válido.",
        400,
      );
    }

    const name =
      getDocumentName(
        getOptionalString(
          formData.get("name"),
        ),
        originalFileName,
      );

    const description =
      getOptionalString(
        formData.get(
          "description",
        ),
      );

    const category =
      getOptionalString(
        formData.get(
          "category",
        ),
      ) ?? "Otro";

    const entityType =
      getOptionalString(
        formData.get(
          "entityType",
        ),
      );

    const entityId =
      getOptionalString(
        formData.get(
          "entityId",
        ),
      );

    const entityName =
      getOptionalString(
        formData.get(
          "entityName",
        ),
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

    const extension =
      getExtension(
        originalFileName,
      );

    const now = new Date();

    const storageKey = [
      tenantId,
      now.getUTCFullYear(),
      String(
        now.getUTCMonth() + 1,
      ).padStart(2, "0"),
      `${crypto.randomUUID()}${
        extension
          ? `.${extension}`
          : ""
      }`,
    ].join("/");

    const fileBuffer =
      await fileValue.arrayBuffer();

    const checksum =
      bytesToHex(
        await crypto.subtle.digest(
          "SHA-256",
          fileBuffer,
        ),
      );

    const bucket =
      getBucket();

    await bucket.put(
      storageKey,
      fileBuffer,
      {
        httpMetadata: {
          contentType:
            fileValue.type,
        },

        customMetadata: {
          tenantId,
          checksum,
        },
      },
    );

    uploadedStorageKey =
      storageKey;

    const [document] = await db
      .insert(crmDocuments)
      .values({
        tenantId,

        name,
        originalFileName,

        description:
          description ?? null,

        category,

        mimeType:
          fileValue.type,

        extension,

        sizeBytes:
          fileValue.size,

        storageProvider: "r2",
        storageKey,

        checksum,

        status: "active",
        version: 1,

        uploadedByClerkUserId:
          userId,

        uploadedByName:
          userName,

        uploadedByEmail:
          userEmail,

        metadata: {},
      })
      .returning();

    createdDocumentId =
      document.id;

    let relations: Array<
      typeof crmDocumentRelations.$inferSelect
    > = [];

    if (
      entityType &&
      entityId
    ) {
      relations = await db
        .insert(
          crmDocumentRelations,
        )
        .values({
          tenantId,

          documentId:
            document.id,

          entityType,
          entityId,

          entityName:
            entityName ?? null,
        })
        .returning();
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "El documento fue cargado correctamente.",

        data:
          serializeDocument(
            document,
            relations,
          ),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (createdDocumentId) {
      try {
        await db
          .delete(crmDocuments)
          .where(
            eq(
              crmDocuments.id,
              createdDocumentId,
            ),
          );
      } catch (
        cleanupDatabaseError
      ) {
        console.error(
          "No fue posible revertir el documento en la base de datos:",
          cleanupDatabaseError,
        );
      }
    }

    if (uploadedStorageKey) {
      try {
        await getBucket().delete(
          uploadedStorageKey,
        );
      } catch (
        cleanupStorageError
      ) {
        console.error(
          "No fue posible revertir el archivo en R2:",
          cleanupStorageError,
        );
      }
    }

    return createErrorResponse(
      error,
    );
  }
}
