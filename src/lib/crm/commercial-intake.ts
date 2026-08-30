import {
    and,
    desc,
    eq,
    sql,
} from "drizzle-orm";

import {
    db,
} from "@/db";

import {
    crmCustomers,
    crmDeals,
    crmLeads,
    crmQuoteItems,
    crmQuotes,
} from "@/db/schema";

type CommercialQuoteItemInput = {
    productId?:
        string | null;

    name: string;

    description?:
        string | null;

    quantity?:
        string;

    unitPrice: string;

    baseAmount: string;

    discountAmount?:
        string;

    taxRate?:
        string;

    taxAmount?:
        string;

    totalAmount: string;

    calculationSnapshot?:
        Record<
            string,
            unknown
        >;
};

type CreateCommercialQuoteInput = {
    tenantId: string;

    customerId:
        string | null;

    leadId:
        string | null;

    dealId: string;

    owner: {
        id: string;
        name: string | null;
        email: string | null;
    };

    subject: string;

    currency: string;

    baseAmount: string;

    discountAmount?:
        string;

    taxAmount?:
        string;

    adjustmentAmount?:
        string;

    totalAmount: string;

    status?:
        string;

    calculationSnapshot?:
        Record<
            string,
            unknown
        >;

    items:
        CommercialQuoteItemInput[];
};

function createCommercialQuoteNumber() {
    const date =
        new Date();

    const datePart = [
        date.getFullYear(),
        String(
            date.getMonth() + 1,
        ).padStart(
            2,
            "0",
        ),
        String(
            date.getDate(),
        ).padStart(
            2,
            "0",
        ),
    ].join("");

    const randomPart =
        crypto
            .randomUUID()
            .slice(
                0,
                6,
            )
            .toUpperCase();

    return `COT-${datePart}-${randomPart}`;
}

export async function createCommercialQuote({
    tenantId,
    customerId,
    leadId,
    dealId,
    owner,
    subject,
    currency,
    baseAmount,
    discountAmount = "0",
    taxAmount = "0",
    adjustmentAmount = "0",
    totalAmount,
    status = "Borrador",
    calculationSnapshot = {},
    items,
}: CreateCommercialQuoteInput) {
    const now =
        new Date();

    const quoteId =
        crypto.randomUUID();

    const [quote] =
        await db
            .insert(
                crmQuotes,
            )
            .values({
                id:
                    quoteId,

                tenantId,

                quoteNumber:
                    createCommercialQuoteNumber(),

                subject,

                status,

                customerId,

                sourceLeadId:
                    leadId,

                dealId,

                ownerClerkUserId:
                    owner.id,

                ownerName:
                    owner.name,

                ownerEmail:
                    owner.email,

                currency,

                baseAmount,

                discountAmount,

                taxAmount,

                adjustmentAmount,

                totalAmount,

                calculationSnapshot,

                createdAt:
                    now,

                updatedAt:
                    now,
            })
            .returning({
                id:
                    crmQuotes.id,
            });

    if (!quote) {
        throw new Error(
            "No fue posible crear la cotización.",
        );
    }

    if (
        items.length >
        0
    ) {
        await db
            .insert(
                crmQuoteItems,
            )
            .values(
                items.map(
                    (
                        item,
                        position,
                    ) => ({
                        id:
                            crypto.randomUUID(),

                        tenantId,

                        quoteId:
                            quote.id,

                        productId:
                            item.productId ??
                            null,

                        name:
                            item.name,

                        description:
                            item.description ??
                            null,

                        quantity:
                            item.quantity ??
                            "1",

                        unitPrice:
                            item.unitPrice,

                        baseAmount:
                            item.baseAmount,

                        discountAmount:
                            item.discountAmount ??
                            "0",

                        taxRate:
                            item.taxRate ??
                            "0",

                        taxAmount:
                            item.taxAmount ??
                            "0",

                        totalAmount:
                            item.totalAmount,

                        calculationSnapshot:
                            item.calculationSnapshot ??
                            {},

                        position,

                        updatedAt:
                            now,
                    }),
                ),
            );
    }

    return {
        id:
            quote.id,
    };
}

type ResolveCommercialContactInput = {
    tenantId: string;

    firstName: string;

    lastName:
        string | null;

    email: string;

    phone:
        string | null;

    company:
        string | null;

    source: string;

    owner: {
        id: string;
        name: string | null;
        email: string | null;
    };

    metadata?:
        Record<
            string,
            unknown
        >;
};

type ResolveCommercialContactResult = {
    customerId:
        string | null;

    leadId:
        string | null;

    createdLead:
        boolean;
};

