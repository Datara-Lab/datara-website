import { auth } from "@clerk/nextjs/server";
import {
    and,
    asc,
    eq,
    inArray,
    ne,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
    memberBranchAccess,
    memberProductRoles,
    memberRegionAccess,
    roles,
    tenantBranches,
    tenantMembers,
    tenantProducts,
    tenantRegions,
    tenants,
} from "@/db/schema";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

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
            name: tenants.name,
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

    return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        currentUserId: userId,
    };
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

    if (
  error instanceof AdministrationAuthError
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

    console.error(
        "No fue posible cargar los usuarios de la organización:",
        error,
    );

    return NextResponse.json(
        {
            success: false,
            error:
                "No fue posible cargar los usuarios de la organización.",
        },
        {
            status: 500,
        },
    );
}

export async function GET() {
    try {
        const {
            tenantId,
            clerkUserId: currentUserId,
            } = await requireAdminContext();
        const [tenantInfo] = await db
            .select({
                name: tenants.name,
            })
            .from(tenants)
            .where(
                eq(
                tenants.id,
                tenantId,
                ),
            )
            .limit(1);

            const tenantName =
            tenantInfo?.name ?? "";

        const members = await db
            .select({
                id: tenantMembers.id,
                clerkUserId:
                    tenantMembers.clerkUserId,
                email: tenantMembers.email,
                firstName:
                    tenantMembers.firstName,
                lastName:
                    tenantMembers.lastName,
                status: tenantMembers.status,
                roleId: tenantMembers.roleId,
                joinedAt:
                    tenantMembers.joinedAt,
                createdAt:
                    tenantMembers.createdAt,
                updatedAt:
                    tenantMembers.updatedAt,
            })
            .from(tenantMembers)
            .where(
                and(
                    eq(
                        tenantMembers.tenantId,
                        tenantId,
                    ),
                    ne(
                        tenantMembers.status,
                        "removed",
                    ),
                ),
            )
            .orderBy(
                asc(tenantMembers.firstName),
                asc(tenantMembers.lastName),
                asc(tenantMembers.email),
            );

        const enabledProducts =
            await db
                .select({
                    product:
                        tenantProducts.product,
                })
                .from(tenantProducts)
                .where(
                    and(
                        eq(
                            tenantProducts.tenantId,
                            tenantId,
                        ),
                        eq(
                            tenantProducts.enabled,
                            true,
                        ),
                    ),
                );

        const memberIds = members.map(
            (member) => member.id,
        );

        const globalRoleIds = members
            .map((member) => member.roleId)
            .filter(
                (roleId): roleId is string =>
                    Boolean(roleId),
            );

        const productAssignments =
            memberIds.length > 0
                ? await db
                    .select({
                        memberId:
                            memberProductRoles.memberId,
                        product:
                            memberProductRoles.product,
                        enabled:
                            memberProductRoles.enabled,

                        allBranches:
                            memberProductRoles.allBranches,

                        roleId:
                            memberProductRoles.roleId,
                        roleName: roles.name,
                        roleKey: roles.key,
                        roleProduct:
                            roles.product,
                    })
                    .from(memberProductRoles)
                    .innerJoin(
                        roles,
                        eq(
                            memberProductRoles.roleId,
                            roles.id,
                        ),
                    )
                    .where(
                        and(
                            eq(
                                memberProductRoles.tenantId,
                                tenantId,
                            ),
                            inArray(
                                memberProductRoles.memberId,
                                memberIds,
                            ),
                        ),
                    )
                : [];

        const availableRegions =
            await db
                .select({
                    id:
                        tenantRegions.id,
                    name:
                        tenantRegions.name,
                    code:
                        tenantRegions.code,
                    active:
                        tenantRegions.active,
                })
                .from(
                    tenantRegions,
                )
                .where(
                    eq(
                        tenantRegions.tenantId,
                        tenantId,
                    ),
                )
                .orderBy(
                    asc(
                        tenantRegions.name,
                    ),
                );

        const availableBranches =
            await db
                .select({
                    id:
                        tenantBranches.id,
                    regionId:
                        tenantBranches.regionId,
                    name:
                        tenantBranches.name,
                    code:
                        tenantBranches.code,
                    active:
                        tenantBranches.active,
                })
                .from(
                    tenantBranches,
                )
                .where(
                    eq(
                        tenantBranches.tenantId,
                        tenantId,
                    ),
                )
                .orderBy(
                    asc(
                        tenantBranches.name,
                    ),
                );

        const regionAssignments =
            memberIds.length > 0
                ? await db
                    .select({
                        memberId:
                            memberRegionAccess.memberId,
                        product:
                            memberRegionAccess.product,
                        regionId:
                            memberRegionAccess.regionId,
                    })
                    .from(
                        memberRegionAccess,
                    )
                    .where(
                        and(
                            eq(
                                memberRegionAccess.tenantId,
                                tenantId,
                            ),
                            inArray(
                                memberRegionAccess.memberId,
                                memberIds,
                            ),
                        ),
                    )
                : [];

        const branchAssignments =
            memberIds.length > 0
                ? await db
                    .select({
                        memberId:
                            memberBranchAccess.memberId,
                        product:
                            memberBranchAccess.product,
                        branchId:
                            memberBranchAccess.branchId,
                        isPrimary:
                            memberBranchAccess.isPrimary,
                    })
                    .from(
                        memberBranchAccess,
                    )
                    .where(
                        and(
                            eq(
                                memberBranchAccess.tenantId,
                                tenantId,
                            ),
                            inArray(
                                memberBranchAccess.memberId,
                                memberIds,
                            ),
                        ),
                    )
                : [];

        const productRoleIds =
            productAssignments.map(
                (assignment) =>
                    assignment.roleId,
            );

        const allRoleIds = Array.from(
            new Set([
                ...globalRoleIds,
                ...productRoleIds,
            ]),
        );

        const availableRoles =
            allRoleIds.length > 0
                ? await db
                    .select({
                        id: roles.id,
                        key: roles.key,
                        name: roles.name,
                        description:
                            roles.description,
                        product: roles.product,
                        isSystem:
                            roles.isSystem,
                    })
                    .from(roles)
                    .where(
                        and(
                            eq(
                                roles.tenantId,
                                tenantId,
                            ),
                            inArray(
                                roles.id,
                                allRoleIds,
                            ),
                        ),
                    )
                : [];

        const roleById = new Map(
            availableRoles.map((role) => [
                role.id,
                role,
            ]),
        );

        const assignmentsByMember =
            new Map<
                string,
                typeof productAssignments
            >();

        for (const assignment of productAssignments) {
            const current =
                assignmentsByMember.get(
                    assignment.memberId,
                ) ?? [];

            current.push(assignment);

            assignmentsByMember.set(
                assignment.memberId,
                current,
            );
        }

        const data = members.map(
            (member) => {
                const fullName = [
                    member.firstName,
                    member.lastName,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                const globalRole =
                    member.roleId
                        ? roleById.get(
                            member.roleId,
                        )
                        : null;

                const productAccess = (
                    assignmentsByMember.get(
                        member.id,
                    ) ?? []
                ).map((assignment) => {
                    const regions =
                        regionAssignments
                            .filter(
                                (item) =>
                                    item.memberId ===
                                        member.id &&
                                    item.product ===
                                        assignment.product,
                            )
                            .map(
                                (item) =>
                                    item.regionId,
                            );

                    const branches =
                        branchAssignments
                            .filter(
                                (item) =>
                                    item.memberId ===
                                        member.id &&
                                    item.product ===
                                        assignment.product,
                            )
                            .map(
                                (item) => ({
                                    branchId:
                                        item.branchId,
                                    isPrimary:
                                        item.isPrimary,
                                }),
                            );

                    return {
                        product:
                            assignment.product,

                        enabled:
                            assignment.enabled,

                        allBranches:
                            assignment.allBranches,

                        regionIds:
                            regions,

                        branches,

                        role: {
                            id:
                                assignment.roleId,
                            key:
                                assignment.roleKey,
                            name:
                                assignment.roleName,
                            product:
                                assignment.roleProduct,
                        },
                    };
                });

                return {
                    id: member.id,
                    clerkUserId:
                        member.clerkUserId,
                    name:
                        fullName || member.email,
                    firstName:
                        member.firstName,
                    lastName:
                        member.lastName,
                    email: member.email,
                    status: member.status,
                    isCurrentUser:
                        member.clerkUserId ===
                        currentUserId,

                    globalRole: globalRole
                        ? {
                            id: globalRole.id,
                            key: globalRole.key,
                            name: globalRole.name,
                            description:
                                globalRole.description,
                            isSystem:
                                globalRole.isSystem,
                        }
                        : null,

                    productAccess,

                    joinedAt:
                        member.joinedAt.toISOString(),
                    createdAt:
                        member.createdAt.toISOString(),
                    updatedAt:
                        member.updatedAt.toISOString(),
                };
            },
        );

        return NextResponse.json({
            success: true,
            data: {
                organization: {
                    id: tenantId,
                    name: tenantName,
                },

                enabledProducts:
                    enabledProducts.map(
                        (item) => item.product,
                    ),

                regions:
                    availableRegions,

                branches:
                    availableBranches,

                users: data,
            },
        });
    } catch (error) {
        return createErrorResponse(error);
    }
}