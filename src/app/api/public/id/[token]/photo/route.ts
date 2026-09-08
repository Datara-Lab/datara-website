import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
    and,
    eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
    digitalCredentials,
    people,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        token: string;
    }>;
};

type PublicVisibility = {
    photo?: boolean;
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

function getBucket(): R2Bucket {
    const {
        env,
    } =
        getCloudflareContext();

    const bucket =
        env.datara_crm_documents;

    if (!bucket) {
        throw new ApiError(
            "El almacenamiento no está configurado.",
            500,
        );
    }

    return bucket;
}

function createErrorResponse(
    error: unknown,
) {
    const status =
        error instanceof ApiError
            ? error.status
            : 500;

    if (
        status >=
        500
    ) {
        console.error(
            "No fue posible obtener la foto pública de la credencial:",
            error,
        );
    }

    return Response.json(
        {
            success: false,

            error:
                status === 404
                    ? "La imagen no está disponible."
                    : "No fue posible obtener la imagen.",
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
            token,
        } =
            await context.params;

        const normalizedToken =
            token.trim();

        if (!normalizedToken) {
            throw new ApiError(
                "La imagen no está disponible.",
                404,
            );
        }

        const [result] =
            await db
                .select({
                    credentialStatus:
                        digitalCredentials.status,

                    expiresAt:
                        digitalCredentials.expiresAt,

                    personStatus:
                        people.status,

                    photoObjectKey:
                        people.photoObjectKey,

                    publicVisibility:
                        people.publicVisibility,
                })
                .from(
                    digitalCredentials,
                )
                .innerJoin(
                    people,
                    and(
                        eq(
                            people.id,
                            digitalCredentials.personId,
                        ),
                        eq(
                            people.tenantId,
                            digitalCredentials.tenantId,
                        ),
                    ),
                )
                .where(
                    eq(
                        digitalCredentials.publicToken,
                        normalizedToken,
                    ),
                )
                .limit(1);

        if (!result) {
            throw new ApiError(
                "La imagen no está disponible.",
                404,
            );
        }

        const isExpired =
            result.expiresAt !==
            null &&
            result.expiresAt.getTime() <
            Date.now();

        if (
            result.credentialStatus !==
            "active" ||
            result.personStatus !==
            "active" ||
            isExpired
        ) {
            throw new ApiError(
                "La imagen no está disponible.",
                404,
            );
        }

        const visibility =
            result.publicVisibility as PublicVisibility;

        if (
            visibility.photo !==
            true
        ) {
            throw new ApiError(
                "La imagen no está disponible.",
                404,
            );
        }

        if (
            !result.photoObjectKey
        ) {
            throw new ApiError(
                "La imagen no está disponible.",
                404,
            );
        }

        const object =
            await getBucket().get(
                result.photoObjectKey,
            );

        if (!object) {
            throw new ApiError(
                "La imagen no está disponible.",
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
            "public, max-age=300",
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