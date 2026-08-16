import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    eq,
    isNotNull,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import { db } from "@/db";

import {
    getDataraProduct,
    getDataraProductLogoUrl,
    isDataraProductKey,
} from "@/config/datara-products";

import type {
    DataraProductKey,
} from "@/config/datara-products";

import {
    subscriptions,
    tenants,
    trialRedemptions,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

type ReminderEnvironment = {
    CRON_SECRET?: string;
    RESEND_API_KEY?: string;
};

type ReminderType =
    | "day12"
    | "day14";

const DAY_IN_MILLISECONDS =
    24 * 60 * 60 * 1000;

function escapeHtml(
    value: string,
): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll(
            "'",
            "&#039;",
        );
}

function getEnvironment():
    ReminderEnvironment {
    const {
        env,
    } = getCloudflareContext();

    return env as
        ReminderEnvironment;
}

async function sendReminderEmail(
    resendApiKey: string,
    recipient: string,
    companyName: string,
    reminderType: ReminderType,
    trialEndsAt: Date,
    product:
        DataraProductKey =
        "crm",
) {
    const productConfig =
        getDataraProduct(
            product,
        );

    const productLogoUrl =
        getDataraProductLogoUrl(
            product,
        );

    const safeCompanyName =
        escapeHtml(companyName);

    const safeProductName =
        escapeHtml(
            productConfig.name,
        );

    const safeProductLogoUrl =
        escapeHtml(
            productLogoUrl,
        );

    const safePurchaseHref =
        escapeHtml(
            productConfig
                .purchaseHref,
        );

    const safeAccentColor =
        escapeHtml(
            productConfig
                .accentColor,
        );

    const formattedEndDate =
        trialEndsAt
            .toLocaleDateString(
                "es-MX",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone:
                        "America/Mexico_City",
                },
            );

    const isExpirationReminder =
        reminderType === "day14";

    const subject =
        isExpirationReminder
            ? `Tu demo de ${productConfig.name} termina hoy`
            : `Tu demo de ${productConfig.name} termina en 2 días`;

    const title =
        isExpirationReminder
            ? "Tu demo termina hoy"
            : "Te quedan 2 días de demo";

    const message =
        isExpirationReminder
            ? `Tu acceso de prueba a ${safeProductName} está por finalizar. Contrata un plan para conservar el acceso y continuar trabajando sin interrupciones.`
            : `Esperamos que estés aprovechando ${safeProductName}. Tu acceso completo de prueba terminará pronto; puedes contratar un plan antes de la fecha de vencimiento.`;

    const response =
        await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${resendApiKey}`,

                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    from:
                        "Datara Lab <web@mail.datara-lab.com>",

                    to: [
                        recipient,
                    ],

                    reply_to:
                        "ventas@datara-lab.com",

                    subject,

                    html: `
                        <!doctype html>
                        <html lang="es">
                            <head>
                                <meta
                                    name="viewport"
                                    content="width=device-width, initial-scale=1"
                                />
                            </head>

                            <body style="margin:0;padding:0;background:#eef4fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                                <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
                                    ${subject}. Tu acceso completo termina el ${formattedEndDate}.
                                </div>

                                <table
                                    role="presentation"
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="width:100%;background:#eef4fb;"
                                >
                                    <tr>
                                        <td
                                            align="center"
                                            style="padding:36px 16px;"
                                        >
                                            <table
                                                role="presentation"
                                                width="640"
                                                cellpadding="0"
                                                cellspacing="0"
                                                style="width:100%;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:28px;background:#ffffff;box-shadow:0 18px 50px rgba(15,23,42,0.10);"
                                            >
                                                <tr>
                                                    <td style="padding:28px 32px;background:#071329;">
                                                        <table
                                                            role="presentation"
                                                            width="100%"
                                                            cellpadding="0"
                                                            cellspacing="0"
                                                        >
                                                            <tr>
                                                                <td>
                                                                    <table
                                                                        role="presentation"
                                                                        cellpadding="0"
                                                                        cellspacing="0"
                                                                        style="border-radius:16px;background:#ffffff;"
                                                                    >
                                                                        <tr>
                                                                            <td style="padding:10px 16px;">
                                                                                <img
                                                                                    src="${safeProductLogoUrl}"
                                                                                    width="150"
                                                                                    alt="${safeProductName}"
                                                                                    style="display:block;width:150px;max-width:100%;height:auto;object-fit:contain;border:0;"
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>

                                                            </tr>
                                                        </table>

                                                        <p style="margin:34px 0 8px;color:#22d3ee;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">
                                                            Estado de tu prueba
                                                        </p>

                                                        <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;line-height:1.15;">
                                                            ${title}
                                                        </h1>

                                                        <p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.6;">
                                                            Tu espacio de trabajo sigue disponible con todas las funciones incluidas en el demo.
                                                        </p>
                                                    </td>
                                                </tr>

                                                <tr>
                                                    <td style="padding:34px 32px;">
                                                        <p style="margin:0 0 18px;color:#0f172a;font-size:17px;line-height:1.7;">
                                                            Hola, equipo de
                                                            <strong>${safeCompanyName}</strong>.
                                                        </p>

                                                        <p style="margin:0;color:#475569;font-size:16px;line-height:1.75;">
                                                            ${message}
                                                        </p>

                                                        <table
                                                            role="presentation"
                                                            width="100%"
                                                            cellpadding="0"
                                                            cellspacing="0"
                                                            style="margin:26px 0;border:1px solid #bfdbfe;border-radius:18px;background:#eff6ff;"
                                                        >
                                                            <tr>
                                                                <td style="padding:20px 22px;">
                                                                    <p style="margin:0;color:#1d4ed8;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
                                                                        Fecha de término
                                                                    </p>

                                                                    <p style="margin:7px 0 0;color:#0f172a;font-size:20px;font-weight:800;">
                                                                        ${formattedEndDate}
                                                                    </p>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                        <table
                                                            role="presentation"
                                                            cellpadding="0"
                                                            cellspacing="0"
                                                        >
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    style="border-radius:13px;background:${safeAccentColor};"
                                                                >
                                                                    <a
                                                                        href="${safePurchaseHref}"
                                                                        style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;"
                                                                    >
                                                                        Contratar ${safeProductName}
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>

                                                        <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:1.7;">
                                                            Si ya contrataste un plan, puedes ignorar este mensaje. Si necesitas ayuda, responde este correo y nuestro equipo te atenderá.
                                                        </p>
                                                    </td>
                                                </tr>

                                                <tr>
                                                    <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:22px 32px;">
                                                        <p style="margin:0;color:#334155;font-size:12px;font-weight:700;">
                                                            Datara Lab · Tecnología para empresas
                                                        </p>

                                                        <p style="margin:7px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                                                            <a
                                                                href="https://datara-lab.com"
                                                                style="color:#2563eb;text-decoration:none;"
                                                            >
                                                                datara-lab.com
                                                            </a>
                                                            &nbsp;·&nbsp;
                                                            <a
                                                                href="mailto:ventas@datara-lab.com"
                                                                style="color:#2563eb;text-decoration:none;"
                                                            >
                                                                ventas@datara-lab.com
                                                            </a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </body>
                        </html>
                    `,
                }),
            },
        );

    if (!response.ok) {
        const responseBody =
            await response.text();

        throw new Error(
            `Resend respondió ${response.status}: ${responseBody}`,
        );
    }
}

export async function POST(
    request: Request,
) {
    const environment =
        getEnvironment();

    const cronSecret =
        environment.CRON_SECRET ??
        process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "CRON_SECRET no está configurado.",
            },
            {
                status: 500,
            },
        );
    }

    const providedCronSecret =
        request.headers.get(
            "X-Cron-Secret",
        );

    if (
        providedCronSecret !==
        cronSecret
    ) {
        return NextResponse.json(
            {
                success: false,
                error: "No autorizado.",
            },
            {
                status: 401,
            },
        );
    }

    const resendApiKey =
        environment.RESEND_API_KEY ??
        process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "RESEND_API_KEY no está configurado.",
            },
            {
                status: 500,
            },
        );
    }

    const previewEmail =
        request.headers
            .get(
                "X-Preview-Email",
            )
            ?.trim()
            .toLowerCase();

    const previewReminderType =
        request.headers.get(
            "X-Preview-Reminder-Type",
        );

    const requestedPreviewProduct =
        request.headers.get(
            "X-Preview-Product",
        ) ?? "crm";

    if (
        previewEmail &&
        !isDataraProductKey(
            requestedPreviewProduct,
        )
    ) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "El producto de vista previa no es válido.",
            },
            {
                status: 400,
            },
        );
    }

    const previewProduct:
        DataraProductKey =
        isDataraProductKey(
            requestedPreviewProduct,
        )
            ? requestedPreviewProduct
            : "crm";

    if (previewEmail) {
        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                previewEmail,
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "El correo de vista previa no es válido.",
                },
                {
                    status: 400,
                },
            );
        }

        if (
            previewReminderType !==
                "day12" &&
            previewReminderType !==
                "day14"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "La vista previa debe indicar day12 o day14.",
                },
                {
                    status: 400,
                },
            );
        }

        const previewEndsAt =
            new Date(
                Date.now() +
                    (
                        previewReminderType ===
                        "day12"
                            ? 2
                            : 0
                    ) *
                        DAY_IN_MILLISECONDS,
            );

        await sendReminderEmail(
            resendApiKey,
            previewEmail,
            "Datara Lab",
            previewReminderType,
            previewEndsAt,
            previewProduct,
        );

        return NextResponse.json({
            success: true,

            data: {
                preview: true,
                recipient:
                    previewEmail,

                reminderType:
                    previewReminderType,
            },
        });
    }

    const now = new Date();

    const trials =
        await db
            .select({
                id:
                    trialRedemptions.id,

                tenantId:
                    trialRedemptions
                        .tenantId,

                companyName:
                    tenants.name,

                ownerEmail:
                    trialRedemptions
                        .ownerEmail,

                trialStartsAt:
                    trialRedemptions
                        .trialStartsAt,

                trialEndsAt:
                    trialRedemptions
                        .trialEndsAt,

                day12ReminderSentAt:
                    trialRedemptions
                        .day12ReminderSentAt,

                day14ReminderSentAt:
                    trialRedemptions
                        .day14ReminderSentAt,
            })
            .from(trialRedemptions)
            .innerJoin(
                tenants,
                eq(
                    trialRedemptions.tenantId,
                    tenants.id,
                ),
            )
            .where(
                and(
                    eq(
                        trialRedemptions.status,
                        "active",
                    ),
                    isNotNull(
                        trialRedemptions
                            .ownerEmail,
                    ),
                ),
            );

    let day12Sent = 0;
    let day14Sent = 0;
    let expired = 0;
    let failed = 0;

    for (const trial of trials) {
        if (!trial.ownerEmail) {
            continue;
        }

        const remainingTime =
            trial.trialEndsAt
                .getTime() -
            now.getTime();

        if (
            remainingTime <=
            0
        ) {
            if (!trial.tenantId) {
                failed += 1;
                continue;
            }

            try {
                await db
                    .update(
                        subscriptions,
                    )
                    .set({
                        status:
                            "canceled",

                        updatedAt:
                            now,
                    })
                    .where(
                        and(
                            eq(
                                subscriptions
                                    .tenantId,
                                trial.tenantId,
                            ),
                            eq(
                                subscriptions
                                    .provider,
                                "datara",
                            ),
                            eq(
                                subscriptions
                                    .providerSubscriptionId,
                                `trial:${trial.tenantId}`,
                            ),
                        ),
                    );

                await db
                    .update(
                        trialRedemptions,
                    )
                    .set({
                        status:
                            "expired",

                        updatedAt:
                            now,
                    })
                    .where(
                        eq(
                            trialRedemptions.id,
                            trial.id,
                        ),
                    );

                expired += 1;
            } catch (error) {
                failed += 1;

                console.error(
                    `No fue posible cerrar el demo ${trial.id}:`,
                    error,
                );
            }

            continue;
        }

        let reminderType:
            ReminderType | null =
            null;

        if (
            remainingTime <=
                DAY_IN_MILLISECONDS &&
            remainingTime >
                0 &&
            !trial.day14ReminderSentAt
        ) {
            reminderType =
                "day14";
        } else if (
            remainingTime <=
            2 *
            DAY_IN_MILLISECONDS &&
            remainingTime >
            DAY_IN_MILLISECONDS &&
            !trial.day12ReminderSentAt
        ) {
            reminderType =
                "day12";
        }

        if (!reminderType) {
            continue;
        }

        try {
            await sendReminderEmail(
                resendApiKey,
                trial.ownerEmail,
                trial.companyName,
                reminderType,
                trial.trialEndsAt,
            );

            if (
                reminderType ===
                "day14"
            ) {
                await db
                    .update(
                        trialRedemptions,
                    )
                    .set({
                        day14ReminderSentAt:
                            now,

                        updatedAt:
                            now,
                    })
                    .where(
                        eq(
                            trialRedemptions.id,
                            trial.id,
                        ),
                    );

                day14Sent += 1;
            } else {
                await db
                    .update(
                        trialRedemptions,
                    )
                    .set({
                        day12ReminderSentAt:
                            now,

                        updatedAt:
                            now,
                    })
                    .where(
                        eq(
                            trialRedemptions.id,
                            trial.id,
                        ),
                    );

                day12Sent += 1;
            }
        } catch (error) {
            failed += 1;

            console.error(
                `No fue posible enviar el recordatorio ${reminderType} del demo ${trial.id}:`,
                error,
            );
        }
    }

    const responseBody =
        JSON.stringify({
            success: true,

            data: {
                evaluated:
                    trials.length,

                day12Sent,
                day14Sent,
                expired,
                failed,

                executedAt:
                    now.toISOString(),
            },
        });

    return new Response(
        responseBody,
        {
            status: 200,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Content-Length":
                    String(
                        new TextEncoder()
                            .encode(
                                responseBody,
                            )
                            .byteLength,
                    ),
            },
        },
    );
}