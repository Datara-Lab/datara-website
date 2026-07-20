import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

export async function GET() {
  const { userId } = await auth();

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

  try {
    await db.execute(
      sql`SELECT 1 AS connected`,
    );

    return NextResponse.json({
      success: true,
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Error al comprobar PostgreSQL:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible conectar con PostgreSQL.",
      },
      {
        status: 503,
      },
    );
  }
}
