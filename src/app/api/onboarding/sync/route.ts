import {
  auth,
  clerkClient,
  currentUser,
} from "@clerk/nextjs/server";
import {
  and,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  commercialPurchases,
  memberProductRoles,
  roles,
  subscriptions,
  tenantMembers,
  tenantProducts,
  tenants,
  trialRedemptions,
} from "@/db/schema";

import {
  provisionCRMTemplateRoles,
} from "@/lib/crm/provision-template-roles";

import {
  provisionCRMProductCatalog,
} from "@/lib/crm/provision-product-catalog";

import {
  provisionCRMModuleEntitlements,
} from "@/lib/crm/provision-module-entitlements";

import {
  getDataraProvisioningMetadata,
} from "@/lib/onboarding/provisioning-metadata";

const supportedProducts = [
  "crm",
  "analytics",
  "cloud",
] as const;

type ProductKey =
  (typeof supportedProducts)[number];

const defaultRoles = [
  {
    key: "owner",
    name: "Propietario",
    description:
      "Control total de la organización.",
  },
  {
    key: "admin",
    name: "Administrador",
    description:
      "Administra usuarios, permisos y configuración.",
  },
  {
    key: "manager",
    name: "Gerente",
    description:
      "Supervisa la operación y los equipos.",
  },
  {
    key: "user",
    name: "Usuario",
    description:
      "Acceso operativo según sus permisos.",
  },
] as const;

function getProducts(
  metadata: unknown,
): ProductKey[] {
  if (
    typeof metadata !== "object" ||
    metadata === null
  ) {
    return [];
  }

  const products = (
    metadata as {
      products?: unknown;
    }
  ).products;

  if (!Array.isArray(products)) {
    return [];
  }

  return products.filter(
    (product): product is ProductKey =>
      typeof product === "string" &&
      supportedProducts.includes(
        product as ProductKey,
      ),
  );
}

function getIndustry(
  metadata: unknown,
):
  | "motorcycle_dealership"
  | "automotive_dealership"
  | "veterinary"
  | "real_estate"
  | "retail"
  | "professional_services"
  | "other"
  | null {
  if (
    typeof metadata !==
      "object" ||
    metadata === null
  ) {
    return null;
  }

  const industry =
    (
      metadata as {
        industry?: unknown;
      }
    ).industry;

  if (
    industry ===
      "motorcycle_dealership" ||
    industry ===
      "automotive_dealership" ||
    industry ===
      "veterinary" ||
    industry ===
      "real_estate" ||
    industry ===
      "retail" ||
    industry ===
      "professional_services" ||
    industry ===
      "other"
  ) {
    return industry;
  }

  return null;
}

function getLocalRoleKey(
  clerkRole?: string | null,
) {
  switch (clerkRole) {
    case "org:admin":
      return "admin";

    case "org:manager":
      return "manager";

    default:
      return "user";
  }
}

