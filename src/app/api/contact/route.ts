import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
  crmLeads,
  tenants,
} from "@/db/schema";

type ContactRequest = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  product?: string;
  message?: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

type CloudflareEnv = {
  RESEND_API_KEY?: string;
  DATARA_INTERNAL_ORGANIZATION_ID?: string;
};

function jsonResponse(data: unknown, status: number): Response {
  return Response.json(data, {
    status,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ContactRequest;

    const name = body.name?.trim() ?? "";
    const company = body.company?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const product = body.product?.trim() ?? "Datara";
    const message = body.message?.trim() ?? "";

    if (!name || !email) {
      return jsonResponse(
        {
          success: false,
          message: "El nombre y el correo son obligatorios.",
        },
        400,
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return jsonResponse(
        {
          success: false,
          message: "Ingresa un correo electrónico válido.",
        },
        400,
      );
    }

    const cloudflareContext = getCloudflareContext();
    const env = cloudflareContext.env as CloudflareEnv;

    const resendApiKey = env.RESEND_API_KEY;

    const dataraOrganizationId =
      env.DATARA_INTERNAL_ORGANIZATION_ID;

    if (!dataraOrganizationId) {
      console.error(
        "DATARA_INTERNAL_ORGANIZATION_ID no está configurada.",
      );

      return jsonResponse(
        {
          success: false,
          message:
            "La configuración interna de Datara no está disponible.",
        },
        500,
      );
    }

    const [dataraTenant] = await db
      .select({
        id: tenants.id,
      })
      .from(tenants)
      .where(
        eq(
          tenants.clerkOrganizationId,
          dataraOrganizationId,
        ),
      )
      .limit(1);

    if (!dataraTenant) {
      console.error(
        "No se encontró el tenant interno de Datara.",
      );

      return jsonResponse(
        {
          success: false,
          message:
            "La configuración interna de Datara no es válida.",
        },
        500,
      );
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY no está configurada.");

      return jsonResponse(
        {
          success: false,
          message: "El servicio de correo no está configurado.",
        },
        500,
      );
    }

    const now = new Date();

    const [lead] = await db
      .insert(crmLeads)
      .values({
        tenantId: dataraTenant.id,
        branchId: null,
        firstName: name,
        lastName: null,
        email,
        phone: phone || null,
        mobile: null,
        company: company || null,
        source: "Website",
        status: "Nuevo",
        productId: null,
        ownerClerkUserId: null,
        ownerName: null,
        ownerEmail: null,
        commercialConsent: false,
        notes:
          [
            `Producto de interés: ${product}`,
            message
              ? `Mensaje: ${message}`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n") || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: crmLeads.id,
      });

    if (!lead) {
      console.error(
        "No fue posible crear el prospecto en el CRM interno de Datara.",
      );

      return jsonResponse(
        {
          success: false,
          message:
            "No fue posible registrar tu solicitud. Inténtalo nuevamente.",
        },
        500,
      );
    }

    const safeName = escapeHtml(name);
    const safeCompany = escapeHtml(company || "No especificada");
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || "No especificado");
    const safeProduct = escapeHtml(product);
    const safeMessage = escapeHtml(
      message || "Sin mensaje adicional",
    ).replaceAll("\n", "<br />");

    const resendRequest = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Datara Website <web@mail.datara-lab.com>",
        to: ["ventas@datara-lab.com"],
        reply_to: email,
        subject: `Nueva solicitud de demo: ${product}`,
        html: `
          <div style="background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 12px;color:#2563eb;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                Nueva solicitud de demostración
              </p>

              <h1 style="margin:0 0 28px;font-size:28px;line-height:1.2;">
                Un nuevo prospecto quiere conocer ${safeProduct}
              </h1>

              <table style="width:100%;border-collapse:collapse;font-size:15px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:700;width:160px;">
                    Nombre
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                    ${safeName}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:700;">
                    Empresa
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                    ${safeCompany}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:700;">
                    Correo
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                    <a href="mailto:${safeEmail}" style="color:#2563eb;">
                      ${safeEmail}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:700;">
                    Teléfono
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                    ${safePhone}
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:700;">
                    Producto
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                    ${safeProduct}
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px;">
                <p style="margin:0 0 10px;font-weight:700;">
                  Mensaje
                </p>

                <div style="padding:18px;border-radius:14px;background:#f1f5f9;line-height:1.7;">
                  ${safeMessage}
                </div>
              </div>

              <p style="margin:28px 0 0;color:#64748b;font-size:13px;">
                Solicitud enviada desde datara-lab.com
              </p>
            </div>
          </div>
        `,
      }),
    });

    const resendData = (await resendRequest.json()) as ResendResponse;

    if (!resendRequest.ok) {
      console.error("Error de Resend:", resendData);

      return jsonResponse(
        {
          success: false,
          message:
            resendData.message ??
            "No fue posible enviar la solicitud. Inténtalo nuevamente.",
        },
        502,
      );
    }

    return jsonResponse(
      {
        success: true,
        message:
          "¡Gracias! Recibimos tu solicitud y pronto nos pondremos en contacto.",
        emailId: resendData.id,
      },
      200,
    );
  } catch (error) {
    console.error("Error en /api/contact:", error);

    return jsonResponse(
      {
        success: false,
        message:
          "Ocurrió un error inesperado al enviar la solicitud. Inténtalo nuevamente.",
      },
      500,
    );
  }
}

export function GET(): Response {
  return jsonResponse(
    {
      success: false,
      message: "Método no permitido.",
    },
    405,
  );
}