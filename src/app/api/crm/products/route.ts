import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmProducts,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const {
    userId,
    orgId,
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

  try {
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

    const products = await db
      .select({
        id: crmProducts.id,
        name: crmProducts.name,
        code: crmProducts.code,
      })
      .from(crmProducts)
      .where(
        and(
          eq(
            crmProducts.tenantId,
            tenant.id,
          ),
          eq(
            crmProducts.active,
            true,
          ),
        ),
      )
      .orderBy(
        asc(crmProducts.name),
      );

    const data = products.map(
      (product) => ({
        value: product.id,
        label: product.code
          ? `${product.name} (${product.code})`
          : product.name,
      }),
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "No fue posible cargar los productos desde PostgreSQL:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible cargar el catálogo de productos.",
      },
      {
        status: 500,
      },
    );
  }
}