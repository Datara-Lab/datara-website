import {
  auth,
} from "@clerk/nextjs/server";
import {
  and,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/db";
import {
  crmCustomers,
  crmLeads,
  tenants,
} from "@/db/schema";
import {
  CRMBranchAccessError,
  getCRMBranchAccess,
} from "@/lib/crm/branch-access";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

export const dynamic =
  "force-dynamic";

type ConvertLeadPayload = {
  leadId?: unknown;
};

function getOptionalString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

export async function POST(
  request: Request,
) {
  try {
    const {
      userId,
      orgId,
    } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No autenticado.",
        },
        {
          status: 401,
        },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No hay una organización activa.",
        },
        {
          status: 400,
        },
      );
    }

    const [tenant] =
      await db
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
      return NextResponse.json(
        {
          success: false,
          error:
            "La empresa aún no está sincronizada.",
        },
        {
          status: 404,
        },
      );
    }

    const [
      branchAccess,
    ] = await Promise.all([
      getCRMBranchAccess(
        tenant.id,
        userId,
      ),

      requireCRMModulePermission(
        tenant.id,
        userId,
        "leads",
        "edit",
      ),

      requireCRMModulePermission(
        tenant.id,
        userId,
        "contacts",
        "create",
      ),
    ]);

    const payload =
      (await request.json()) as
        ConvertLeadPayload;

    const leadId =
      getOptionalString(
        payload.leadId,
      );

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible identificar el prospecto.",
        },
        {
          status: 400,
        },
      );
    }

    const leadAccessCondition =
      branchAccess.allBranches
        ? and(
            eq(
              crmLeads.tenantId,
              tenant.id,
            ),
            eq(
              crmLeads.id,
              leadId,
            ),
          )
        : and(
            eq(
              crmLeads.tenantId,
              tenant.id,
            ),
            eq(
              crmLeads.id,
              leadId,
            ),
            branchAccess.branchIds.length >
            0
              ? inArray(
                  crmLeads.branchId,
                  branchAccess.branchIds,
                )
              : sql<boolean>`false`,
          );

    const [lead] =
      await db
        .select()
        .from(crmLeads)
        .where(
          leadAccessCondition,
        )
        .limit(1);

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El prospecto no existe o no está dentro de tus sucursales autorizadas.",
        },
        {
          status: 404,
        },
      );
    }

    if (!lead.branchId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El prospecto no tiene una sucursal asignada.",
        },
        {
          status: 400,
        },
      );
    }

    const [existingCustomer] =
      await db
        .select({
          id:
            crmCustomers.id,
        })
        .from(crmCustomers)
        .where(
          and(
            eq(
              crmCustomers.tenantId,
              tenant.id,
            ),
            eq(
              crmCustomers.sourceLeadId,
              lead.id,
            ),
          ),
        )
        .limit(1);

    if (existingCustomer) {
      await db
        .update(crmLeads)
        .set({
          status:
            "Convertido",
          updatedAt:
            new Date(),
        })
        .where(
          leadAccessCondition,
        );

      return NextResponse.json({
        success: true,
        message:
          "El prospecto ya estaba convertido en cliente.",
        data: {
          customerId:
            existingCustomer.id,
        },
      });
    }

    const now =
      new Date();

    const [customer] =
      await db
        .insert(
          crmCustomers,
        )
        .values({
          tenantId:
            tenant.id,

          branchId:
            lead.branchId,

          customerType:
            "Persona",

          name:
            lead.firstName,

          lastName:
            lead.lastName,

          email:
            lead.email,

          phone:
            lead.phone,

          mobile:
            lead.mobile,

          status:
            "Activo",

          sourceLeadId:
            lead.id,

          ownerClerkUserId:
            lead.ownerClerkUserId,

          ownerName:
            lead.ownerName,

          ownerEmail:
            lead.ownerEmail,

          commercialConsent:
            lead.commercialConsent,

          notes:
            lead.notes,

          createdAt:
            now,

          updatedAt:
            now,
        })
        .returning({
          id:
            crmCustomers.id,
        });

    if (!customer) {
      throw new Error(
        "No fue posible crear el cliente.",
      );
    }

    await db
      .update(crmLeads)
      .set({
        status:
          "Convertido",
        updatedAt:
          now,
      })
      .where(
        leadAccessCondition,
      );

    return NextResponse.json({
      success: true,
      message:
        "El prospecto fue convertido en cliente correctamente.",
      data: {
        customerId:
          customer.id,
      },
    });
  } catch (error) {
    if (
      error instanceof
        CRMBranchAccessError ||
      error instanceof
        CRMPermissionError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

    console.error(
      "No fue posible convertir el prospecto en cliente:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible convertir el prospecto en cliente.",
      },
      {
        status: 500,
      },
    );
  }
}