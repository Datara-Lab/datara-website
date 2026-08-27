import { getCloudflareContext } from "@opennextjs/cloudflare";

import { auth } from "@clerk/nextjs/server";

import { and, eq } from "drizzle-orm";

import { Buffer } from "node:buffer";

import { GET as getQuotes } from "@/app/api/crm/quotes/route";

import { GET as getQuotePdf } from "@/app/api/crm/quotes/[quoteId]/pdf/route";

import { db } from "@/db";

import {
  CommercialEmailLimitError,
  sendMeteredCommercialEmail,
} from "@/lib/commercial/email-usage";

import { crmQuotes, tenants } from "@/db/schema";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

import type { CRMQuoteApiResponse, CRMQuoteRecord } from "@/types/crm-quotes";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

type SendPayload = {
  email?: unknown;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

type EmailEnv = {
  RESEND_API_KEY?: string;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getEmail(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return undefined;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ApiError("El correo del destinatario no es válido.", 400);
  }

  return email;
}

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",

    currency: currency.toUpperCase(),

    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Sin fecha";
  }

  const datePart = value.slice(0, 10);

  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw new ApiError("No autenticado.", 401);
    }

    if (!orgId) {
      throw new ApiError("No hay una organización activa.", 400);
    }

    const { quoteId } = await context.params;

    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        legalName: tenants.legalName,
      })
      .from(tenants)
      .where(eq(tenants.clerkOrganizationId, orgId))
      .limit(1);

    if (!tenant) {
      throw new ApiError("La empresa aún no está sincronizada.", 404);
    }

    await requireCRMModulePermission(tenant.id, userId, "quotes", "edit");

    let payload: SendPayload = {};

    try {
      payload = (await request.json()) as SendPayload;
    } catch {
      payload = {};
    }

    const quotesResponse = await getQuotes();

    const quotesResult = (await quotesResponse.json()) as CRMQuoteApiResponse<
      CRMQuoteRecord[]
    >;

    if (!quotesResponse.ok || !quotesResult.success) {
      throw new ApiError(
        quotesResult.error ?? "No fue posible consultar la cotización.",
        quotesResponse.status,
      );
    }

    const quote = quotesResult.data?.find((record) => record.id === quoteId);

    if (!quote) {
      throw new ApiError("La cotización no existe.", 404);
    }

    const recipient = getEmail(payload.email) ?? getEmail(quote.relatedEmail);

    if (!recipient) {
      throw new ApiError(
        "El cliente o prospecto no tiene un correo registrado.",
        400,
      );
    }

    const pdfResponse = await getQuotePdf(
      request,

      {
        params: Promise.resolve({
          quoteId,
        }),
      },
    );

    if (!pdfResponse.ok) {
      const pdfError = (await pdfResponse.json()) as {
        error?: string;
      };

      throw new ApiError(
        pdfError.error ?? "No fue posible generar el PDF de la cotización.",
        pdfResponse.status,
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const { env } = getCloudflareContext();

    const emailEnv = env as EmailEnv;

    const resendApiKey = emailEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new ApiError("El servicio de correo no está configurado.", 500);
    }

    const companyName = tenant.legalName ?? tenant.name;

    const safeCompanyName = escapeHtml(companyName);

    const safeCustomerName = escapeHtml(quote.relatedName ?? "cliente");

    const safeQuoteNumber = escapeHtml(quote.quoteNumber);

    const safeSubject = escapeHtml(quote.subject);

    const safeTotal = escapeHtml(
      formatMoney(quote.totalAmount, quote.currency),
    );

    const safeValidity = escapeHtml(formatDate(quote.validUntil));

    const resendRequest = await sendMeteredCommercialEmail({
      tenantId: tenant.id,

      send: () =>
        fetch("https://api.resend.com/emails", {
          method: "POST",

          headers: {
            Authorization: `Bearer ${resendApiKey}`,

            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            from: `${tenant.name} <web@mail.datara-lab.com>`,

            to: [recipient],

            reply_to: quote.owner.email ?? undefined,

            subject: `Cotización ${quote.quoteNumber}: ${quote.subject}`,

            html: `
              <div style="background:#f1f5f9;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
                <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
                  <div style="height:8px;background:linear-gradient(90deg,#1d4ed8,#06b6d4);"></div>

                  <div style="padding:32px;">
                    <p style="margin:0 0 12px;color:#059669;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                      Cotización ${safeQuoteNumber}
                    </p>

                    <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;">
                      ${safeSubject}
                    </h1>

                    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
                      Hola ${safeCustomerName}, adjuntamos la cotización preparada por ${safeCompanyName}.
                    </p>

                    <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">
                          Total
                        </td>

                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-size:18px;font-weight:700;">
                          ${safeTotal}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">
                          Vigencia
                        </td>

                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">
                          ${safeValidity}
                        </td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.7;">
                      Encontrarás el documento completo en formato PDF adjunto a este correo.
                    </p>
                  </div>

                  <div style="background:#f8fafc;padding:20px 32px;color:#64748b;font-size:12px;">
                    Enviado desde Datara CRM por ${safeCompanyName}.
                  </div>
                </div>
              </div>
            `,

            attachments: [
              {
                filename: `${safeFileName(`cotizacion-${quote.quoteNumber}`)}.pdf`,

                content: pdfBase64,
              },
            ],
          }),
        }),
    });

    const resendResult = (await resendRequest.json()) as ResendResponse;

    if (!resendRequest.ok) {
      throw new ApiError(
        resendResult.message ?? "El proveedor de correo rechazó el envío.",
        502,
      );
    }

    const sentAt = new Date();

    await db
      .update(crmQuotes)
      .set({
        status: "Enviada",
        sentAt,
        updatedAt: sentAt,
      })
      .where(
        and(
          eq(crmQuotes.id, quoteId),

          eq(crmQuotes.tenantId, tenant.id),
        ),
      );

    return Response.json({
      success: true,

      data: {
        emailId: resendResult.id ?? null,

        recipient,

        status: "Enviada",

        sentAt: sentAt.toISOString(),
      },

      message: `Cotización enviada a ${recipient}.`,
    });
  } catch (error) {
    const status =
      error instanceof ApiError ||
      error instanceof CRMPermissionError ||
      error instanceof CommercialEmailLimitError
        ? error.status
        : 500;

    console.error("Error al enviar cotización:", error);

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "No fue posible enviar la cotización.",
      },
      {
        status,
      },
    );
  }
}
