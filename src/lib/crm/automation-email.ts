import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    and,
    eq,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmCustomers,
    crmLeads,
    tenants,
    type CRMAutomationAction,
    type CRMAutomationEntityType,
} from "@/db/schema";

type AutomationRecord =
    Record<string, unknown>;

type EmailAction =
    Extract<
        CRMAutomationAction,
        {
            type:
            "send_email";
        }
    >;

type SendAutomationEmailInput = {
    tenantId: string;

    entityType:
    CRMAutomationEntityType;

    record:
    AutomationRecord;

    action:
    EmailAction;
};

type EmailEnvironment = {
    RESEND_API_KEY?: string;
};

function getText(
    value: unknown,
): string | null {
    return typeof value ===
        "string" &&
        value.trim()
        ? value.trim()
        : null;
}

function getRecordValue(
    record:
        AutomationRecord,
    fieldPath: string,
): unknown {
    return fieldPath
        .split(".")
        .reduce<unknown>(
            (
                currentValue,
                field,
            ) => {
                if (
                    typeof currentValue !==
                    "object" ||
                    currentValue ===
                    null ||
                    Array.isArray(
                        currentValue,
                    )
                ) {
                    return undefined;
                }

                return (
                    currentValue as
                    AutomationRecord
                )[field];
            },
            record,
        );
}

function renderTemplate(
    template: string,
    record:
        AutomationRecord,
): string {
    return template.replace(
        /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g,
        (
            _match,
            fieldPath: string,
        ) => {
            const value =
                getRecordValue(
                    record,
                    fieldPath,
                );

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            return typeof value ===
                "object"
                ? JSON.stringify(value)
                : String(value);
        },
    );
}

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

async function getRelatedCustomerEmail(
    tenantId: string,
    entityType:
        CRMAutomationEntityType,
    record:
        AutomationRecord,
): Promise<string | null> {
    if (
        entityType === "lead" ||
        entityType === "customer"
    ) {
        return getText(
            record.email,
        );
    }

    const customerId =
        getText(
            record.customerId,
        );

    if (customerId) {
        const [customer] =
            await db
                .select({
                    email:
                        crmCustomers.email,
                })
                .from(
                    crmCustomers,
                )
                .where(
                    and(
                        eq(
                            crmCustomers.id,
                            customerId,
                        ),

                        eq(
                            crmCustomers
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .limit(1);

        if (customer?.email) {
            return customer.email;
        }
    }

    const leadId =
        getText(
            record.leadId ??
            record.sourceLeadId,
        );

    if (leadId) {
        const [lead] =
            await db
                .select({
                    email:
                        crmLeads.email,
                })
                .from(crmLeads)
                .where(
                    and(
                        eq(
                            crmLeads.id,
                            leadId,
                        ),

                        eq(
                            crmLeads
                                .tenantId,
                            tenantId,
                        ),
                    ),
                )
                .limit(1);

        return lead?.email ??
            null;
    }

    return null;
}

async function resolveRecipient(
    input:
        SendAutomationEmailInput,
): Promise<string> {
    const {
        tenantId,
        entityType,
        record,
        action,
    } = input;

    const recipient =
        action.recipientSource ===
            "fixed"
            ? action.recipientEmail
            : action.recipientSource ===
                "owner"
                ? getText(
                    record.ownerEmail,
                )
                : action.recipientSource ===
                    "record"
                    ? getText(
                        record.email ??
                        record.customerEmail,
                    )
                    : await getRelatedCustomerEmail(
                        tenantId,
                        entityType,
                        record,
                    );

    if (!recipient) {
        throw new Error(
            "No fue posible determinar el correo destinatario.",
        );
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            recipient,
        )
    ) {
        throw new Error(
            "El correo destinatario no es válido.",
        );
    }

    return recipient.toLowerCase();
}

function getEnvironment():
    EmailEnvironment {
    try {
        const {
            env,
        } =
            getCloudflareContext();

        return env as
            EmailEnvironment;
    } catch {
        return {};
    }
}

export async function sendAutomationEmail(
    input:
        SendAutomationEmailInput,
): Promise<string> {
    const [tenant] =
        await db
            .select({
                name:
                    tenants.name,

                metadata:
                    tenants.metadata,
            })
            .from(tenants)
            .where(
                eq(
                    tenants.id,
                    input.tenantId,
                ),
            )
            .limit(1);

    if (!tenant) {
        throw new Error(
            "La empresa ya no existe.",
        );
    }

    const companyEmail =
        typeof tenant.metadata
            ?.email ===
            "string" &&
        tenant.metadata.email
            .trim()
            ? tenant.metadata.email
                .trim()
                .toLowerCase()
            : null;

    const replyTo =
        input.action.replyTo ??
        companyEmail;

    const recipient =
        await resolveRecipient(
            input,
        );

    const environment =
        getEnvironment();

    const resendApiKey =
        environment
            .RESEND_API_KEY ??
        process.env
            .RESEND_API_KEY;

    if (!resendApiKey) {
        throw new Error(
            "RESEND_API_KEY no está configurado.",
        );
    }

    const subject =
        renderTemplate(
            input.action.subject,
            input.record,
        ).trim();

    const message =
        renderTemplate(
            input.action.message,
            input.record,
        ).trim();

    if (!subject || !message) {
        throw new Error(
            "El asunto y el mensaje del correo son obligatorios.",
        );
    }

    const response =
        await fetch(
            "https://api.resend.com/emails",
            {
                method:
                    "POST",

                headers: {
                    Authorization:
                        `Bearer ${resendApiKey}`,

                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify({
                        from:
                            `${tenant.name} <web@mail.datara-lab.com>`,

                        to: [
                            recipient,
                        ],

                        ...(replyTo
                            ? {
                                reply_to:
                                    replyTo,
                            }
                            : {}),

                        subject,

                        text:
                            message,

                        html:
                            `
<div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
  <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#ffffff">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:#ffffff">
      <div style="font-size:22px;font-weight:800">
        ${escapeHtml(
            tenant.name,
        )}
      </div>
    </div>

    <div style="padding:30px 28px;font-size:16px;line-height:1.7">
      ${escapeHtml(
          message,
      ).replaceAll(
          "\n",
          "<br>",
      )}
    </div>

    <div style="border-top:1px solid #e2e8f0;padding:18px 28px;font-size:12px;line-height:1.5;color:#64748b">
      Enviado por ${escapeHtml(
          tenant.name,
      )} mediante Datara.
      ${
          replyTo
              ? `<br>Responde este mensaje para contactar a ${escapeHtml(
                    tenant.name,
                )}.`
              : ""
      }
    </div>
  </div>
</div>
                            `.trim(),
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

    return `Correo enviado a ${recipient}.`;
}