export async function resolveCommercialContact({
    tenantId,
    firstName,
    lastName,
    email,
    phone,
    company,
    source,
    owner,
    metadata = {},
}: ResolveCommercialContactInput):
    Promise<ResolveCommercialContactResult> {
    const normalizedEmail =
        email
            .trim()
            .toLowerCase();

    const [existingCustomer] =
        await db
            .select({
                id:
                    crmCustomers.id,
            })
            .from(
                crmCustomers,
            )
            .where(
                and(
                    eq(
                        crmCustomers.tenantId,
                        tenantId,
                    ),

                    eq(
                        crmCustomers.email,
                        normalizedEmail,
                    ),
                ),
            )
            .limit(1);

    if (existingCustomer) {
        return {
            customerId:
                existingCustomer.id,

            leadId:
                null,

            createdLead:
                false,
        };
    }

    const [existingLead] =
        await db
            .select({
                id:
                    crmLeads.id,
            })
            .from(
                crmLeads,
            )
            .where(
                and(
                    eq(
                        crmLeads.tenantId,
                        tenantId,
                    ),

                    eq(
                        crmLeads.email,
                        normalizedEmail,
                    ),
                ),
            )
            .limit(1);

    if (existingLead) {
        return {
            customerId:
                null,

            leadId:
                existingLead.id,

            createdLead:
                false,
        };
    }

    const [createdLead] =
        await db
            .insert(
                crmLeads,
            )
            .values({
                tenantId,

                firstName,

                lastName,

                email:
                    normalizedEmail,

                phone,

                company,

                source,

                status:
                    "Nuevo",

                ownerClerkUserId:
                    owner.id,

                ownerName:
                    owner.name,

                ownerEmail:
                    owner.email,

                metadata,

                updatedAt:
                    new Date(),
            })
            .returning({
                id:
                    crmLeads.id,
            });

    if (!createdLead) {
        throw new Error(
            "No fue posible registrar al prospecto.",
        );
    }

    return {
        customerId:
            null,

        leadId:
            createdLead.id,

        createdLead:
            true,
    };
}

type CommercialOwner = {
    id: string;
    name: string | null;
    email: string | null;
};

type FindOrCreateOpenDealInput = {
    tenantId: string;

    customerId:
    string | null;

    leadId:
    string | null;

    name: string;

    acquisitionChannel:
    string;

    owner:
    CommercialOwner;

    currency: string;

    baseAmount: string;

    totalAmount: string;

    nextStep:
    string | null;

    metadata?:
    Record<
        string,
        unknown
    >;

    operationType?:
    string;

    stage?:
    string;

    status?:
    string;
};

type FindOrCreateOpenDealResult = {
    id: string;
    reused: boolean;
};

type ConvertCommercialLeadToCustomerInput = {
    tenantId: string;
    leadId: string;
};

type ConvertCommercialLeadToCustomerResult = {
    customerId: string;
    reused: boolean;
};

