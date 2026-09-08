import {
    and,
    eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
    digitalCredentials,
    people,
    tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type PublicVisibility = {
    photo?: boolean;
    personCode?: boolean;
    jobTitle?: boolean;
    department?: boolean;
    email?: boolean;
    phone?: boolean;
    location?: boolean;
    linkedIn?: boolean;
    professionalBio?: boolean;
    hiredAt?: boolean;
};

type RouteContext = {
    params: Promise<{
        token: string;
    }>;
};

function createNotFoundResponse() {
    return NextResponse.json(
        {
            success: false,
            error:
                "La credencial no existe o ya no está disponible.",
        },
        {
            status: 404,
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
            return createNotFoundResponse();
        }

        const [result] =
            await db
                .select({
                    credentialId:
                        digitalCredentials.id,

                    credentialStatus:
                        digitalCredentials.status,

                    credentialType:
                        digitalCredentials.credentialType,

                    issuedAt:
                        digitalCredentials.issuedAt,

                    expiresAt:
                        digitalCredentials.expiresAt,

                    revokedAt:
                        digitalCredentials.revokedAt,

                    personStatus:
                        people.status,

                    personCode:
                        people.personCode,

                    firstName:
                        people.firstName,

                    lastName:
                        people.lastName,

                    email:
                        people.email,

                    phone:
                        people.phone,

                    jobTitle:
                        people.jobTitle,

                    department:
                        people.department,

                    location:
                        people.location,

                    linkedInUrl:
                        people.linkedInUrl,

                    professionalBio:
                        people.professionalBio,

                    photoObjectKey:
                        people.photoObjectKey,

                    hiredAt:
                        people.hiredAt,

                    publicVisibility:
                        people.publicVisibility,

                    organizationName:
                        tenants.name,

                    organizationSlug:
                        tenants.slug,

                    organizationTagline:
                        tenants.tagline,

                    organizationLogoObjectKey:
                        tenants.logoObjectKey,

                    organizationPrimaryColor:
                        tenants.primaryColor,

                    organizationSecondaryColor:
                        tenants.secondaryColor,
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
                .innerJoin(
                    tenants,
                    eq(
                        tenants.id,
                        digitalCredentials.tenantId,
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
            return createNotFoundResponse();
        }

        const now =
            new Date();

        const isExpiredByDate =
            Boolean(
                result.expiresAt &&
                result.expiresAt <
                now,
            );

        const credentialStatus =
            isExpiredByDate
                ? "expired"
                : result.credentialStatus;

        if (
            credentialStatus !==
            "active" ||
            result.personStatus !==
            "active"
        ) {
            return NextResponse.json({
                success: true,

                available:
                    false,

                status:
                    credentialStatus,

                organization: {
                    name:
                        result.organizationName,

                    tagline:
                        result.organizationTagline,

                    primaryColor:
                        result.organizationPrimaryColor,

                    secondaryColor:
                        result.organizationSecondaryColor,
                },
            });
        }

        const visibility =
            (result.publicVisibility ??
                {}) as PublicVisibility;

        return NextResponse.json({
            success: true,

            available:
                true,

            status:
                credentialStatus,

            credential: {
                type:
                    result.credentialType,

                issuedAt:
                    result.issuedAt,

                expiresAt:
                    result.expiresAt,
            },

            organization: {
                name:
                    result.organizationName,

                slug:
                    result.organizationSlug,

                tagline:
                    result.organizationTagline,

                logoObjectKey:
                    result.organizationLogoObjectKey,

                primaryColor:
                    result.organizationPrimaryColor,

                secondaryColor:
                    result.organizationSecondaryColor,
            },

            person: {
                firstName:
                    result.firstName,

                lastName:
                    result.lastName,

                photoObjectKey:
                    visibility.photo
                        ? result.photoObjectKey
                        : null,

                personCode:
                    visibility.personCode
                        ? result.personCode
                        : null,

                jobTitle:
                    visibility.jobTitle
                        ? result.jobTitle
                        : null,

                department:
                    visibility.department
                        ? result.department
                        : null,

                email:
                    visibility.email
                        ? result.email
                        : null,

                phone:
                    visibility.phone
                        ? result.phone
                        : null,

                location:
                    visibility.location
                        ? result.location
                        : null,

                linkedInUrl:
                    visibility.linkedIn
                        ? result.linkedInUrl
                        : null,

                professionalBio:
                    visibility.professionalBio
                        ? result.professionalBio
                        : null,

                hiredAt:
                    visibility.hiredAt
                        ? result.hiredAt
                        : null,
            },
        });
    } catch (error) {
        console.error(
            "No fue posible cargar la credencial pública:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "No fue posible cargar la credencial.",
            },
            {
                status: 500,
            },
        );
    }
}