export async function POST(
  request: Request,
) {
  const {
    userId,
    orgId,
    orgRole:
      activeOrganizationRole,
  } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "No autenticado.",
      },
      {
        status: 401,
      },
    );
  }

  let requestedOrganizationId:
    string | null = null;

  try {
    const requestBody =
      (await request.json()) as {
        organizationId?: unknown;
      };

    requestedOrganizationId =
      typeof requestBody
        .organizationId ===
        "string"
        ? requestBody
            .organizationId
            .trim() || null
        : null;
  } catch {
    requestedOrganizationId =
      null;
  }

  const organizationId =
    requestedOrganizationId ??
    orgId;

  if (!organizationId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Selecciona una organización antes de continuar.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const user = await currentUser();
    const clerk = await clerkClient();

    const memberships =
      await clerk.organizations
        .getOrganizationMembershipList({
          organizationId,

          userId: [
            userId,
          ],

          limit: 1,
        });

    const membership =
      memberships.data[0];

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No tienes acceso a la organización solicitada.",
        },
        {
          status: 403,
        },
      );
    }

    const orgRole =
      organizationId === orgId
        ? activeOrganizationRole ??
          membership.role
        : membership.role;

    const organization =
      await clerk.organizations
        .getOrganization({
          organizationId,
        });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible consultar el usuario.",
        },
        {
          status: 404,
        },
      );
    }

    const now = new Date();
    const organizationProducts =
      getProducts(
        organization.publicMetadata,
      );

    const organizationIndustry =
      getIndustry(
        organization.publicMetadata,
      );

    const provisioningMetadata =
      getDataraProvisioningMetadata(
        organization.publicMetadata,
      );

    const organizationTaxId =
      typeof organization
        .privateMetadata
        .taxId === "string"
        ? organization
            .privateMetadata
            .taxId
            .trim()
            .toUpperCase()
        : null;

    const trialRedemptionId =
      typeof organization
        .privateMetadata
        .trialRedemptionId ===
        "string"
        ? organization
            .privateMetadata
            .trialRedemptionId
        : null;

    const commercialPurchaseId =
      typeof organization
        .privateMetadata
        .commercialPurchaseId ===
        "string"
        ? organization
            .privateMetadata
            .commercialPurchaseId
        : null;

    const [tenant] = await db
      .insert(tenants)
      .values({
        clerkOrganizationId:
          organization.id,
        slug:
          organization.slug ??
          organization.id,
        name: organization.name,

        industry:
          organizationIndustry,

        taxId:
          organizationTaxId,

        status: "provisioning",
        metadata: {
          clerkPublicMetadata:
            organization.publicMetadata,
        },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target:
          tenants.clerkOrganizationId,
        set: {
          slug:
            organization.slug ??
            organization.id,

          industry:
            organizationIndustry ??
            undefined,

          taxId:
            organizationTaxId ??
            undefined,

          metadata: {
            clerkPublicMetadata:
              organization.publicMetadata,
          },
          updatedAt: now,
        },
      })
      .returning();

    if (!tenant) {
      throw new Error(
        "No fue posible registrar la empresa.",
      );
    }

    await db
      .insert(roles)
      .values(
        defaultRoles.map((role) => ({
          tenantId: tenant.id,
          key: role.key,
          name: role.name,
          description:
            role.description,
          isSystem: true,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing({
        target: [
          roles.tenantId,
          roles.key,
        ],
      });

    if (
      organizationProducts.includes(
        "crm",
      )
    ) {
      await provisionCRMTemplateRoles(
        tenant.id,
        tenant.name,
        tenant.industry ??
          "other",
      );

      if (tenant.industry) {
        await provisionCRMProductCatalog(
          tenant.id,
          tenant.industry,
        );
      }
    }

    const tenantRoles = await db
      .select()
      .from(roles)
      .where(
        eq(
          roles.tenantId,
          tenant.id,
        ),
      );

    const ownerRole =
      tenantRoles.find(
        (role) =>
          role.key === "owner" &&
          role.product === null,
      );

    const [existingOwner] =
      ownerRole
        ? await db
            .select({
              id:
                tenantMembers.id,

              clerkUserId:
                tenantMembers
                  .clerkUserId,
            })
            .from(tenantMembers)
            .where(
              and(
                eq(
                  tenantMembers
                    .tenantId,
                  tenant.id,
                ),
                eq(
                  tenantMembers
                    .roleId,
                  ownerRole.id,
                ),
                eq(
                  tenantMembers.status,
                  "active",
                ),
              ),
            )
            .limit(1)
        : [];

    const isExistingOwner =
      existingOwner
        ?.clerkUserId ===
      userId;

    const localRoleKey =
      isExistingOwner ||
      (
        !existingOwner &&
        orgRole ===
          "org:admin"
      )
        ? "owner"
        : getLocalRoleKey(
            orgRole,
          );

    const assignedRole =
      tenantRoles.find(
        (role) =>
          role.key ===
            localRoleKey &&
          role.product === null,
      ) ??
      tenantRoles.find(
        (role) =>
          role.key === "user" &&
          role.product === null,
      );

    const primaryEmail =
      user.emailAddresses.find(
        (email) =>
          email.id ===
          user.primaryEmailAddressId,
      ) ??
      user.emailAddresses[0];

    if (!primaryEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El usuario no tiene un correo electrónico.",
        },
        {
          status: 400,
        },
      );
    }

    const [member] =
      await db
        .insert(tenantMembers)
        .values({
          tenantId: tenant.id,
          clerkUserId: user.id,
          roleId:
            assignedRole?.id ?? null,
          email:
            primaryEmail.emailAddress,
          firstName:
            user.firstName ?? null,
          lastName:
            user.lastName ?? null,
          status: "active",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            tenantMembers.tenantId,
            tenantMembers.clerkUserId,
          ],
          set: {
            roleId:
              assignedRole?.id ?? null,
            email:
              primaryEmail.emailAddress,
            firstName:
              user.firstName ?? null,
            lastName:
              user.lastName ?? null,
            status: "active",
            updatedAt: now,
          },
        })
        .returning({
          id:
            tenantMembers.id,
        });

    if (!member) {
      throw new Error(
        "No fue posible registrar al usuario en la empresa.",
      );
    }

    if (
      localRoleKey === "owner" &&
      assignedRole &&
      organizationProducts.includes(
        "crm",
      )
    ) {
      await db
        .insert(
          memberProductRoles,
        )
        .values({
          tenantId:
            tenant.id,

          memberId:
            member.id,

          product:
            "crm",

          roleId:
            assignedRole.id,

          enabled: true,
          allBranches: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            memberProductRoles
              .memberId,
            memberProductRoles
              .product,
          ],

          set: {
            roleId:
              assignedRole.id,

            enabled: true,
            allBranches: true,
            updatedAt: now,
          },
        });
    }

    await db
      .update(tenantProducts)
      .set({
        enabled: false,
        disabledAt: now,
      })
      .where(
        eq(
          tenantProducts.tenantId,
          tenant.id,
        ),
      );

    if (
      organizationProducts.length > 0
    ) {
      await db
        .insert(tenantProducts)
        .values(
          organizationProducts.map(
            (product) => ({
              tenantId: tenant.id,
              product,
              enabled: true,
              enabledAt: now,
              disabledAt: null,
              configuration: {},
            }),
          ),
        )
        .onConflictDoUpdate({
          target: [
            tenantProducts.tenantId,
            tenantProducts.product,
          ],
          set: {
            enabled: true,
            enabledAt: now,
            disabledAt: null,
          },
        });
    }

    let provisionedModuleIds:
      string[] = [];

    if (
      organizationProducts.includes(
        "crm",
      ) &&
      organizationIndustry &&
      provisioningMetadata
    ) {
      const [activeStripeSubscription] =
        await db
          .select({
            id:
              subscriptions.id,
          })
          .from(
            subscriptions,
          )
          .where(
            and(
              eq(
                subscriptions.tenantId,
                tenant.id,
              ),

              eq(
                subscriptions.provider,
                "stripe",
              ),

              eq(
                subscriptions.status,
                "active",
              ),
            ),
          )
          .limit(1);

      const ignoreStaleTrialMetadata =
        provisioningMetadata.mode ===
          "trial" &&
        Boolean(
          activeStripeSubscription,
        );

      let expiresAt:
        Date | null =
        provisioningMetadata.mode ===
        "trial"
          ? new Date(
              provisioningMetadata
                .trialEndsAt!,
            )
          : null;

      if (
        provisioningMetadata.mode ===
          "subscription" &&
        commercialPurchaseId
      ) {
        const [
          subscriptionPurchase,
        ] =
          await db
            .select({
              billingPeriod:
                commercialPurchases
                  .billingPeriod,

              paidAt:
                commercialPurchases
                  .paidAt,
            })
            .from(
              commercialPurchases,
            )
            .where(
              eq(
                commercialPurchases.id,
                commercialPurchaseId,
              ),
            )
            .limit(1);

        if (
          subscriptionPurchase
            ?.billingPeriod ===
          "annual_installments"
        ) {
          expiresAt =
            new Date(
              subscriptionPurchase
                .paidAt ??
              now,
            );

          expiresAt
            .setUTCFullYear(
              expiresAt
                .getUTCFullYear() +
                1,
            );
        }
      }

      if (!ignoreStaleTrialMetadata) {
        provisionedModuleIds =
          await provisionCRMModuleEntitlements({
            tenantId: tenant.id,

            industry:
              organizationIndustry,

            mode:
              provisioningMetadata.mode,

            packageKeys:
              provisioningMetadata
                .packageKeys,

            expiresAt,
          });
      }

      if (
        provisioningMetadata.mode ===
          "trial" &&
        !ignoreStaleTrialMetadata
      ) {
        await db
          .insert(subscriptions)
          .values({
            tenantId:
              tenant.id,

            provider:
              "datara",

            providerSubscriptionId:
              `trial:${tenant.id}`,

            planKey:
              `trial-full-${organizationIndustry}`,

            status:
              "trialing",

            seats: 1,
            currency:
              "mxn",

            currentPeriodStart:
              now,

            currentPeriodEnd:
              expiresAt,

            cancelAtPeriodEnd:
              true,

            updatedAt:
              now,
          })
          .onConflictDoUpdate({
            target: [
              subscriptions.provider,
              subscriptions
                .providerSubscriptionId,
            ],

            set: {
              planKey:
                `trial-full-${organizationIndustry}`,

              status:
                "trialing",

              currentPeriodEnd:
                expiresAt,

              cancelAtPeriodEnd:
                true,

              updatedAt:
                now,
            },
          });
      }

            if (
        provisioningMetadata.mode ===
          "subscription" &&
        commercialPurchaseId
      ) {
        const [commercialPurchase] =
          await db
            .select({
              id:
                commercialPurchases.id,

              status:
                commercialPurchases.status,

              clerkUserId:
                commercialPurchases
                  .clerkUserId,

              clerkOrganizationId:
                commercialPurchases
                  .clerkOrganizationId,

              stripeCustomerId:
                commercialPurchases
                  .stripeCustomerId,

              stripeSubscriptionId:
                commercialPurchases
                  .stripeSubscriptionId,

              productKey:
                commercialPurchases
                  .productKey,

              billingPeriod:
                commercialPurchases
                  .billingPeriod,

              catalogItemIds:
                commercialPurchases
                  .catalogItemIds,

              currency:
                commercialPurchases
                  .currency,

              paidAt:
                commercialPurchases
                  .paidAt,
            })
            .from(
              commercialPurchases,
            )
            .where(
              eq(
                commercialPurchases.id,
                commercialPurchaseId,
              ),
            )
            .limit(1);

        const isAnnualInstallments =
          commercialPurchase
            ?.billingPeriod ===
          "annual_installments";

        if (
          !commercialPurchase ||
          commercialPurchase
            .clerkUserId !==
            user.id ||
          commercialPurchase
            .clerkOrganizationId !==
            organization.id ||
          (
            !isAnnualInstallments &&
            !commercialPurchase
              .stripeSubscriptionId
          )
        ) {
          throw new Error(
            "La contratación pagada no corresponde con la organización activa.",
          );
        }

        const planKey =
          provisioningMetadata
            .packageKeys.length >
          0
            ? `crm-${provisioningMetadata.packageKeys.join(
                "-",
              )}`
            : "crm-custom";

        const currentPeriodStart =
          commercialPurchase
            .paidAt ??
          now;

        const currentPeriodEnd =
          isAnnualInstallments
            ? new Date(
                currentPeriodStart,
              )
            : null;

        if (currentPeriodEnd) {
          currentPeriodEnd
            .setUTCFullYear(
              currentPeriodEnd
                .getUTCFullYear() +
                1,
            );
        }

        if (isAnnualInstallments) {
          const [
            existingSubscription,
          ] =
            await db
              .select({
                id:
                  subscriptions.id,
              })
              .from(
                subscriptions,
              )
              .where(
                and(
                  eq(
                    subscriptions
                      .tenantId,
                    tenant.id,
                  ),

                  eq(
                    subscriptions
                      .productKey,
                    commercialPurchase
                      .productKey,
                  ),
                ),
              )
              .limit(1);

          if (existingSubscription) {
            await db
              .update(
                subscriptions,
              )
              .set({
                provider:
                  "stripe",

                providerCustomerId:
                  commercialPurchase
                    .stripeCustomerId,

                providerSubscriptionId:
                  null,

                providerScheduleId:
                  null,

                productKey:
                  commercialPurchase
                    .productKey,

                planKey,

                billingPeriod:
                  commercialPurchase
                    .billingPeriod,

                catalogItemIds:
                  commercialPurchase
                    .catalogItemIds,

                pendingBillingPeriod:
                  null,

                pendingCatalogItemIds:
                  null,

                pendingChangeAt:
                  null,

                status:
                  "active",

                seats:
                  1,

                currency:
                  commercialPurchase
                    .currency,

                currentPeriodStart,

                currentPeriodEnd,

                cancelAtPeriodEnd:
                  false,

                updatedAt:
                  now,
              })
              .where(
                eq(
                  subscriptions.id,
                  existingSubscription.id,
                ),
              );
          } else {
            await db
              .insert(
                subscriptions,
              )
              .values({
                tenantId:
                  tenant.id,

                provider:
                  "stripe",

                providerCustomerId:
                  commercialPurchase
                    .stripeCustomerId,

                providerSubscriptionId:
                  null,

                productKey:
                  commercialPurchase
                    .productKey,

                planKey,

                billingPeriod:
                  commercialPurchase
                    .billingPeriod,

                catalogItemIds:
                  commercialPurchase
                    .catalogItemIds,

                status:
                  "active",

                seats:
                  1,

                currency:
                  commercialPurchase
                    .currency,

                currentPeriodStart,

                currentPeriodEnd,

                cancelAtPeriodEnd:
                  false,

                updatedAt:
                  now,
              });
          }
        } else {
          await db
            .insert(subscriptions)
            .values({
              tenantId:
                tenant.id,

              provider:
                "stripe",

              providerCustomerId:
                commercialPurchase
                  .stripeCustomerId,

              providerSubscriptionId:
                commercialPurchase
                  .stripeSubscriptionId,

              productKey:
                commercialPurchase
                  .productKey,

              planKey,

              billingPeriod:
                commercialPurchase
                  .billingPeriod,

              catalogItemIds:
                commercialPurchase
                  .catalogItemIds,

              status:
                "active",

              seats:
                1,

              currency:
                commercialPurchase
                  .currency,

              currentPeriodStart,

              currentPeriodEnd:
                null,

              cancelAtPeriodEnd:
                false,

              updatedAt:
                now,
            })
            .onConflictDoUpdate({
              target: [
                subscriptions.provider,
                subscriptions
                  .providerSubscriptionId,
              ],

              set: {
                tenantId:
                  tenant.id,

                providerCustomerId:
                  commercialPurchase
                    .stripeCustomerId,

                productKey:
                  commercialPurchase
                    .productKey,

                planKey,

                billingPeriod:
                  commercialPurchase
                    .billingPeriod,

                catalogItemIds:
                  commercialPurchase
                    .catalogItemIds,

                status:
                  "active",

                currency:
                  commercialPurchase
                    .currency,

                cancelAtPeriodEnd:
                  false,

                updatedAt:
                  now,
              },
            });
        }

        await db
          .update(
            commercialPurchases,
          )
          .set({
            tenantId:
              tenant.id,

            status:
              "provisioned",

            provisionedAt:
              now,

            updatedAt:
              now,
          })
          .where(
            eq(
              commercialPurchases.id,
              commercialPurchase.id,
            ),
          );
      }

      await db
        .update(tenants)
        .set({
          status:
            "active",

          updatedAt:
            now,
        })
        .where(
          eq(
            tenants.id,
            tenant.id,
          ),
        );

      if (
        provisioningMetadata.mode ===
          "trial" &&
        !ignoreStaleTrialMetadata &&
        trialRedemptionId
      ) {
        await db
          .update(
            trialRedemptions,
          )
          .set({
            tenantId:
              tenant.id,

            clerkOrganizationId:
              organization.id,

            ownerEmail:
              primaryEmail
                .emailAddress
                .trim()
                .toLowerCase(),

            status:
              "active",

            updatedAt:
              now,
          })
          .where(
            eq(
              trialRedemptions.id,
              trialRedemptionId,
            ),
          );
      }
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        clerkOrganizationId:
          tenant.clerkOrganizationId,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
      },
      member: {
        clerkUserId: user.id,
        role: assignedRole?.key ?? null,
      },
      products:
        organizationProducts,
    });
  } catch (error) {
    console.error(
      "Error al sincronizar la organización:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible sincronizar la organización.",
      },
      {
        status: 500,
      },
    );
  }
}
