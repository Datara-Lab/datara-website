import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { db } from "@/db";
import { petReservations } from "@/db/schema";
import { createPetApiErrorResponse, getPetApiContext, PetApiError } from "@/lib/crm/pet-api-context";

type RouteContext = { params: Promise<{ reservationId: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantId } = await getPetApiContext("contacts", "view");
    const { reservationId } = await context.params;
    const [reservation] = await db.select({ id: petReservations.id }).from(petReservations).where(and(
      eq(petReservations.id, reservationId),
      eq(petReservations.tenantId, tenantId),
    )).limit(1);
    if (!reservation) throw new PetApiError("La reservación no existe.", 404);

    const checkoutUrl = new URL("/crm/mascotas", new URL(request.url).origin);
    checkoutUrl.searchParams.set("petCheckout", reservation.id);
    const dataUrl = await QRCode.toDataURL(checkoutUrl.toString(), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: { dark: "#020617", light: "#FFFFFF" },
    });
    const encoded = dataUrl.split(",")[1];
    if (!encoded) throw new Error("No fue posible generar el código QR.");
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new NextResponse(bytes, {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return createPetApiErrorResponse(error, "No fue posible generar el QR de salida.");
  }
}
