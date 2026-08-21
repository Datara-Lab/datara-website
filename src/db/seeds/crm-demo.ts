import {
    and,
    eq,
} from "drizzle-orm";

import { db } from "@/db";

import {
    crmActivities,
    crmActivityParticipants,
    crmCustomers,
    crmDealItems,
    crmDeals,
    crmDocumentRelations,
    crmDocuments,
    crmLeads,
    crmProducts,
  crmProductTypes,
    crmPromotionProducts,
    crmPromotions,
    crmQuoteItems,
    crmQuotePromotions,
    crmQuotes,
    crmSalesOrderItems,
    crmSalesOrders,
    crmServiceOrderItems,
    crmServiceOrders,
  tenantBranches,
    tenants,
} from "@/db/schema";

const DEMO_USER_ID =
    "demo-platform-user";

const DEMO_USER_NAME =
    "Equipo Comercial Demo";

const DEMO_USER_EMAIL =
    "demo@datara-lab.com";

export async function seedCRMDemo(
    tenantId: string,
) {
    const now = new Date();

    const [tenant] =
        await db
            .select({
                id: tenants.id,
                name: tenants.name,
            })
            .from(tenants)
            .where(
                eq(
                    tenants.id,
                    tenantId,
                ),
            )
            .limit(1);

    if (!tenant) {
        throw new Error(
            "El tenant de demo no existe.",
        );
    }

    /*
     * ============================================================
     * SUCURSALES
     * ============================================================
     */

    const branches =
        await db
            .insert(tenantBranches)
            .values([
                {
                    tenantId,
                    name: "Sucursal Centro",
                    code: "CENTRO",
                    active: true,
                },
                {
                    tenantId,
                    name: "Sucursal Norte",
                    code: "NORTE",
                    active: true,
                },
            ])
            .onConflictDoUpdate({
                target: [
                    tenantBranches.tenantId,
                    tenantBranches.code,
                ],
                set: {
                    active: true,
                    updatedAt: now,
                },
            })
            .returning({
                id: tenantBranches.id,
                name: tenantBranches.name,
            });

    if (
        branches.length !== 2
    ) {
        throw new Error(
            "No fue posible preparar las sucursales del demo.",
        );
    }

  /*
   * ============================================================
   * PRODUCTOS
   * ============================================================
   */

  const productTypes =
      await db
          .select({
              id:
                  crmProductTypes.id,
              key:
                  crmProductTypes.key,
          })
          .from(
              crmProductTypes,
          )
          .where(
              and(
                  eq(
                      crmProductTypes
                          .tenantId,
                      tenantId,
                  ),
                  eq(
                      crmProductTypes
                          .active,
                      true,
                  ),
              ),
          );

  const productTypesByKey =
      new Map(
          productTypes.map(
              (productType) => [
                  productType.key,
                  productType.id,
              ],
          ),
      );

  const modelTypeId =
      productTypesByKey.get(
          "model",
      );

  const physicalProductTypeId =
      productTypesByKey.get(
          "product",
      );

  const serviceTypeId =
      productTypesByKey.get(
          "service",
      );

  if (
      !modelTypeId ||
      !physicalProductTypeId ||
      !serviceTypeId
  ) {
      throw new Error(
          "El catálogo del demo no tiene activos los tipos Modelo, Producto y Servicio.",
      );
  }

  const products =
      await db
          .insert(crmProducts)
          .values([
              {
                  tenantId,
                  productTypeId:
                      modelTypeId,
                  itemType:
                      "model",
                  name:
                      "Moto Demo Premium",
                  code:
                      "DEMO-MOTO-PREMIUM",
                  description:
                      "Motocicleta demo de gama premium.",
                  category:
                      "Touring",
                  unitPrice:
                      "185000.00",
                  currency:
                      "mxn",
                  active:
                      true,
              },
              {
                  tenantId,
                  productTypeId:
                      modelTypeId,
                  itemType:
                      "model",
                  name:
                      "Moto Demo Urbana",
                  code:
                      "DEMO-MOTO-URBANA",
                  description:
                      "Motocicleta demo para uso urbano.",
                  category:
                      "Motocicleta urbana",
                  unitPrice:
                      "95000.00",
                  currency:
                      "mxn",
                  active:
                      true,
              },
              {
                  tenantId,
                  productTypeId:
                      serviceTypeId,
                  itemType:
                      "service",
                  name:
                      "Servicio Demo",
                  code:
                      "DEMO-SERVICE",
                  description:
                      "Servicio de mantenimiento preventivo.",
                  category:
                      "Mantenimiento preventivo",
                  unitPrice:
                      "2500.00",
                  currency:
                      "mxn",
                  active:
                      true,
              },
              {
                  tenantId,
                  productTypeId:
                      physicalProductTypeId,
                  itemType:
                      "product",
                  name:
                      "Casco Demo Premium",
                  code:
                      "DEMO-PREMIUM",
                  description:
                      "Casco integral premium para motociclista.",
                  category:
                      "Cascos",
                  unitPrice:
                      "8500.00",
                  currency:
                      "mxn",
                  active:
                      true,
              },
              {
                  tenantId,
                  productTypeId:
                      physicalProductTypeId,
                  itemType:
                      "product",
                  name:
                      "Casco Demo Standard",
                  code:
                      "DEMO-STANDARD",
                  description:
                      "Casco integral de uso urbano.",
                  category:
                      "Cascos",
                  unitPrice:
                      "4200.00",
                  currency:
                      "mxn",
                  active:
                      true,
              },
          ])
          .onConflictDoUpdate({
              target: [
                  crmProducts.tenantId,
                  crmProducts.code,
              ],
              set: {
                  active:
                      true,
                  updatedAt:
                      now,
              },
          })
          .returning({
              id:
                  crmProducts.id,
              name:
                  crmProducts.name,
              description:
                  crmProducts.description,
          });

  if (
      products.length !== 5
  ) {
      throw new Error(
          "No fue posible preparar los productos del demo.",
      );
  }

  /*
   * El inventario detallado del demo se prepara por separado con
   * scripts/seed-demo-motos-inventory.mjs.
   */
  const locations: never[] = [];
  const stocks: never[] = [];

    /*
     * ============================================================
     * LEADS
     * ============================================================
     */

    const leadData = [
        {
            branchId:
                branches[0].id,
            firstName: "Carlos",
            lastName: "Ramírez",
            email:
                "carlos.ramirez@example.com",
            phone:
                "5512345678",
            mobile:
                "5512345678",
            source: "Facebook",
            status: "Nuevo",
            productId:
                products[0].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            commercialConsent: true,
            notes:
                "Solicitó información sobre la motocicleta premium.",
        },
        {
            branchId:
                branches[1].id,
            firstName: "Mariana",
            lastName: "Torres",
            email:
                "mariana.torres@example.com",
            phone:
                "5587654321",
            mobile:
                "5587654321",
            source: "Instagram",
            status: "Contactado",
            productId:
                products[1].id,
            ownerName:
                "Luis Hernández",
            ownerEmail:
                "luis.hernandez@example.com",
            commercialConsent: true,
            notes:
                "Interesada en opciones de financiamiento.",
        },
        {
            branchId:
                branches[0].id,
            firstName: "Jorge",
            lastName: "Mendoza",
            email:
                "jorge.mendoza@example.com",
            phone:
                "5543219876",
            mobile:
                "5543219876",
            source: "Sitio web",
            status: "Calificado",
            productId:
                products[0].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            commercialConsent: true,
            notes:
                "Lead calificado con intención de compra.",
        },
        {
            branchId:
                branches[1].id,
            firstName: "Fernanda",
            lastName: "Castillo",
            email:
                "fernanda.castillo@example.com",
            phone:
                "5598765432",
            mobile:
                "5598765432",
            source: "Referido",
            status: "En seguimiento",
            productId:
                products[1].id,
            ownerName:
                "Luis Hernández",
            ownerEmail:
                "luis.hernandez@example.com",
            commercialConsent: true,
            notes:
                "Referida por un cliente actual.",
        },
        {
            branchId:
                branches[0].id,
            firstName: "Roberto",
            lastName: "Sánchez",
            email:
                "roberto.sanchez@example.com",
            phone:
                "5524681357",
            mobile:
                "5524681357",
            source: "Google",
            status: "Nuevo",
            productId:
                products[1].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            commercialConsent: false,
            notes:
                "Solicitó contacto para conocer precios.",
        },
    ];

    const leads: Array<{
        id: string;
    }> = [];

    for (
        const lead of leadData
    ) {
        const [existingLead] =
            await db
                .select({
                    id: crmLeads.id,
                })
                .from(crmLeads)
                .where(
                    and(
                        eq(
                            crmLeads.tenantId,
                            tenantId,
                        ),
                        eq(
                            crmLeads.email,
                            lead.email,
                        ),
                    ),
                )
                .limit(1);

        if (existingLead) {
            const [updatedLead] =
                await db
                    .update(crmLeads)
                    .set({
                        branchId:
                            lead.branchId,
                        firstName:
                            lead.firstName,
                        lastName:
                            lead.lastName,
                        phone:
                            lead.phone,
                        mobile:
                            lead.mobile,
                        source:
                            lead.source,
                        status:
                            lead.status,
                        productId:
                            lead.productId,
                        ownerName:
                            lead.ownerName,
                        ownerEmail:
                            lead.ownerEmail,
                        commercialConsent:
                            lead.commercialConsent,
                        notes:
                            lead.notes,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            crmLeads.id,
                            existingLead.id,
                        ),
                    )
                    .returning({
                        id:
                            crmLeads.id,
                        firstName:
                            crmLeads.firstName,
                        lastName:
                            crmLeads.lastName,
                    });

            if (updatedLead) {
                leads.push(
                    updatedLead,
                );
            }

            continue;
        }

        const [createdLead] =
            await db
                .insert(crmLeads)
                .values({
                    tenantId,
                    ...lead,
                })
                .returning({
                    id:
                        crmLeads.id,
                    firstName:
                        crmLeads.firstName,
                    lastName:
                        crmLeads.lastName,
                });

        if (createdLead) {
            leads.push(
                createdLead,
            );
        }
    }

    /*
     * ============================================================
     * LEADS ADICIONALES
     * ============================================================
     */

    const additionalLeadDefinitions =
        Array.from(
            {
                length: 295,
            },
            (_, index) => {
                const leadNumber =
                    index + 6;

                const firstNames = [
                    "Alejandro",
                    "Andrea",
                    "Daniel",
                    "Fernanda",
                    "Gabriel",
                    "Laura",
                    "Luis",
                    "Mariana",
                    "Miguel",
                    "Natalia",
                    "Pablo",
                    "Ricardo",
                    "Sofía",
                    "Valentina",
                    "Víctor",
                ];

                const lastNames = [
                    "García",
                    "Hernández",
                    "Martínez",
                    "López",
                    "González",
                    "Pérez",
                    "Rodríguez",
                    "Sánchez",
                    "Ramírez",
                    "Torres",
                    "Flores",
                    "Rivera",
                    "Vargas",
                    "Castillo",
                    "Morales",
                ];

                const firstName =
                    firstNames[
                        index %
                            firstNames.length
                    ];

                const lastName =
                    lastNames[
                        Math.floor(
                            index /
                                firstNames.length,
                        ) %
                            lastNames.length
                    ];

                const branch =
                    branches[
                        index %
                            branches.length
                    ];

                return {
                    branchId:
                        branch.id,
                    firstName,
                    lastName:
                        `${lastName} ${leadNumber}`,
                    email:
                        `lead${leadNumber}@demo.datara-lab.com`,
                    phone:
                        `55${String(
                            30000000 +
                                index,
                        ).slice(-8)}`,
                    mobile:
                        `55${String(
                            40000000 +
                                index,
                        ).slice(-8)}`,
                    companyName:
                        index % 5 ===
                        0
                            ? `Empresa Demo ${leadNumber}`
                            : null,
                    source:
                        "Demo",
                    status:
                        index % 8 ===
                        0
                            ? "Convertido"
                            : "Nuevo",
                    ownerClerkUserId:
                        DEMO_USER_ID,
                    ownerName:
                        DEMO_USER_NAME,
                    ownerEmail:
                        DEMO_USER_EMAIL,
                };
            },
        );

    for (
        const lead of additionalLeadDefinitions
    ) {
        const [
            existingLead,
        ] =
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
                            crmLeads
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmLeads.email,
                            lead.email,
                        ),
                    ),
                )
                .limit(1);

        const leadValues = {
            tenantId,
            branchId:
                lead.branchId,
            firstName:
                lead.firstName,
            lastName:
                lead.lastName,
            email:
                lead.email,
            phone:
                lead.phone,
            mobile:
                lead.mobile,
            companyName:
                lead.companyName,
            source:
                lead.source,
            status:
                lead.status,
            ownerClerkUserId:
                lead.ownerClerkUserId,
            ownerName:
                lead.ownerName,
            ownerEmail:
                lead.ownerEmail,
        };

        if (existingLead) {
            const [
                updatedLead,
            ] = await db
                .update(
                    crmLeads,
                )
                .set({
                    ...leadValues,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmLeads.id,
                        existingLead.id,
                    ),
                )
                .returning({
                    id:
                        crmLeads.id,
                });

            if (
                updatedLead
            ) {
                leads.push(
                    updatedLead,
                );
            }

            continue;
        }

        const [
            createdLead,
        ] = await db
            .insert(
                crmLeads,
            )
            .values(
                leadValues,
            )
            .returning({
                id:
                    crmLeads.id,
            });

        if (
            createdLead
        ) {
            leads.push(
                createdLead,
            );
        }
    }

    /*
     * ============================================================
     * CLIENTES
     * ============================================================
     */

    const customerData = [
        {
            branchId:
                branches[0].id,
            customerType: "Persona",
            name: "Carlos",
            lastName: "Ramírez",
            email:
                "carlos.ramirez@example.com",
            phone:
                "5512345678",
            mobile:
                "5512345678",
            status: "Activo",
            taxId: "RACJ850101ABC",
            sourceLeadEmail:
                "carlos.ramirez@example.com",
            productId:
                products[0].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            addressLine:
                "Av. Insurgentes Sur 1200",
            city: "Ciudad de México",
            state: "CDMX",
            postalCode: "03100",
        },
        {
            branchId:
                branches[1].id,
            customerType: "Persona",
            name: "Mariana",
            lastName: "Torres",
            email:
                "mariana.torres@example.com",
            phone:
                "5587654321",
            mobile:
                "5587654321",
            status: "Activo",
            taxId: "TOMM900202DEF",
            sourceLeadEmail:
                "mariana.torres@example.com",
            productId:
                products[1].id,
            ownerName:
                "Luis Hernández",
            ownerEmail:
                "luis.hernandez@example.com",
            addressLine:
                "Av. Coyoacán 850",
            city: "Ciudad de México",
            state: "CDMX",
            postalCode: "03300",
        },
        {
            branchId:
                branches[0].id,
            customerType: "Persona",
            name: "Jorge",
            lastName: "Mendoza",
            email:
                "jorge.mendoza@example.com",
            phone:
                "5543219876",
            mobile:
                "5543219876",
            status: "Activo",
            taxId: "MEJO880303GHI",
            sourceLeadEmail:
                "jorge.mendoza@example.com",
            productId:
                products[0].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            addressLine:
                "Av. Universidad 430",
            city: "Ciudad de México",
            state: "CDMX",
            postalCode: "04360",
        },
        {
            branchId:
                branches[1].id,
            customerType: "Empresa",
            name: "Transportes",
            lastName: "Del Valle",
            companyName:
                "Transportes Del Valle",
            legalName:
                "Transportes Del Valle S.A. de C.V.",
            email:
                "compras@transportesdelvalle.example.com",
            phone:
                "5555551111",
            mobile:
                "5555551111",
            status: "Activo",
            taxId: "TDV920404JKL",
            sourceLeadEmail:
                "fernanda.castillo@example.com",
            productId:
                products[1].id,
            ownerName:
                "Luis Hernández",
            ownerEmail:
                "luis.hernandez@example.com",
            addressLine:
                "Av. Central 500",
            city: "Ciudad de México",
            state: "CDMX",
            postalCode: "07700",
        },
        {
            branchId:
                branches[0].id,
            customerType: "Empresa",
            name: "Grupo",
            lastName: "Motors",
            companyName:
                "Grupo Motors México",
            legalName:
                "Grupo Motors México S.A. de C.V.",
            email:
                "ventas@grupomotors.example.com",
            phone:
                "5555552222",
            mobile:
                "5555552222",
            status: "Activo",
            taxId: "GMM930505MNO",
            productId:
                products[0].id,
            ownerName:
                "Ana López",
            ownerEmail:
                "ana.lopez@example.com",
            addressLine:
                "Periférico Sur 1500",
            city: "Ciudad de México",
            state: "CDMX",
            postalCode: "01900",
        },
    ];

    const customers: Array<{
        id: string;
        name: string;
        lastName: string | null;
    }> = [];

    for (
        const customer of customerData
    ) {
        const [
            sourceLead,
        ] =
            customer.sourceLeadEmail
                ? await db
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
                                  crmLeads
                                      .tenantId,
                                  tenantId,
                              ),
                              eq(
                                  crmLeads
                                      .email,
                                  customer
                                      .sourceLeadEmail,
                              ),
                          ),
                      )
                      .limit(1)
                : [undefined];

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
                            crmCustomers
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmCustomers
                                .taxId,
                            customer.taxId,
                        ),
                    ),
                )
                .limit(1);

        const customerValues = {
            tenantId,
            branchId:
                customer.branchId,
            customerType:
                customer.customerType,
            name:
                customer.name,
            lastName:
                customer.lastName,
            companyName:
                customer.companyName,
            legalName:
                customer.legalName,
            taxId:
                customer.taxId,
            email:
                customer.email,
            phone:
                customer.phone,
            mobile:
                customer.mobile,
            status:
                customer.status,
            sourceLeadId:
                sourceLead?.id,
            productId:
                customer.productId,
            ownerName:
                customer.ownerName,
            ownerEmail:
                customer.ownerEmail,
            addressLine:
                customer.addressLine,
            city:
                customer.city,
            state:
                customer.state,
            postalCode:
                customer.postalCode,
            country: "MX",
            commercialConsent: true,
        };

        if (existingCustomer) {
            const [updatedCustomer] =
                await db
                    .update(
                        crmCustomers,
                    )
                    .set({
                        ...customerValues,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            crmCustomers.id,
                            existingCustomer.id,
                        ),
                    )
                    .returning({
                        id:
                            crmCustomers.id,
                        name:
                            crmCustomers.name,
                        lastName:
                            crmCustomers.lastName,
                    });

            if (
                updatedCustomer
            ) {
                customers.push(
                    updatedCustomer,
                );
            }

            continue;
        }

        const [createdCustomer] =
            await db
                .insert(
                    crmCustomers,
                )
                .values(
                    customerValues,
                )
                .returning({
                    id:
                        crmCustomers.id,
                    name:
                        crmCustomers.name,
                    lastName:
                        crmCustomers.lastName,
                });

        if (
            createdCustomer
        ) {
            customers.push(
                createdCustomer,
            );
        }
    }

    /*
     * ============================================================
     * CLIENTES ADICIONALES
     * ============================================================
     */

    const additionalCustomerData = Array.from(
        {
            length: 195,
        },
        (_, index) => {
            const customerNumber =
                index + 6;

            const firstNames = [
                "Alejandro",
                "Andrea",
                "Daniel",
                "Fernanda",
                "Gabriel",
                "Laura",
                "Luis",
                "Mariana",
                "Miguel",
                "Natalia",
                "Pablo",
                "Ricardo",
                "Sofía",
                "Valentina",
                "Víctor",
            ];

            const lastNames = [
                "García",
                "Hernández",
                "Martínez",
                "López",
                "González",
                "Pérez",
                "Rodríguez",
                "Sánchez",
                "Ramírez",
                "Torres",
                "Flores",
                "Rivera",
                "Vargas",
                "Castillo",
                "Morales",
            ];

            const firstName =
                firstNames[
                    index %
                        firstNames.length
                ];

            const lastName =
                lastNames[
                    Math.floor(
                        index /
                            firstNames.length,
                    ) %
                        lastNames.length
                ];

            const branch =
                branches[
                    index %
                        branches.length
                ];

            const product =
                products[
                    index %
                        products.length
                ];

            return {
                branchId:
                    branch.id,
                customerType:
                    "Persona",
                name:
                    firstName,
                lastName:
                    `${lastName} ${customerNumber}`,
                companyName:
                    null,
                legalName:
                    null,
                taxId:
                    `DEMO${String(
                        customerNumber,
                    ).padStart(
                        6,
                        "0",
                    )}`,
                email:
                    `cliente${customerNumber}@demo.datara-lab.com`,
                phone:
                    `55${String(
                        10000000 +
                            index,
                    ).slice(-8)}`,
                mobile:
                    `55${String(
                        20000000 +
                            index,
                    ).slice(-8)}`,
                status:
                    index % 10 ===
                    0
                        ? "Inactivo"
                        : "Activo",
                sourceLeadEmail:
                    null,
                productId:
                    product.id,
                ownerName:
                    DEMO_USER_NAME,
                ownerEmail:
                    DEMO_USER_EMAIL,
                addressLine:
                    `Av. Demo ${customerNumber}`,
                city:
                    "Ciudad de México",
                state:
                    "CDMX",
                postalCode:
                    `0${1000 + index}`,
            };
        },
    );

    for (
        const customer of additionalCustomerData
    ) {
        const [
            existingCustomer,
        ] =
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
                            crmCustomers
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmCustomers
                                .taxId,
                            customer.taxId,
                        ),
                    ),
                )
                .limit(1);

        const customerValues = {
            tenantId,
            branchId:
                customer.branchId,
            customerType:
                customer.customerType,
            name:
                customer.name,
            lastName:
                customer.lastName,
            companyName:
                customer.companyName,
            legalName:
                customer.legalName,
            taxId:
                customer.taxId,
            email:
                customer.email,
            phone:
                customer.phone,
            mobile:
                customer.mobile,
            status:
                customer.status,
            sourceLeadId:
                undefined,
            productId:
                customer.productId,
            ownerName:
                customer.ownerName,
            ownerEmail:
                customer.ownerEmail,
            addressLine:
                customer.addressLine,
            city:
                customer.city,
            state:
                customer.state,
            postalCode:
                customer.postalCode,
            country:
                "MX",
            commercialConsent:
                true,
        };

        if (existingCustomer) {
            const [
                updatedCustomer,
            ] = await db
                .update(
                    crmCustomers,
                )
                .set({
                    ...customerValues,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmCustomers.id,
                        existingCustomer.id,
                    ),
                )
                .returning({
                    id:
                        crmCustomers.id,
                    name:
                        crmCustomers.name,
                    lastName:
                        crmCustomers.lastName,
                });

            if (
                updatedCustomer
            ) {
                customers.push(
                    updatedCustomer,
                );
            }

            continue;
        }

        const [
            createdCustomer,
        ] = await db
            .insert(
                crmCustomers,
            )
            .values(
                customerValues,
            )
            .returning({
                id:
                    crmCustomers.id,
                name:
                    crmCustomers.name,
                lastName:
                    crmCustomers.lastName,
            });

        if (
            createdCustomer
        ) {
            customers.push(
                createdCustomer,
            );
        }
    }

    /*
     * ============================================================
     * OPORTUNIDADES
     * ============================================================
     */

    const dealDefinitions = [
        {
            name:
                "Venta Moto Premium - Carlos Ramírez",
            branchId:
                branches[0].id,
            customerIndex: 0,
            leadIndex: 0,
            productIndex: 0,
            stage: "Propuesta",
            status: "Abierta",
            baseAmount:
                "185000.00",
            discountAmount:
                "10000.00",
            totalAmount:
                "175000.00",
            probability: 75,
            paymentMethod:
                "Financiamiento",
            minimumDownPayment:
                "35000.00",
            customerDownPayment:
                "35000.00",
            financedAmount:
                "140000.00",
            financingMonths: 36,
            estimatedPayment:
                "5200.00",
        },
        {
            name:
                "Venta Moto Urbana - Mariana Torres",
            branchId:
                branches[1].id,
            customerIndex: 1,
            leadIndex: 1,
            productIndex: 1,
            stage: "Negociación",
            status: "Abierta",
            baseAmount:
                "95000.00",
            discountAmount:
                "5000.00",
            totalAmount:
                "90000.00",
            probability: 60,
            paymentMethod:
                "Financiamiento",
            minimumDownPayment:
                "18000.00",
            customerDownPayment:
                "18000.00",
            financedAmount:
                "72000.00",
            financingMonths: 24,
            estimatedPayment:
                "3450.00",
        },
        {
            name:
                "Flotilla Grupo Motors",
            branchId:
                branches[0].id,
            customerIndex: 4,
            leadIndex: null,
            productIndex: 0,
            stage: "Cierre",
            status: "Ganada",
            baseAmount:
                "555000.00",
            discountAmount:
                "30000.00",
            totalAmount:
                "525000.00",
            probability: 100,
            paymentMethod:
                "Transferencia",
            minimumDownPayment:
                "525000.00",
            customerDownPayment:
                "525000.00",
            financedAmount:
                "0.00",
            financingMonths: null,
            estimatedPayment:
                null,
        },
        {
            name:
                "Moto Urbana - Transportes Del Valle",
            branchId:
                branches[1].id,
            customerIndex: 3,
            leadIndex: 3,
            productIndex: 1,
            stage: "Calificación",
            status: "Abierta",
            baseAmount:
                "190000.00",
            discountAmount:
                "0.00",
            totalAmount:
                "190000.00",
            probability: 30,
            paymentMethod:
                "Contado",
            minimumDownPayment:
                "190000.00",
            customerDownPayment:
                "0.00",
            financedAmount:
                "190000.00",
            financingMonths: 12,
            estimatedPayment:
                "15833.33",
        },
        {
            name:
                "Servicio Preventivo - Jorge Mendoza",
            branchId:
                branches[0].id,
            customerIndex: 2,
            leadIndex: 2,
            productIndex: 2,
            stage: "Cierre",
            status: "Ganada",
            baseAmount:
                "2500.00",
            discountAmount:
                "0.00",
            totalAmount:
                "2500.00",
            probability: 100,
            paymentMethod:
                "Tarjeta",
            minimumDownPayment:
                "2500.00",
            customerDownPayment:
                "2500.00",
            financedAmount:
                "0.00",
            financingMonths: null,
            estimatedPayment:
                null,
        },
    ];

    const deals = [];

    for (
        const deal of dealDefinitions
    ) {
        const [
            existingDeal,
        ] =
            await db
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
                            crmDeals
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmDeals.name,
                            deal.name,
                        ),
                    ),
                )
                .limit(1);

        const customer =
            customers[
                deal.customerIndex
            ];

        const lead =
            deal.leadIndex !==
            null
                ? leads[
                      deal.leadIndex
                  ]
                : undefined;

        const values = {
            tenantId,
            branchId:
                deal.branchId,
            name:
                deal.name,
            customerId:
                customer?.id,
            sourceLeadId:
                lead?.id,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            stage:
                deal.stage,
            status:
                deal.status,
            acquisitionChannel:
                "Demo",
            currency: "mxn",
            baseAmount:
                deal.baseAmount,
            discountAmount:
                deal.discountAmount,
            totalAmount:
                deal.totalAmount,
            paymentMethod:
                deal.paymentMethod,
            minimumDownPayment:
                deal.minimumDownPayment,
            customerDownPayment:
                deal.customerDownPayment,
            financedAmount:
                deal.financedAmount,
            financingMonths:
                deal.financingMonths,
            estimatedPayment:
                deal.estimatedPayment,
            probability:
                deal.probability,
            expectedCloseAt:
                new Date(
                    now.getTime() +
                        1000 *
                            60 *
                            60 *
                            24 *
                            30,
                ),
            closedAt:
                deal.status ===
                "Ganada"
                    ? now
                    : null,
            nextStep:
                deal.status ===
                "Ganada"
                    ? "Entrega y seguimiento postventa"
                    : "Contactar al cliente",
            notes:
                "Oportunidad creada para demostrar el flujo comercial.",
        };

        if (existingDeal) {
            const [updatedDeal] =
                await db
                    .update(
                        crmDeals,
                    )
                    .set({
                        ...values,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            crmDeals.id,
                            existingDeal.id,
                        ),
                    )
                    .returning({
                        id:
                            crmDeals.id,
                        name:
                            crmDeals.name,
                    });

            if (updatedDeal) {
                deals.push(
                    updatedDeal,
                );
            }

            continue;
        }

        const [createdDeal] =
            await db
                .insert(
                    crmDeals,
                )
                .values(values)
                .returning({
                    id:
                        crmDeals.id,
                    name:
                        crmDeals.name,
                });

        if (createdDeal) {
            deals.push(
                createdDeal,
            );
        }
    }

    /*
     * ============================================================
     * OPORTUNIDADES ADICIONALES
     * ============================================================
     */

    const additionalDealDefinitions =
        Array.from(
            {
                length: 245,
            },
            (_, index) => {
                const dealNumber =
                    index + 6;

                const customer =
                    customers[
                        index %
                            customers.length
                    ];

                const lead =
                    leads[
                        index %
                            leads.length
                    ];

                const product =
                    products[
                        index %
                            products.length
                    ];

                const branch =
                    branches[
                        index %
                            branches.length
                    ];

                const totalAmount =
                    product.name ===
                    "Servicio Demo"
                        ? "2500.00"
                        : product.name ===
                            "Producto Demo Premium"
                          ? "175000.00"
                          : "90000.00";

                const stages = [
                    "Prospección",
                    "Calificación",
                    "Propuesta",
                    "Negociación",
                    "Cierre",
                ];

                const statuses = [
                    "Abierta",
                    "Abierta",
                    "Abierta",
                    "Abierta",
                    "Ganada",
                ];

                const stage =
                    stages[
                        index %
                            stages.length
                    ];

                const status =
                    statuses[
                        index %
                            statuses.length
                    ];

                const probabilityMap: Record<
                    string,
                    number
                > = {
                    Prospección: 10,
                    Calificación: 30,
                    Propuesta: 60,
                    Negociación: 80,
                    Cierre: 100,
                };

                return {
                    name:
                        `Oportunidad Demo ${dealNumber} - ${customer.name} ${customer.lastName ?? ""}`.trim(),
                    branchId:
                        branch.id,
                    customerId:
                        customer.id,
                    leadId:
                        lead.id,
                    productId:
                        product.id,
                    stage,
                    status,
                    baseAmount:
                        totalAmount,
                    discountAmount:
                        "0.00",
                    totalAmount,
                    paymentMethod:
                        index % 3 ===
                        0
                            ? "Financiamiento"
                            : "Contado",
                    minimumDownPayment:
                        index % 3 ===
                        0
                            ? totalAmount
                            : "0.00",
                    customerDownPayment:
                        index % 3 ===
                        0
                            ? "0.00"
                            : totalAmount,
                    financedAmount:
                        index % 3 ===
                        0
                            ? totalAmount
                            : "0.00",
                    financingMonths:
                        index % 3 ===
                        0
                            ? 12
                            : null,
                    estimatedPayment:
                        index % 3 ===
                        0
                            ? (
                                  Number(
                                      totalAmount,
                                  ) /
                                  12
                              ).toFixed(
                                  2,
                              )
                            : null,
                    probability:
                        probabilityMap[
                            stage
                        ],
                };
            },
        );

    for (
        const [
            dealIndex,
            deal,
        ] of additionalDealDefinitions.entries()
    ) {
        const [
            existingDeal,
        ] =
            await db
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
                            crmDeals
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmDeals.name,
                            deal.name,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            branchId:
                deal.branchId,
            name:
                deal.name,
            customerId:
                deal.customerId,
            sourceLeadId:
                deal.leadId,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            stage:
                deal.stage,
            status:
                deal.status,
            acquisitionChannel:
                "Demo",
            currency:
                "mxn",
            baseAmount:
                deal.baseAmount,
            discountAmount:
                deal.discountAmount,
            totalAmount:
                deal.totalAmount,
            paymentMethod:
                deal.paymentMethod,
            minimumDownPayment:
                deal.minimumDownPayment,
            customerDownPayment:
                deal.customerDownPayment,
            financedAmount:
                deal.financedAmount,
            financingMonths:
                deal.financingMonths,
            estimatedPayment:
                deal.estimatedPayment,
            probability:
                deal.probability,
            expectedCloseAt:
                new Date(
                    now.getTime() +
                        1000 *
                            60 *
                            60 *
                            24 *
                            ((dealIndex + 7) %
                                90),
                ),
            closedAt:
                deal.status ===
                "Ganada"
                    ? now
                    : null,
            nextStep:
                deal.status ===
                "Ganada"
                    ? "Entrega y seguimiento postventa"
                    : "Contactar al cliente",
            notes:
                "Oportunidad creada para demostrar el flujo comercial.",
        };

        if (existingDeal) {
            const [
                updatedDeal,
            ] = await db
                .update(
                    crmDeals,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmDeals.id,
                        existingDeal.id,
                    ),
                )
                .returning({
                    id:
                        crmDeals.id,
                    name:
                        crmDeals.name,
                });

            if (
                updatedDeal
            ) {
                deals.push(
                    updatedDeal,
                );
            }

            continue;
        }

        const [
            createdDeal,
        ] = await db
            .insert(
                crmDeals,
            )
            .values(
                values,
            )
            .returning({
                id:
                    crmDeals.id,
                name:
                    crmDeals.name,
            });

        if (
            createdDeal
        ) {
            deals.push(
                createdDeal,
            );
        }
    }

    /*
     * ============================================================
     * ITEMS DE OPORTUNIDADES
     * ============================================================
     */

    for (
        let index = 0;
        index < dealDefinitions.length;
        index += 1
    ) {
        const deal =
            deals[index];

        const definition =
            dealDefinitions[index];

        if (!deal) {
            continue;
        }

        const product =
            products[
                definition
                    .productIndex
            ];

        const [
            existingItem,
        ] =
            await db
                .select({
                    id:
                        crmDealItems.id,
                })
                .from(
                    crmDealItems,
                )
                .where(
                    and(
                        eq(
                            crmDealItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmDealItems
                                .dealId,
                            deal.id,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            await db
                .update(
                    crmDealItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: "1",
                    unitPrice:
                        definition
                            .baseAmount,
                    discountAmount:
                        definition
                            .discountAmount,
                    totalAmount:
                        definition
                            .totalAmount,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmDealItems.id,
                        existingItem.id,
                    ),
                );

            continue;
        }

        await db
            .insert(
                crmDealItems,
            )
            .values({
                tenantId,
                dealId:
                    deal.id,
                productId:
                    product.id,
                name:
                    product.name,
                description:
                    product.description ??
                    null,
                quantity: "1",
                unitPrice:
                    definition
                        .baseAmount,
                discountAmount:
                    definition
                        .discountAmount,
                totalAmount:
                    definition
                        .totalAmount,
                paymentMethod:
                    definition
                        .paymentMethod,
                minimumDownPayment:
                    definition
                        .minimumDownPayment,
                customerDownPayment:
                    definition
                        .customerDownPayment,
                financedAmount:
                    definition
                        .financedAmount,
                financingMonths:
                    definition
                        .financingMonths,
                estimatedPayment:
                    definition
                        .estimatedPayment,
                position: 0,
            });
    }

    /*
     * ============================================================
     * ITEMS DE OPORTUNIDADES ADICIONALES
     * ============================================================
     */

    for (
        let index = 5;
        index < deals.length;
        index += 1
    ) {
        const deal =
            deals[index];

        const product =
            products[
                index %
                    products.length
            ];

        const totalAmount =
            product.name ===
            "Servicio Demo"
                ? "2500.00"
                : product.name ===
                    "Producto Demo Premium"
                  ? "175000.00"
                  : "90000.00";

        const [
            existingItem,
        ] =
            await db
                .select({
                    id:
                        crmDealItems.id,
                })
                .from(
                    crmDealItems,
                )
                .where(
                    and(
                        eq(
                            crmDealItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmDealItems
                                .dealId,
                            deal.id,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            await db
                .update(
                    crmDealItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: "1",
                    unitPrice:
                        totalAmount,
                    discountAmount:
                        "0.00",
                    totalAmount,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmDealItems.id,
                        existingItem.id,
                    ),
                );

            continue;
        }

        await db
            .insert(
                crmDealItems,
            )
            .values({
                tenantId,
                dealId:
                    deal.id,
                productId:
                    product.id,
                name:
                    product.name,
                description:
                    product.description ??
                    null,
                quantity: "1",
                unitPrice:
                    totalAmount,
                discountAmount:
                    "0.00",
                totalAmount,
                paymentMethod:
                    index % 3 ===
                    0
                        ? "Financiamiento"
                        : "Contado",
                minimumDownPayment:
                    index % 3 ===
                    0
                        ? totalAmount
                        : "0.00",
                customerDownPayment:
                    index % 3 ===
                    0
                        ? "0.00"
                        : totalAmount,
                financedAmount:
                    index % 3 ===
                    0
                        ? totalAmount
                        : "0.00",
                financingMonths:
                    index % 3 ===
                    0
                        ? 12
                        : null,
                estimatedPayment:
                    index % 3 ===
                    0
                        ? (
                              Number(
                                  totalAmount,
                              ) /
                              12
                          ).toFixed(
                              2,
                          )
                        : null,
                position: 0,
            });
    }

    /*
     * ============================================================
     * PROMOCIONES
     * ============================================================
     */

    const promotionDefinitions = [
        {
            name:
                "10% de descuento en enganche",
            externalId:
                "DEMO-PROMO-ENGANCHE",
            benefitType:
                "Porcentaje",
            paymentMethod:
                "Financiamiento",
            promotionGroup:
                "Financiamiento",
            value: "10.00",
            commercialMessage:
                "Obtén un beneficio especial al financiar tu motocicleta.",
        },
        {
            name:
                "Servicio preventivo incluido",
            externalId:
                "DEMO-PROMO-SERVICIO",
            benefitType:
                "Beneficio",
            paymentMethod:
                "Cualquier método",
            promotionGroup:
                "Postventa",
            value: "2500.00",
            commercialMessage:
                "Incluye servicio preventivo sin costo.",
        },
        {
            name:
                "Descuento especial de temporada",
            externalId:
                "DEMO-PROMO-TEMPORADA",
            benefitType:
                "Monto",
            paymentMethod:
                "Contado",
            promotionGroup:
                "Temporada",
            value: "5000.00",
            commercialMessage:
                "Precio especial por tiempo limitado.",
        },
    ];

    const promotions = [];

    for (
        const promotion of promotionDefinitions
    ) {
        const [existingPromotion] =
            await db
                .select({
                    id:
                        crmPromotions.id,
                })
                .from(
                    crmPromotions,
                )
                .where(
                    and(
                        eq(
                            crmPromotions
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmPromotions
                                .sourceExternalId,
                            promotion
                                .externalId,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            name:
                promotion.name,
            priority: 1,
            promotionStart:
                new Date(
                    now.getTime() -
                        1000 *
                            60 *
                            60 *
                            24 *
                            30,
                ),
            promotionEnd:
                new Date(
                    now.getTime() +
                        1000 *
                            60 *
                            60 *
                            24 *
                            60,
                ),
            benefitType:
                promotion
                    .benefitType,
            paymentMethod:
                promotion
                    .paymentMethod,
            promotionGroup:
                promotion
                    .promotionGroup,
            availableMonths: [
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre",
            ],
            channels: [
                "Sucursal",
                "Web",
                "Redes sociales",
            ],
            minimumDownPayment:
                "0",
            maximumBenefits: 100,
            usedBenefits: 12,
            limitPromotion: true,
            paused: false,
            requiresSelection: false,
            customerType:
                "Todos",
            value:
                promotion.value,
            commercialMessage:
                promotion
                    .commercialMessage,
            conditions:
                "Aplican términos y condiciones.",
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            sourceExternalId:
                promotion
                    .externalId,
        };

        if (existingPromotion) {
            const [updatedPromotion] =
                await db
                    .update(
                        crmPromotions,
                    )
                    .set({
                        ...values,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            crmPromotions.id,
                            existingPromotion.id,
                        ),
                    )
                    .returning({
                        id:
                            crmPromotions.id,
                        name:
                            crmPromotions.name,
                    });

            if (
                updatedPromotion
            ) {
                promotions.push(
                    updatedPromotion,
                );
            }

            continue;
        }

        const [createdPromotion] =
            await db
                .insert(
                    crmPromotions,
                )
                .values(values)
                .returning({
                    id:
                        crmPromotions.id,
                    name:
                        crmPromotions.name,
                });

        if (
            createdPromotion
        ) {
            promotions.push(
                createdPromotion,
            );
        }
    }

    /*
     * ============================================================
     * PRODUCTOS DE PROMOCIONES
     * ============================================================
     */

    for (
        const promotion of promotions
    ) {
        for (
            const product of products
        ) {
            await db
                .insert(
                    crmPromotionProducts,
                )
                .values({
                    promotionId:
                        promotion.id,
                    productId:
                        product.id,
                })
                .onConflictDoNothing();
        }
    }

    /*
     * ============================================================
     * COTIZACIONES
     * ============================================================
     */

    const quoteDefinitions = [
        {
            number:
                "COT-DEMO-0001",
            subject:
                "Cotización Moto Premium",
            customerIndex: 0,
            dealIndex: 0,
            productIndex: 0,
            status: "Enviada",
            total:
                "175000.00",
        },
        {
            number:
                "COT-DEMO-0002",
            subject:
                "Cotización Moto Urbana",
            customerIndex: 1,
            dealIndex: 1,
            productIndex: 1,
            status: "Aceptada",
            total:
                "90000.00",
        },
        {
            number:
                "COT-DEMO-0003",
            subject:
                "Cotización Flotilla",
            customerIndex: 4,
            dealIndex: 2,
            productIndex: 0,
            status: "Aceptada",
            total:
                "525000.00",
        },
        {
            number:
                "COT-DEMO-0004",
            subject:
                "Cotización Servicio Preventivo",
            customerIndex: 2,
            dealIndex: 4,
            productIndex: 2,
            status: "Borrador",
            total:
                "2500.00",
        },
    ];

    const quotes = [];

    for (
        const definition of quoteDefinitions
    ) {
        const customer =
            customers[
                definition
                    .customerIndex
            ];

        const deal =
            deals[
                definition.dealIndex
            ];

        const product =
            products[
                definition
                    .productIndex
            ];

        const [existingQuote] =
            await db
                .select({
                    id:
                        crmQuotes.id,
                })
                .from(
                    crmQuotes,
                )
                .where(
                    and(
                        eq(
                            crmQuotes
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuotes
                                .quoteNumber,
                            definition
                                .number,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            branchId:
                branches[0].id,
            quoteNumber:
                definition.number,
            subject:
                definition.subject,
            status:
                definition.status,
            customerId:
                customer?.id,
            sourceLeadId:
                undefined,
            dealId:
                deal?.id,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            currency: "mxn",
            validUntil:
                new Date(
                    now.getTime() +
                        1000 *
                            60 *
                            60 *
                            24 *
                            15,
                ),
            baseAmount:
                definition.total,
            discountAmount:
                "0",
            taxAmount:
                "0",
            adjustmentAmount:
                "0",
            totalAmount:
                definition.total,
            paymentMethod:
                "Financiamiento",
            commercialSummary:
                "Cotización preparada para demostración del flujo comercial.",
            termsAndConditions:
                "Precios sujetos a disponibilidad.",
            description:
                "Documento de cotización demo.",
        };

        let quoteId:
            string | undefined;

        if (existingQuote) {
            await db
                .update(
                    crmQuotes,
                )
                .set({
                    ...values,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmQuotes.id,
                        existingQuote.id,
                    ),
                );

            quoteId =
                existingQuote.id;
        } else {
            const [createdQuote] =
                await db
                    .insert(
                        crmQuotes,
                    )
                    .values(values)
                    .returning({
                        id:
                            crmQuotes.id,
                        quoteNumber:
                            crmQuotes.quoteNumber,
                    });

            quoteId =
                createdQuote?.id;
        }

        if (!quoteId) {
            continue;
        }

        quotes.push({
            id: quoteId,
            number:
                definition.number,
        });

        const [existingItem] =
            await db
                .select({
                    id:
                        crmQuoteItems.id,
                })
                .from(
                    crmQuoteItems,
                )
                .where(
                    and(
                        eq(
                            crmQuoteItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuoteItems
                                .quoteId,
                            quoteId,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            await db
                .update(
                    crmQuoteItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: "1",
                    unitPrice:
                        definition.total,
                    baseAmount:
                        definition.total,
                    totalAmount:
                        definition.total,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmQuoteItems.id,
                        existingItem.id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmQuoteItems,
                )
                .values({
                    tenantId,
                    quoteId,
                    productId:
                        product.id,
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice:
                        definition.total,
                    baseAmount:
                        definition.total,
                    discountAmount:
                        "0",
                    taxRate:
                        "0",
                    taxAmount:
                        "0",
                    totalAmount:
                        definition.total,
                    paymentMethod:
                        "Financiamiento",
                    customerDownPayment:
                        "0",
                    position: 0,
                });
        }
    }

        /*
     * ============================================================
     * COTIZACIONES ADICIONALES
     * ============================================================
     */

    for (
        let index = 4;
        index < 200;
        index += 1
    ) {
        const customer =
            customers[
                index %
                    customers.length
            ];

        const deal =
            deals[
                index %
                    deals.length
            ];

        const product =
            products[
                index %
                    products.length
            ];

        const quoteNumber =
            `COT-DEMO-${String(
                index + 1,
            ).padStart(
                4,
                "0",
            )}`;

        const totalAmount =
            product.name ===
            "Servicio Demo"
                ? "2500"
                : product.name ===
                    "Producto Demo Premium"
                  ? "175000"
                  : "90000";

        const status =
            index % 5 ===
            0
                ? "Aceptada"
                : index % 5 ===
                    1
                  ? "Enviada"
                  : "Borrador";

        const [
            existingQuote,
        ] =
            await db
                .select({
                    id:
                        crmQuotes.id,
                })
                .from(
                    crmQuotes,
                )
                .where(
                    and(
                        eq(
                            crmQuotes
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuotes
                                .quoteNumber,
                            quoteNumber,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            branchId:
                branches[
                    index %
                        branches.length
                ].id,
            quoteNumber,
            subject:
                `Cotización Demo ${index + 1} - ${customer.name} ${customer.lastName ?? ""}`.trim(),
            status,
            customerId:
                customer.id,
            sourceLeadId:
                undefined,
            dealId:
                deal.id,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            currency:
                "mxn",
            validUntil:
                new Date(
                    now.getTime() +
                        1000 *
                            60 *
                            60 *
                            24 *
                            (15 +
                                (index %
                                    30)),
                ),
            baseAmount:
                totalAmount,
            discountAmount:
                "0",
            taxAmount:
                "0",
            adjustmentAmount:
                "0",
            totalAmount,
            paymentMethod:
                index % 3 ===
                0
                    ? "Financiamiento"
                    : "Contado",
            commercialSummary:
                "Cotización generada para demostración del flujo comercial.",
            termsAndConditions:
                "Precios sujetos a disponibilidad.",
            description:
                "Documento de cotización demo.",
        };

        let quoteId:
            string | undefined;

        if (existingQuote) {
            await db
                .update(
                    crmQuotes,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmQuotes.id,
                        existingQuote.id,
                    ),
                );

            quoteId =
                existingQuote.id;
        } else {
            const [
                createdQuote,
            ] = await db
                .insert(
                    crmQuotes,
                )
                .values(
                    values,
                )
                .returning({
                    id:
                        crmQuotes.id,
                    quoteNumber:
                        crmQuotes.quoteNumber,
                });

            quoteId =
                createdQuote?.id;
        }

        if (!quoteId) {
            continue;
        }

        quotes.push({
            id: quoteId,
            number:
                quoteNumber,
        });

        const [
            existingItem,
        ] =
            await db
                .select({
                    id:
                        crmQuoteItems.id,
                })
                .from(
                    crmQuoteItems,
                )
                .where(
                    and(
                        eq(
                            crmQuoteItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuoteItems
                                .quoteId,
                            quoteId,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            await db
                .update(
                    crmQuoteItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: "1",
                    unitPrice:
                        totalAmount,
                    baseAmount:
                        totalAmount,
                    discountAmount:
                        "0",
                    taxRate:
                        "0",
                    taxAmount:
                        "0",
                    totalAmount,
                    paymentMethod:
                        index % 3 ===
                        0
                            ? "Financiamiento"
                            : "Contado",
                    customerDownPayment:
                        "0",
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmQuoteItems.id,
                        existingItem.id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmQuoteItems,
                )
                .values({
                    tenantId,
                    quoteId,
                    productId:
                        product.id,
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice:
                        totalAmount,
                    baseAmount:
                        totalAmount,
                    discountAmount:
                        "0",
                    taxRate:
                        "0",
                    taxAmount:
                        "0",
                    totalAmount,
                    paymentMethod:
                        index % 3 ===
                        0
                            ? "Financiamiento"
                            : "Contado",
                    customerDownPayment:
                        "0",
                    position: 0,
                });
        }
    }

    /*
     * ============================================================
     * PROMOCIONES DE COTIZACIONES
     * ============================================================
     */

    if (
        quotes[0] &&
        promotions[0]
    ) {
        const [
            quoteItem,
        ] =
            await db
                .select({
                    id:
                        crmQuoteItems.id,
                })
                .from(
                    crmQuoteItems,
                )
                .where(
                    and(
                        eq(
                            crmQuoteItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuoteItems
                                .quoteId,
                            quotes[0].id,
                        ),
                    ),
                )
                .limit(1);

        const [
            existingPromotion,
        ] =
            await db
                .select({
                    id:
                        crmQuotePromotions
                            .id,
                })
                .from(
                    crmQuotePromotions,
                )
                .where(
                    and(
                        eq(
                            crmQuotePromotions
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmQuotePromotions
                                .quoteId,
                            quotes[0].id,
                        ),
                    ),
                )
                .limit(1);

        if (
            !existingPromotion
        ) {
            await db
                .insert(
                    crmQuotePromotions,
                )
                .values({
                    tenantId,
                    quoteId:
                        quotes[0].id,
                    quoteItemId:
                        quoteItem?.id,
                    promotionId:
                        promotions[0].id,
                    scope: "item",
                    promotionName:
                        promotions[0].name,
                    promotionGroup:
                        "Financiamiento",
                    benefitType:
                        "Porcentaje",
                    paymentMethod:
                        "Financiamiento",
                    requiresSelection:
                        false,
                    promotionValue:
                        "10",
                    calculatedBenefit:
                        "10000",
                });
        }
    }

    /*
     * ============================================================
     * ÓRDENES DE VENTA
     * ============================================================
     */

    const salesDefinitions = [
        {
            reference:
                "OV-DEMO-0001",
            customerIndex: 0,
            dealIndex: 0,
            quoteIndex: 0,
            branchIndex: 0,
            productIndex: 0,
            total:
                "175000.00",
            status:
                "Confirmada",
        },
        {
            reference:
                "OV-DEMO-0002",
            customerIndex: 4,
            dealIndex: 2,
            quoteIndex: 2,
            branchIndex: 0,
            productIndex: 0,
            total:
                "525000.00",
            status:
                "Entregada",
        },
        {
            reference:
                "OV-DEMO-0003",
            customerIndex: 2,
            dealIndex: 4,
            quoteIndex: 3,
            branchIndex: 0,
            productIndex: 2,
            total:
                "2500.00",
            status:
                "Entregada",
        },
    ];

    const salesOrders = [];

    for (
        const definition of salesDefinitions
    ) {
        const customer =
            customers[
                definition
                    .customerIndex
            ];

        const deal =
            deals[
                definition.dealIndex
            ];

        const quote =
            quotes[
                definition.quoteIndex
            ];

        const [existingOrder] =
            await db
                .select({
                    id:
                        crmSalesOrders.id,
                })
                .from(
                    crmSalesOrders,
                )
                .where(
                    and(
                        eq(
                            crmSalesOrders
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmSalesOrders
                                .reference,
                            definition
                                .reference,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            branchId:
                branches[
                    definition
                        .branchIndex
                ].id,
            customerId:
                customer?.id,
            dealId:
                deal?.id,
            quoteId:
                quote?.id,
            reference:
                definition.reference,
            status:
                definition.status,
            customerName:
                customer
                    ? `${customer.name} ${customer.lastName ?? ""}`.trim()
                    : "Cliente Demo",
            customerEmail:
                undefined,
            customerPhone:
                undefined,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            currency: "mxn",
            baseAmount:
                definition.total,
            discountAmount:
                "0",
            totalAmount:
                definition.total,
            paymentMethod:
                "Transferencia",
            notes:
                "Orden de venta creada para el demo.",
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        let orderId:
            string | undefined;

        if (existingOrder) {
            await db
                .update(
                    crmSalesOrders,
                )
                .set({
                    ...values,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmSalesOrders.id,
                        existingOrder.id,
                    ),
                );

            orderId =
                existingOrder.id;
        } else {
            const [createdOrder] =
                await db
                    .insert(
                        crmSalesOrders,
                    )
                    .values(values)
                    .returning({
                        id:
                            crmSalesOrders.id,
                    });

            orderId =
                createdOrder?.id;
        }

        if (!orderId) {
            continue;
        }

        salesOrders.push({
            id: orderId,
        });

        const [existingItem] =
            await db
                .select({
                    id:
                        crmSalesOrderItems.id,
                })
                .from(
                    crmSalesOrderItems,
                )
                .where(
                    and(
                        eq(
                            crmSalesOrderItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmSalesOrderItems
                                .salesOrderId,
                            orderId,
                        ),
                    ),
                )
                .limit(1);

        const product =
            products[
                definition
                    .productIndex
            ];

        if (existingItem) {
            await db
                .update(
                    crmSalesOrderItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: 1,
                    unitPrice:
                        definition.total,
                    discountAmount:
                        "0",
                    totalAmount:
                        definition.total,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmSalesOrderItems.id,
                        existingItem.id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmSalesOrderItems,
                )
                .values({
                    tenantId,
                    salesOrderId:
                        orderId,
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: 1,
                    unitPrice:
                        definition.total,
                    discountAmount:
                        "0",
                    totalAmount:
                        definition.total,
                    position: 0,
                });
        }
    }

    /*
     * ============================================================
     * ÓRDENES DE VENTA ADICIONALES
     * ============================================================
     */

    for (
        let index = 3;
        index < 200;
        index += 1
    ) {
        const customer =
            customers[
                index %
                    customers.length
            ];

        const deal =
            deals[
                index === 3
                    ? 1
                    : index === 4
                      ? 3
                      : index
            ];

        const quote =
            quotes[
                index === 3
                    ? 1
                    : index
            ];

        const product =
            products[
                index %
                    products.length
            ];

        const reference =
            `OV-DEMO-${String(
                index + 1,
            ).padStart(
                4,
                "0",
            )}`;

        const totalAmount =
            product.name ===
            "Servicio Demo"
                ? "2500"
                : product.name ===
                    "Producto Demo Premium"
                  ? "175000"
                  : "90000";

        const status =
            index % 4 ===
            0
                ? "Completada"
                : index % 4 ===
                    1
                  ? "Confirmada"
                  : "Pendiente";

        const [
            existingOrder,
        ] =
            await db
                .select({
                    id:
                        crmSalesOrders.id,
                })
                .from(
                    crmSalesOrders,
                )
                .where(
                    and(
                        eq(
                            crmSalesOrders
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmSalesOrders
                                .reference,
                            reference,
                        ),
                    ),
                )
                .limit(1);

        const values = {
            tenantId,
            branchId:
                branches[
                    index %
                        branches.length
                ].id,
            customerId:
                customer.id,
            dealId:
                deal.id,
            quoteId:
                quote.id,
            reference,
            status,
            customerName:
                `${customer.name} ${customer.lastName ?? ""}`.trim(),
            customerEmail:
                undefined,
            customerPhone:
                undefined,
            ownerClerkUserId:
                DEMO_USER_ID,
            ownerName:
                DEMO_USER_NAME,
            ownerEmail:
                DEMO_USER_EMAIL,
            currency:
                "mxn",
            baseAmount:
                totalAmount,
            discountAmount:
                "0",
            totalAmount,
            paymentMethod:
                index % 3 ===
                0
                    ? "Financiamiento"
                    : "Transferencia",
            notes:
                "Orden de venta creada para demostrar el flujo comercial.",
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        let orderId:
            string | undefined;

        if (existingOrder) {
            await db
                .update(
                    crmSalesOrders,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmSalesOrders.id,
                        existingOrder.id,
                    ),
                );

            orderId =
                existingOrder.id;
        } else {
            const [
                createdOrder,
            ] = await db
                .insert(
                    crmSalesOrders,
                )
                .values(
                    values,
                )
                .returning({
                    id:
                        crmSalesOrders.id,
                });

            orderId =
                createdOrder?.id;
        }

        if (!orderId) {
            continue;
        }

        salesOrders.push({
            id: orderId,
        });

        const [
            existingItem,
        ] =
            await db
                .select({
                    id:
                        crmSalesOrderItems.id,
                })
                .from(
                    crmSalesOrderItems,
                )
                .where(
                    and(
                        eq(
                            crmSalesOrderItems
                                .tenantId,
                            tenantId,
                        ),
                        eq(
                            crmSalesOrderItems
                                .salesOrderId,
                            orderId,
                        ),
                    ),
                )
                .limit(1);

        if (existingItem) {
            await db
                .update(
                    crmSalesOrderItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: 1,
                    unitPrice:
                        totalAmount,
                    discountAmount:
                        "0",
                    totalAmount,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmSalesOrderItems.id,
                        existingItem.id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmSalesOrderItems,
                )
                .values({
                    tenantId,
                    salesOrderId:
                        orderId,
                    productId:
                        product.id,
                    name:
                        product.name,
                    quantity: 1,
                    unitPrice:
                        totalAmount,
                    discountAmount:
                        "0",
                    totalAmount,
                    position: 0,
                });
        }
    }

    /*
     * ============================================================
     * ÓRDENES DE SERVICIO
     * ============================================================
     */

    const serviceDefinitions = [
        {
            reference:
                "OS-DEMO-0001",
            customerIndex: 0,
            dealIndex: 0,
            salesOrderIndex: 0,
            branchIndex: 0,
            status:
                "En proceso",
            serviceType:
                "Mantenimiento preventivo",
            unitModel:
                "Moto Demo Premium",
            unitPlate:
                "DEMO-001",
            unitPrice:
                "2500.00",
            reportedProblem:
                "Servicio preventivo de 10,000 km.",
            diagnosis:
                "Mantenimiento programado.",
            result:
                "Revisión general y cambio de consumibles.",
        },
        {
            reference:
                "OS-DEMO-0002",
            customerIndex: 2,
            dealIndex: 4,
            salesOrderIndex: 2,
            branchIndex: 0,
            status:
                "Completada",
            serviceType:
                "Mantenimiento preventivo",
            unitModel:
                "Moto Demo Premium",
            unitPlate:
                "DEMO-002",
            unitPrice:
                "2500.00",
            reportedProblem:
                "Servicio preventivo posterior a compra.",
            diagnosis:
                "Unidad en condiciones normales.",
            result:
                "Servicio realizado correctamente.",
        },
        {
            reference:
                "OS-DEMO-0003",
            customerIndex: 4,
            dealIndex: 2,
            salesOrderIndex: 1,
            branchIndex: 0,
            status:
                "Programada",
            serviceType:
                "Entrega y preparación",
            unitModel:
                "Moto Demo Premium",
            unitPlate:
                "DEMO-003",
            unitPrice:
                "2500.00",
            reportedProblem:
                "Preparación de unidad para entrega.",
            diagnosis:
                "Unidad lista para inspección final.",
            result:
                "Pendiente de entrega al cliente.",
        },
    ];

    const serviceOrders = [];

    for (
        const definition of serviceDefinitions
    ) {
        const customer =
            customers[
                definition
                    .customerIndex
            ];

        const deal =
            deals[
                definition
                    .dealIndex
            ];

        const salesOrder =
            salesOrders[
                definition
                    .salesOrderIndex
            ];

        const branch =
            branches[
                definition
                    .branchIndex
            ];

        const [
            existingServiceOrder,
        ] = await db
            .select({
                id:
                    crmServiceOrders.id,
            })
            .from(
                crmServiceOrders,
            )
            .where(
                and(
                    eq(
                        crmServiceOrders
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmServiceOrders
                            .reference,
                        definition
                            .reference,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            branchId:
                branch?.id,
            customerId:
                customer?.id,
            dealId:
                deal?.id,
            salesOrderId:
                salesOrder?.id,
            reference:
                definition.reference,
            status:
                definition.status,
            customerName:
                customer
                    ? `${customer.name} ${customer.lastName ?? ""}`.trim()
                    : "Cliente Demo",
            ownerClerkUserId:
                DEMO_USER_ID,
            assignedToClerkUserId:
                DEMO_USER_ID,
            assignedToName:
                DEMO_USER_NAME,
            assignedToEmail:
                DEMO_USER_EMAIL,
            ownerEmail:
                DEMO_USER_EMAIL,
            serviceType:
                definition.serviceType,
            unitModel:
                definition.unitModel,
            unitPlate:
                definition.unitPlate,
            reportedProblem:
                definition.reportedProblem,
            diagnosis:
                definition.diagnosis,
            result:
                definition.result,
            notes:
                "Orden de servicio creada para demostrar el flujo postventa.",
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        let serviceOrderId:
            string | undefined;

        if (
            existingServiceOrder
        ) {
            await db
                .update(
                    crmServiceOrders,
                )
                .set({
                    ...values,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmServiceOrders.id,
                        existingServiceOrder.id,
                    ),
                );

            serviceOrderId =
                existingServiceOrder.id;
        } else {
            const [
                createdServiceOrder,
            ] = await db
                .insert(
                    crmServiceOrders,
                )
                .values(values)
                .returning({
                    id:
                        crmServiceOrders.id,
                });

            serviceOrderId =
                createdServiceOrder?.id;
        }

        if (!serviceOrderId) {
            continue;
        }

        serviceOrders.push({
            id:
                serviceOrderId,
        });

        const [
            existingServiceItem,
        ] = await db
            .select({
                id:
                    crmServiceOrderItems.id,
            })
            .from(
                crmServiceOrderItems,
            )
            .where(
                and(
                    eq(
                        crmServiceOrderItems
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmServiceOrderItems
                            .serviceOrderId,
                        serviceOrderId,
                    ),
                ),
            )
            .limit(1);

        const product =
            products[2];

        if (
            existingServiceItem
        ) {
            await db
                .update(
                    crmServiceOrderItems,
                )
                .set({
                    productId:
                        product.id,
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice:
                        definition.unitPrice,
                    totalAmount:
                        definition.unitPrice,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmServiceOrderItems
                            .id,
                        existingServiceItem
                            .id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmServiceOrderItems,
                )
                .values({
                    tenantId,
                    serviceOrderId,
                    productId:
                        product.id,
                    itemType:
                        "Producto",
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice:
                        definition.unitPrice,
                    totalAmount:
                        definition.unitPrice,
                    position: 0,
                });
        }
    }

    /*
     * ============================================================
     * ÓRDENES DE SERVICIO ADICIONALES
     * ============================================================
     */

    for (
        let index = 3;
        index < 200;
        index += 1
    ) {
        const customer =
            customers[
                index %
                    customers.length
            ];

        const deal =
            deals[
                index %
                    deals.length
            ];

        const salesOrder =
            salesOrders[index];

        const branch =
            branches[
                index %
                    branches.length
            ];

        const reference =
            `OS-DEMO-${String(
                index + 1,
            ).padStart(
                4,
                "0",
            )}`;

        const serviceStatuses = [
            "Pendiente",
            "En proceso",
            "Completada",
            "Entregada",
        ];

        const status =
            serviceStatuses[
                index %
                    serviceStatuses.length
            ];

        const [
            existingServiceOrder,
        ] = await db
            .select({
                id:
                    crmServiceOrders.id,
            })
            .from(
                crmServiceOrders,
            )
            .where(
                and(
                    eq(
                        crmServiceOrders
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmServiceOrders
                            .reference,
                        reference,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            branchId:
                branch?.id,
            customerId:
                customer?.id,
            dealId:
                deal?.id,
            salesOrderId:
                salesOrder?.id,
            reference,
            status,
            customerName:
                customer
                    ? `${customer.name} ${customer.lastName ?? ""}`.trim()
                    : "Cliente Demo",
            ownerClerkUserId:
                DEMO_USER_ID,
            assignedToClerkUserId:
                DEMO_USER_ID,
            assignedToName:
                DEMO_USER_NAME,
            assignedToEmail:
                DEMO_USER_EMAIL,
            ownerEmail:
                DEMO_USER_EMAIL,
            serviceType:
                index % 3 ===
                0
                    ? "Servicio preventivo"
                    : index % 3 ===
                        1
                      ? "Mantenimiento"
                      : "Diagnóstico",
            unitModel:
                `Moto Demo ${(
                    (index %
                        5) +
                    1
                )}`,
            unitPlate:
                `DEMO-${String(
                    index + 1,
                ).padStart(
                    4,
                    "0",
                )}`,
            reportedProblem:
                index % 2 ===
                0
                    ? "Servicio programado de mantenimiento."
                    : "Revisión general de la unidad.",
            diagnosis:
                status ===
                "Pendiente"
                    ? null
                    : "Unidad revisada conforme al procedimiento de servicio.",
            result:
                status ===
                    "Completada" ||
                status ===
                    "Entregada"
                    ? "Servicio realizado correctamente."
                    : null,
            notes:
                "Orden de servicio creada para demostrar el flujo postventa.",
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        let serviceOrderId:
            string | undefined;

        if (
            existingServiceOrder
        ) {
            await db
                .update(
                    crmServiceOrders,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmServiceOrders.id,
                        existingServiceOrder.id,
                    ),
                );

            serviceOrderId =
                existingServiceOrder.id;
        } else {
            const [
                createdServiceOrder,
            ] = await db
                .insert(
                    crmServiceOrders,
                )
                .values(
                    values,
                )
                .returning({
                    id:
                        crmServiceOrders.id,
                });

            serviceOrderId =
                createdServiceOrder?.id;
        }

        if (!serviceOrderId) {
            continue;
        }

        serviceOrders.push({
            id:
                serviceOrderId,
        });

        const product =
            products[2];

        const [
            existingServiceItem,
        ] = await db
            .select({
                id:
                    crmServiceOrderItems.id,
            })
            .from(
                crmServiceOrderItems,
            )
            .where(
                and(
                    eq(
                        crmServiceOrderItems
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmServiceOrderItems
                            .serviceOrderId,
                        serviceOrderId,
                    ),
                ),
            )
            .limit(1);

        const unitPrice =
            "2500.00";

        if (
            existingServiceItem
        ) {
            await db
                .update(
                    crmServiceOrderItems,
                )
                .set({
                    productId:
                        product.id,
                    itemType:
                        "Producto",
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice,
                    totalAmount:
                        unitPrice,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmServiceOrderItems
                            .id,
                        existingServiceItem
                            .id,
                    ),
                );
        } else {
            await db
                .insert(
                    crmServiceOrderItems,
                )
                .values({
                    tenantId,
                    serviceOrderId,
                    productId:
                        product.id,
                    itemType:
                        "Producto",
                    name:
                        product.name,
                    description:
                        product.description ??
                        null,
                    quantity: "1",
                    unitPrice,
                    totalAmount:
                        unitPrice,
                    position: 0,
                });
        }
    }

    /*
     * ============================================================
     * ACTIVIDADES
     * ============================================================
     */

    const activityDefinitions = [
        {
            subject:
                "Llamar a Carlos Ramírez",
            type:
                "call",
            status:
                "Pendiente",
            priority:
                "Alta",
            customerIndex: 0,
            leadIndex: 0,
            dealIndex: 0,
            branchIndex: 0,
            daysFromNow: 1,
        },
        {
            subject:
                "Reunión con Mariana Torres",
            type:
                "meeting",
            status:
                "Pendiente",
            priority:
                "Media",
            customerIndex: 1,
            leadIndex: 1,
            dealIndex: 1,
            branchIndex: 1,
            daysFromNow: 2,
        },
        {
            subject:
                "Enviar propuesta Grupo Motors",
            type:
                "task",
            status:
                "Completada",
            priority:
                "Alta",
            customerIndex: 4,
            leadIndex: null,
            dealIndex: 2,
            branchIndex: 0,
            daysFromNow: -2,
        },
        {
            subject:
                "Confirmar servicio Jorge Mendoza",
            type:
                "call",
            status:
                "Pendiente",
            priority:
                "Media",
            customerIndex: 2,
            leadIndex: 2,
            dealIndex: 4,
            branchIndex: 0,
            daysFromNow: 3,
        },
        {
            subject:
                "Preparar entrega unidad DEMO-003",
            type:
                "task",
            status:
                "Pendiente",
            priority:
                "Alta",
            customerIndex: 4,
            leadIndex: null,
            dealIndex: 2,
            branchIndex: 0,
            daysFromNow: 4,
        },
    ];

    const activities = [];

    for (
        const definition of activityDefinitions
    ) {
        const customer =
            customers[
                definition
                    .customerIndex
            ];

        const lead =
            definition.leadIndex !==
            null
                ? leads[
                      definition
                          .leadIndex
                  ]
                : undefined;

        const deal =
            deals[
                definition
                    .dealIndex
            ];

        const branch =
            branches[
                definition
                    .branchIndex
            ];

        const scheduledAt =
            new Date(
                now.getTime() +
                    definition.daysFromNow *
                        24 *
                        60 *
                        60 *
                        1000,
            );

        const startAt =
            definition.type ===
            "meeting"
                ? scheduledAt
                : null;

        const endAt =
            definition.type ===
            "meeting"
                ? new Date(
                      scheduledAt.getTime() +
                          60 *
                              60 *
                              1000,
                  )
                : null;

        const dueAt =
            definition.type !==
            "meeting"
                ? scheduledAt
                : null;

        const [
            existingActivity,
        ] = await db
            .select({
                id:
                    crmActivities.id,
            })
            .from(
                crmActivities,
            )
            .where(
                and(
                    eq(
                        crmActivities
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmActivities
                            .subject,
                        definition.subject,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            branchId:
                branch?.id,
            type:
                definition.type,
            subject:
                definition.subject,
            description:
                `Actividad demo relacionada con ${customer?.name ?? "cliente"}.`,
            status:
                definition.status,
            priority:
                definition.priority,
                startAt,
                endAt,
                dueAt,
                completedAt:
                definition.status ===
                "Completada"
                    ? scheduledAt
                    : null,
            customerId:
                customer?.id,
            leadId:
                lead?.id,
            dealId:
                deal?.id,
            ownerClerkUserId:
                DEMO_USER_ID,
            assignedToClerkUserId:
                DEMO_USER_ID,
            assignedToName:
                DEMO_USER_NAME,
            assignedToEmail:
                DEMO_USER_EMAIL,
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        if (
            existingActivity
        ) {
            const [
                updatedActivity,
            ] = await db
                .update(
                    crmActivities,
                )
                .set({
                    ...values,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmActivities.id,
                        existingActivity.id,
                    ),
                )
                .returning({
                    id:
                        crmActivities.id,
                    subject:
                        crmActivities.subject,
                });

            if (
                updatedActivity
            ) {
                activities.push(
                    updatedActivity,
                );
            }

            continue;
        }

        const [
            createdActivity,
        ] = await db
            .insert(
                crmActivities,
            )
            .values(values)
            .returning({
                id:
                    crmActivities.id,
                subject:
                    crmActivities.subject,
            });

        if (
            createdActivity
        ) {
            activities.push(
                createdActivity,
            );
        }
    }

    /*
     * ============================================================
     * ACTIVIDADES ADICIONALES
     * ============================================================
     */

    for (
        let index = 5;
        index < 200;
        index += 1
    ) {
        const customer =
            customers[
                index %
                    customers.length
            ];

        const lead =
            leads[
                index %
                    leads.length
            ];

        const deal =
            deals[
                index %
                    deals.length
            ];

        const branch =
            branches[
                index %
                    branches.length
            ];

        const activityTypes = [
            "task",
            "call",
            "meeting",
        ];

        const activityStatuses = [
            "Pendiente",
            "Pendiente",
            "Completada",
        ];

        const activityPriorities = [
            "Alta",
            "Media",
            "Baja",
        ];

        const type =
            activityTypes[
                index %
                    activityTypes.length
            ];

        const status =
            activityStatuses[
                index %
                    activityStatuses.length
            ];

        const priority =
            activityPriorities[
                index %
                    activityPriorities.length
            ];

        const typeLabel =
            type === "task"
                ? "Tarea"
                : type === "call"
                  ? "Llamada"
                  : "Reunión";

        const subject =
            `${typeLabel} Demo ${String(
                index + 1,
            ).padStart(
                3,
                "0",
            )} - ${customer.name} ${customer.lastName ?? ""}`.trim();

        const daysOffset =
            index < 15
                ? -(index + 1)
                : (index % 30) + 1;

        const scheduledAt =
            new Date(
                now.getTime() +
                    daysOffset *
                        24 *
                        60 *
                        60 *
                        1000,
            );

        const [
            existingActivity,
        ] = await db
            .select({
                id:
                    crmActivities.id,
            })
            .from(
                crmActivities,
            )
            .where(
                and(
                    eq(
                        crmActivities
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmActivities
                            .subject,
                        subject,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            branchId:
                branch?.id,
            type,
            subject,
            description:
                `Actividad demo relacionada con ${customer.name ?? "cliente"}.`,
            status,
            priority,
            scheduledAt,
            completedAt:
                status ===
                "Completada"
                    ? scheduledAt
                    : null,
            customerId:
                customer?.id,
            leadId:
                lead?.id,
            dealId:
                deal?.id,
            ownerClerkUserId:
                DEMO_USER_ID,
            assignedToClerkUserId:
                DEMO_USER_ID,
            assignedToName:
                DEMO_USER_NAME,
            assignedToEmail:
                DEMO_USER_EMAIL,
            createdByClerkUserId:
                DEMO_USER_ID,
            createdByName:
                DEMO_USER_NAME,
        };

        if (
            existingActivity
        ) {
            const [
                updatedActivity,
            ] = await db
                .update(
                    crmActivities,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmActivities.id,
                        existingActivity.id,
                    ),
                )
                .returning({
                    id:
                        crmActivities.id,
                    subject:
                        crmActivities.subject,
                });

            if (
                updatedActivity
            ) {
                activities.push(
                    updatedActivity,
                );
            }

            continue;
        }

        const [
            createdActivity,
        ] = await db
            .insert(
                crmActivities,
            )
            .values(values)
            .returning({
                id:
                    crmActivities.id,
                subject:
                    crmActivities.subject,
            });

        if (
            createdActivity
        ) {
            activities.push(
                createdActivity,
            );
        }
    }

    /*
     * ============================================================
     * PARTICIPANTES DE ACTIVIDADES
     * ============================================================
     */

    for (
        const activity of activities
    ) {
        const [
            existingParticipant,
        ] = await db
            .select({
                id:
                    crmActivityParticipants.id,
            })
            .from(
                crmActivityParticipants,
            )
            .where(
                and(
                    eq(
                        crmActivityParticipants
                            .activityId,
                        activity.id,
                    ),
                    eq(
                        crmActivityParticipants
                            .referenceId,
                        DEMO_USER_ID,
                    ),
                ),
            )
            .limit(1);

        if (
            existingParticipant
        ) {
            continue;
        }

        await db
            .insert(
                crmActivityParticipants,
            )
            .values({
                tenantId,
                activityId:
                    activity.id,
                referenceId:
                    DEMO_USER_ID,
                name:
                    DEMO_USER_NAME,
                email:
                    DEMO_USER_EMAIL,
            });
    }

    /*
     * ============================================================
     * DOCUMENTOS
     * ============================================================
     */

    const documentDefinitions = [
        {
            name:
                "Cotización Moto Premium",
            originalFileName:
                "cotizacion-moto-premium.pdf",
            category:
                "Cotizaciones",
            mimeType:
                "application/pdf",
            extension:
                "pdf",
            sizeBytes:
                245760,
            storageKey:
                `demo/${tenantId}/cotizacion-moto-premium.pdf`,
            entityType:
                "quote",
            entityIndex: 0,
        },
        {
            name:
                "Orden de Servicio DEMO-001",
            originalFileName:
                "orden-servicio-demo-001.pdf",
            category:
                "Órdenes de servicio",
            mimeType:
                "application/pdf",
            extension:
                "pdf",
            sizeBytes:
                184320,
            storageKey:
                `demo/${tenantId}/orden-servicio-demo-001.pdf`,
            entityType:
                "service_order",
            entityIndex: 0,
        },
        {
            name:
                "Ficha Cliente Carlos Ramírez",
            originalFileName:
                "ficha-carlos-ramirez.pdf",
            category:
                "Clientes",
            mimeType:
                "application/pdf",
            extension:
                "pdf",
            sizeBytes:
                132096,
            storageKey:
                `demo/${tenantId}/ficha-carlos-ramirez.pdf`,
            entityType:
                "customer",
            entityIndex: 0,
        },
    ];

    const documents = [];

    for (
        const definition of documentDefinitions
    ) {
        const [
            existingDocument,
        ] = await db
            .select({
                id:
                    crmDocuments.id,
            })
            .from(
                crmDocuments,
            )
            .where(
                and(
                    eq(
                        crmDocuments
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmDocuments
                            .storageKey,
                        definition
                            .storageKey,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            name:
                definition.name,
            originalFileName:
                definition.originalFileName,
            description:
                "Documento generado para demostración del CRM.",
            category:
                definition.category,
            mimeType:
                definition.mimeType,
            extension:
                definition.extension,
            sizeBytes:
                definition.sizeBytes,
            storageProvider:
                "r2",
            storageKey:
                definition.storageKey,
            checksum:
                `demo-${definition.storageKey}`,
            status:
                "active",
            version: 1,
            uploadedByClerkUserId:
                DEMO_USER_ID,
            uploadedByName:
                DEMO_USER_NAME,
            uploadedByEmail:
                DEMO_USER_EMAIL,
            metadata: {
                demo: true,
            },
        };

        let documentId:
            string | undefined;

        if (
            existingDocument
        ) {
            await db
                .update(
                    crmDocuments,
                )
                .set({
                    ...values,
                    updatedAt: now,
                })
                .where(
                    eq(
                        crmDocuments.id,
                        existingDocument.id,
                    ),
                );

            documentId =
                existingDocument.id;
        } else {
            const [
                createdDocument,
            ] = await db
                .insert(
                    crmDocuments,
                )
                .values(values)
                .returning({
                    id:
                        crmDocuments.id,
                });

            documentId =
                createdDocument?.id;
        }

        if (!documentId) {
            continue;
        }

        documents.push({
            id:
                documentId,
            entityType:
                definition.entityType,
            entityIndex:
                definition.entityIndex,
        });
    }

    /*
     * ============================================================
     * DOCUMENTOS ADICIONALES
     * ============================================================
     */

    for (
        let index = 3;
        index < 200;
        index += 1
    ) {
        const documentIndex =
            index + 1;

        let entityType:
            | "customer"
            | "quote"
            | "service_order";

        let entityIndex:
            number;

        if (
            index < 70
        ) {
            entityType =
                "customer";
            entityIndex =
                index;
        } else if (
            index < 135
        ) {
            entityType =
                "quote";
            entityIndex =
                index - 70;
        } else {
            entityType =
                "service_order";
            entityIndex =
                index - 135;
        }

        const storageKey =
            `demo/${tenantId}/documento-demo-${String(
                documentIndex,
            ).padStart(
                4,
                "0",
            )}.pdf`;

        const name =
            `Documento Demo ${String(
                documentIndex,
            ).padStart(
                4,
                "0",
            )}`;

        const category =
            entityType ===
            "customer"
                ? "Clientes"
                : entityType ===
                    "quote"
                  ? "Cotizaciones"
                  : "Órdenes de servicio";

        const [
            existingDocument,
        ] = await db
            .select({
                id:
                    crmDocuments.id,
            })
            .from(
                crmDocuments,
            )
            .where(
                and(
                    eq(
                        crmDocuments
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmDocuments
                            .storageKey,
                        storageKey,
                    ),
                ),
            )
            .limit(1);

        const values = {
            tenantId,
            name,
            originalFileName:
                `documento-demo-${String(
                    documentIndex,
                ).padStart(
                    4,
                    "0",
                )}.pdf`,
            description:
                "Documento generado para demostración del CRM.",
            category,
            mimeType:
                "application/pdf",
            extension:
                "pdf",
            sizeBytes:
                150000 +
                index * 1024,
            storageProvider:
                "r2",
            storageKey,
            checksum:
                `demo-${storageKey}`,
            status:
                "active",
            version: 1,
            uploadedByClerkUserId:
                DEMO_USER_ID,
            uploadedByName:
                DEMO_USER_NAME,
            uploadedByEmail:
                DEMO_USER_EMAIL,
            metadata: {
                demo: true,
            },
        };

        let documentId:
            string | undefined;

        if (
            existingDocument
        ) {
            await db
                .update(
                    crmDocuments,
                )
                .set({
                    ...values,
                    updatedAt:
                        now,
                })
                .where(
                    eq(
                        crmDocuments.id,
                        existingDocument.id,
                    ),
                );

            documentId =
                existingDocument.id;
        } else {
            const [
                createdDocument,
            ] = await db
                .insert(
                    crmDocuments,
                )
                .values(
                    values,
                )
                .returning({
                    id:
                        crmDocuments.id,
                });

            documentId =
                createdDocument?.id;
        }

        if (!documentId) {
            continue;
        }

        documents.push({
            id:
                documentId,
            entityType,
            entityIndex,
        });
    }

    /*
     * ============================================================
     * RELACIONES DE DOCUMENTOS
     * ============================================================
     */

    for (
        const document of documents
    ) {
        let entityId:
            string | undefined;

        let entityName:
            string | undefined;

        if (
            document.entityType ===
            "quote"
        ) {
            entityId =
                quotes[
                    document
                        .entityIndex
                ]?.id;

            entityName =
                quotes[
                    document
                        .entityIndex
                ]?.number;
        }

        if (
            document.entityType ===
            "service_order"
        ) {
            entityId =
                serviceOrders[
                    document
                        .entityIndex
                ]?.id;

            entityName =
                serviceDefinitions[
                    document
                        .entityIndex
                ]?.reference;
        }

        if (
            document.entityType ===
            "customer"
        ) {
            entityId =
                customers[
                    document
                        .entityIndex
                ]?.id;

            const customer =
                customers[
                    document
                        .entityIndex
                ];

            entityName =
                customer
                    ? `${customer.name} ${customer.lastName ?? ""}`.trim()
                    : undefined;
        }

        if (!entityId) {
            continue;
        }

        const [
            existingRelation,
        ] = await db
            .select({
                id:
                    crmDocumentRelations.id,
            })
            .from(
                crmDocumentRelations,
            )
            .where(
                and(
                    eq(
                        crmDocumentRelations
                            .tenantId,
                        tenantId,
                    ),
                    eq(
                        crmDocumentRelations
                            .documentId,
                        document.id,
                    ),
                    eq(
                        crmDocumentRelations
                            .entityType,
                        document.entityType,
                    ),
                    eq(
                        crmDocumentRelations
                            .entityId,
                        entityId,
                    ),
                ),
            )
            .limit(1);

        if (
            existingRelation
        ) {
            continue;
        }

        await db
            .insert(
                crmDocumentRelations,
            )
            .values({
                tenantId,
                documentId:
                    document.id,
                entityType:
                    document.entityType,
                entityId,
                entityName,
            });
    }

    /*
     * ============================================================
     * RESUMEN
     * ============================================================
     */

    return {
        tenant,
        branches,
        products,
        locations,
        stocks,
        leads,
        customers,
        deals,
        promotions,
        quotes,
        salesOrders,
        serviceOrders,
        activities,
        documents,
    };
    }

    seedCRMDemo(
        "dd966505-01bf-4916-8e38-d804ee5c577c",
    )
        .then((result) => {
            console.log("SEED OK");
            console.log(
                "CUSTOMERS",
                result.customers.length,
            );
            console.log(
                "DEALS",
                result.deals.length,
            );
            console.log(
                "QUOTES",
                result.quotes.length,
            );
            console.log(
                "SALES ORDERS",
                result.salesOrders.length,
            );
            console.log(
                "SERVICE ORDERS",
                result.serviceOrders.length,
            );
            console.log(
                "ACTIVITIES",
                result.activities.length,
            );
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });