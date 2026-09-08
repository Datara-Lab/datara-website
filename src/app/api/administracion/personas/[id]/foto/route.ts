import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
    and,
    eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
    people,
} from "@/db/schema";

import {
    AdministrationAuthError,
    requireAdminContext,
} from "@/lib/administration/require-admin-context";

import {
    CommercialStorageLimitError,
    finalizeStorageReplacement,
    releaseTenantCommercialStorage,
    reserveStorageReplacement,
} from "@/lib/commercial/storage-usage";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
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

const allowedMimeTypes =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
    ]);

const maximumFileSize =
    5 * 1024 * 1024;

function getBucket(): R2Bucket {
    const {
        env,
    } =
        getCloudflareContext();

    const bucket =
        env.datara_crm_documents;

    if (!bucket) {
        throw new ApiError(
            "El almacenamiento de imágenes no está configurado.",
            500,
        );
    }

    return bucket;
}

function getExtension(
    mimeType: string,
) {
    switch (mimeType) {
        case "image/jpeg":
            return "jpg";

        case "image/png":
            return "png";

        case "image/webp":
            return "webp";

        default:
            throw new ApiError(
                "El formato de imagen no es válido.",
                400,
            );
    }
}

async function getPerson(
    tenantId: string,
    personId: string,
) {
    const [person] =
        await db
            .select({
                id:
                    people.id,

                photoObjectKey:
                    people.photoObjectKey,

                photoSizeBytes:
                    people.photoSizeBytes,
            })
            .from(
                people,
            )
            .where(
                and(
                    eq(
                        people.id,
                        personId,
                    ),

                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                ),
            )
            .limit(1);

    if (!person) {
        throw new ApiError(
            "La persona no existe.",
            404,
        );
    }

    return person;
}

function createErrorResponse(
    error: unknown,
) {
    const status =
        error instanceof ApiError ||
            error instanceof
            AdministrationAuthError ||
            error instanceof
            CommercialStorageLimitError
            ? error.status
            : 500;

    console.error(
        "Error de foto de persona:",
        error,
    );

    return Response.json(
        {
            success: false,

            error:
                error instanceof Error
                    ? error.message
                    : "No fue posible procesar la foto.",
        },
        {
            status,
        },
    );
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const {
            id,
        } =
            await context.params;

        const person =
            await getPerson(
                tenantId,
                id,
            );

        if (
            !person.photoObjectKey
        ) {
            throw new ApiError(
                "La persona no tiene foto.",
                404,
            );
        }

        const object =
            await getBucket().get(
                person.photoObjectKey,
            );

        if (!object) {
            throw new ApiError(
                "La foto no está disponible.",
                404,
            );
        }

        const headers =
            new Headers();

        headers.set(
            "Content-Type",
            object.httpMetadata
                ?.contentType ??
            "application/octet-stream",
        );

        headers.set(
            "ETag",
            object.httpEtag,
        );

        headers.set(
            "Cache-Control",
            "private, max-age=3600",
        );

        return new Response(
            object.body,
            {
                headers,
            },
        );
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}

export async function POST(
    request: Request,
    context: RouteContext,
) {
    let reservedStorageBytes =
        0;

    let storageTenantId:
        string | null =
        null;

    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        storageTenantId =
            tenantId;

        const {
            id,
        } =
            await context.params;

        const person =
            await getPerson(
                tenantId,
                id,
            );

        const formData =
            await request.formData();

        const file =
            formData.get(
                "file",
            );

        if (
            !(file instanceof File)
        ) {
            throw new ApiError(
                "Selecciona una imagen.",
                400,
            );
        }

        if (
            file.size ===
            0
        ) {
            throw new ApiError(
                "La imagen está vacía.",
                400,
            );
        }

        if (
            file.size >
            maximumFileSize
        ) {
            throw new ApiError(
                "La imagen no puede superar 5 MB.",
                400,
            );
        }

        if (
            !allowedMimeTypes.has(
                file.type,
            )
        ) {
            throw new ApiError(
                "Usa una imagen JPG, PNG o WEBP.",
                400,
            );
        }

        reservedStorageBytes =
            await reserveStorageReplacement(
                tenantId,
                person.photoSizeBytes,
                file.size,
            );

        const extension =
            getExtension(
                file.type,
            );

        const objectKey =
            [
                "tenants",
                tenantId,
                "people",
                id,
                `${crypto.randomUUID()}.${extension}`,
            ].join("/");

        const bucket =
            getBucket();

        const fileBytes =
            await file.arrayBuffer();

        await bucket.put(
            objectKey,
            fileBytes,
            {
                httpMetadata: {
                    contentType:
                        file.type,
                },
            },
        );

        await db
            .update(
                people,
            )
            .set({
                photoObjectKey:
                    objectKey,

                photoSizeBytes:
                    file.size,

                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        people.id,
                        id,
                    ),

                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                ),
            );

        if (
            person.photoObjectKey &&
            person.photoObjectKey !==
            objectKey
        ) {
            await bucket.delete(
                person.photoObjectKey,
            );
        }

        await finalizeStorageReplacement(
            tenantId,
            person.photoSizeBytes,
            file.size,
        );

        reservedStorageBytes =
            0;

        return Response.json({
            success: true,

            data: {
                photoUrl:
                    `/api/administracion/personas/${id}/foto`,
            },

            message:
                "Foto actualizada correctamente.",
        });
    } catch (error) {
        if (
            storageTenantId &&
            reservedStorageBytes >
            0
        ) {
            await releaseTenantCommercialStorage(
                storageTenantId,
                reservedStorageBytes,
            );
        }

        return createErrorResponse(
            error,
        );
    }
}

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    try {
        const {
            tenantId,
        } =
            await requireAdminContext();

        const {
            id,
        } =
            await context.params;

        const person =
            await getPerson(
                tenantId,
                id,
            );

        if (
            person.photoObjectKey
        ) {
            await getBucket().delete(
                person.photoObjectKey,
            );
        }

        await db
            .update(
                people,
            )
            .set({
                photoObjectKey:
                    null,

                photoSizeBytes:
                    0,

                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        people.id,
                        id,
                    ),

                    eq(
                        people.tenantId,
                        tenantId,
                    ),
                ),
            );

        await releaseTenantCommercialStorage(
            tenantId,
            person.photoSizeBytes,
        );

        return Response.json({
            success: true,

            message:
                "Foto eliminada correctamente.",
        });
    } catch (error) {
        return createErrorResponse(
            error,
        );
    }
}