export async function convertCommercialLeadToCustomer({
    tenantId,
    leadId,
}: ConvertCommercialLeadToCustomerInput): Promise<ConvertCommercialLeadToCustomerResult> {
    const [lead] =
        await db
            .select()
            .from(
                crmLeads,
            )
            .where(
                and(
                    eq(
                        crmLeads.tenantId,
                        tenantId,
                    ),
                    eq(
                        crmLeads.id,
                        leadId,
                    ),
                ),
            )
            .limit(1);

    if (!lead) {
        throw new Error(
            "No fue posible encontrar el prospecto comercial.",
        );
    }

    const [existingCustomer] =
        await db
            .select({
                id:
                    crmCustomers.id,
            })
            .from(
                crmCustomers,
            )
            .where(
                and(
                    eq(
                        crmCustomers.tenantId,
                        tenantId,
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
            .update(
                crmLeads,
            )
            .set({
                status:
                    "Convertido",

                updatedAt:
                    new Date(),
            })
            .where(
                and(
                    eq(
                        crmLeads.tenantId,
                        tenantId,
                    ),
                    eq(
                        crmLeads.id,
                        lead.id,
                    ),
                ),
            );

        return {
            customerId:
                existingCustomer.id,

            reused:
                true,
        };
    }

    const normalizedEmail =
        lead.email
            ?.trim()
            .toLowerCase() ??
        null;

    if (normalizedEmail) {
        const [customerByEmail] =
            await db
                .select({
                    id:
                        crmCustomers.id,
                })
                .from(
                    crmCustomers,
                )
                .where(
                    and(
                        eq(
                            crmCustomers.tenantId,
                            tenantId,
                        ),
                        sql<boolean>`
                            lower(
                                trim(
                                    coalesce(
                                        ${crmCustomers.email},
                                        ''
                                    )
                                )
                            ) = ${normalizedEmail}
                        `,
                    ),
                )
                .limit(1);

        if (customerByEmail) {
            await db
                .update(
                    crmLeads,
                )
                .set({
                    status:
                        "Convertido",

                    updatedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            crmLeads.tenantId,
                            tenantId,
                        ),
                        eq(
                            crmLeads.id,
                            lead.id,
                        ),
                    ),
                );

            return {
                customerId:
                    customerByEmail.id,

                reused:
                    true,
            };
        }
    }

    const phoneNumbers =
        Array.from(
            new Set(
                [
                    lead.phone,
                    lead.mobile,
                ]
                    .map(
                        (
                            value,
                        ) =>
                            value
                                ?.replace(
                                    /[^0-9]/g,
                                    "",
                                ) ??
                            "",
                    )
                    .filter(
                        Boolean,
                    ),
            ),
        );

    for (
        const phoneNumber of
        phoneNumbers
    ) {
        const [customerByPhone] =
            await db
                .select({
                    id:
                        crmCustomers.id,
                })
                .from(
                    crmCustomers,
                )
                .where(
                    and(
                        eq(
                            crmCustomers.tenantId,
                            tenantId,
                        ),
                        sql<boolean>`
                            (
                                regexp_replace(
                                    coalesce(
                                        ${crmCustomers.phone},
                                        ''
                                    ),
                                    '[^0-9]',
                                    '',
                                    'g'
                                ) = ${phoneNumber}
                                OR
                                regexp_replace(
                                    coalesce(
                                        ${crmCustomers.mobile},
                                        ''
                                    ),
                                    '[^0-9]',
                                    '',
                                    'g'
                                ) = ${phoneNumber}
                            )
                        `,
                    ),
                )
                .limit(1);

        if (customerByPhone) {
            await db
                .update(
                    crmLeads,
                )
                .set({
                    status:
                        "Convertido",

                    updatedAt:
                        new Date(),
                })
                .where(
                    and(
                        eq(
                            crmLeads.tenantId,
                            tenantId,
                        ),
                        eq(
                            crmLeads.id,
                            lead.id,
                        ),
                    ),
                );

            return {
                customerId:
                    customerByPhone.id,

                reused:
                    true,
            };
        }
    }

    const now =
        new Date();

    const [customer] =
        await db
            .insert(
                crmCustomers,
            )
            .values({
                tenantId,

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
            "No fue posible crear el cliente comercial.",
        );
    }

    await db
        .update(
            crmLeads,
        )
        .set({
            status:
                "Convertido",

            updatedAt:
                now,
        })
        .where(
            and(
                eq(
                    crmLeads.tenantId,
                    tenantId,
                ),
                eq(
                    crmLeads.id,
                    lead.id,
                ),
            ),
        );

    return {
        customerId:
            customer.id,

        reused:
            false,
    };
}

export async function findOrCreateOpenCommercialDeal({
    tenantId,
    customerId,
    leadId,
    name,
    acquisitionChannel,
    owner,
    currency,
    baseAmount,
    totalAmount,
    nextStep,
    metadata = {},
    operationType =
    "unspecified",
    stage =
    "Nueva",
    status =
    "Abierta",
}: FindOrCreateOpenDealInput):
    Promise<FindOrCreateOpenDealResult> {
    const now =
        new Date();

    const [existingDeal] =
        customerId
            ? await db
                .select({
                    id:
                        crmDeals.id,
                })
                .from(
                    crmDeals,
                )
                .where(
                    and(
                        eq(
                            crmDeals.tenantId,
                            tenantId,
                        ),

                        eq(
                            crmDeals.customerId,
                            customerId,
                        ),

                        eq(
                            crmDeals.acquisitionChannel,
                            acquisitionChannel,
                        ),

                        eq(
                            crmDeals.status,
                            status,
                        ),
                    ),
                )
                .orderBy(
                    desc(
                        crmDeals.createdAt,
                    ),
                )
                .limit(1)
            : leadId
                ? await db
                    .select({
                        id:
                            crmDeals.id,
                    })
                    .from(
                        crmDeals,
                    )
                    .where(
                        and(
                            eq(
                                crmDeals.tenantId,
                                tenantId,
                            ),

                            eq(
                                crmDeals.sourceLeadId,
                                leadId,
                            ),

                            eq(
                                crmDeals.acquisitionChannel,
                                acquisitionChannel,
                            ),

                            eq(
                                crmDeals.status,
                                status,
                            ),
                        ),
                    )
                    .orderBy(
                        desc(
                            crmDeals.createdAt,
                        ),
                    )
                    .limit(1)
                : [];

    if (existingDeal) {
        await db
            .update(
                crmDeals,
            )
            .set({
                name,

                customerId,

                sourceLeadId:
                    leadId,

                operationType,

                currency,

                baseAmount,

                totalAmount,

                nextStep,

                metadata,

                updatedAt:
                    now,
            })
            .where(
                eq(
                    crmDeals.id,
                    existingDeal.id,
                ),
            );

        return {
            id:
                existingDeal.id,

            reused:
                true,
        };
    }

    const [createdDeal] =
        await db
            .insert(
                crmDeals,
            )
            .values({
                tenantId,

                name,

                customerId,

                sourceLeadId:
                    leadId,

                operationType,

                ownerClerkUserId:
                    owner.id,

                ownerName:
                    owner.name,

                ownerEmail:
                    owner.email,

                stage,

                status,

                acquisitionChannel,

                currency,

                baseAmount,

                totalAmount,

                nextStep,

                metadata,

                createdAt:
                    now,

                updatedAt:
                    now,
            })
            .returning({
                id:
                    crmDeals.id,
            });

    if (!createdDeal) {
        throw new Error(
            "No fue posible crear la oportunidad comercial.",
        );
    }

    return {
        id:
            createdDeal.id,

        reused:
            false,
    };
}