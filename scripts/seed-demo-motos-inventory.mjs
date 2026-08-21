import {
  createHash,
} from "node:crypto";

import {
  neon,
} from "@neondatabase/serverless";

import {
  config,
} from "dotenv";

config({
  path:
    ".env.development.local",
  override:
    true,
});

const EXPECTED_DATABASE_HOST =
  process.env
    .DATARA_EXPECTED_DATABASE_HOST
    ?.trim() ||
  "ep-aged-wildflower-audj25dr-pooler.c-10.us-east-1.aws.neon.tech";

const EXPECTED_TENANT_NAME =
  "Demo Motos Desarrollo";

const EXPECTED_ORGANIZATION_ID =
  "org_3IC94PTFd1eqFmI83AmGbSqngr2";

const EXPECTED_INDUSTRY =
  "motorcycle_dealership";

const SEED_KEY =
  "demo_motos_inventory_v1";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está configurada.",
  );
}

const databaseHost =
  new URL(
    databaseUrl,
  ).hostname;

if (
  databaseHost !==
  EXPECTED_DATABASE_HOST
) {
  throw new Error(
    [
      "Sembrado bloqueado.",
      `Endpoint recibido: ${databaseHost}.`,
      `Endpoint permitido: ${EXPECTED_DATABASE_HOST}.`,
    ].join(
      " ",
    ),
  );
}

const sql =
  neon(
    databaseUrl,
  );

function createId(
  tenantId,
  key,
) {
  const hex =
    createHash(
      "sha256",
    )
      .update(
        `${tenantId}:${SEED_KEY}:${key}`,
      )
      .digest(
        "hex",
      )
      .slice(
        0,
        32,
      )
      .split("");

  hex[12] = "4";

  const variant =
    parseInt(
      hex[16],
      16,
    );

  hex[16] =
    (
      (
        variant &
        0x3
      ) |
      0x8
    ).toString(
      16,
    );

  const value =
    hex.join(
      "",
    );

  return [
    value.slice(
      0,
      8,
    ),
    value.slice(
      8,
      12,
    ),
    value.slice(
      12,
      16,
    ),
    value.slice(
      16,
      20,
    ),
    value.slice(
      20,
    ),
  ].join(
    "-",
  );
}

function daysAgo(
  days,
  hours = 12,
) {
  const value =
    new Date();

  value.setUTCDate(
    value.getUTCDate() -
      days,
  );

  value.setUTCHours(
    hours,
    0,
    0,
    0,
  );

  return value;
}

function asDatabaseValue(
  value,
) {
  if (
    value instanceof
    Date
  ) {
    return value
      .toISOString();
  }

  if (
    value !== null &&
    typeof value ===
      "object"
  ) {
    return JSON.stringify(
      value,
    );
  }

  return value;
}

async function upsertById(
  tableName,
  row,
) {
  const entries =
    Object.entries(
      row,
    );

  const columns =
    entries.map(
      ([column]) =>
        `"${column}"`,
    );

  const placeholders =
    entries.map(
      (
        _,
        index,
      ) =>
        `$${index + 1}`,
    );

  const updates =
    entries
      .filter(
        ([column]) =>
          column !==
          "id",
      )
      .map(
        ([column]) =>
          `"${column}" = EXCLUDED."${column}"`,
      );

  const query =
    [
      `INSERT INTO "${tableName}" (${columns.join(", ")})`,
      `VALUES (${placeholders.join(", ")})`,
      `ON CONFLICT ("id") DO UPDATE SET ${updates.join(", ")}`,
    ].join(
      " ",
    );

  await sql.query(
    query,
    entries.map(
      (
        [
          ,
          value,
        ],
      ) =>
        asDatabaseValue(
          value,
        ),
    ),
  );
}

const tenants =
  await sql`
    select
      id,
      name,
      clerk_organization_id,
      industry
    from tenants
    where lower(name) =
      lower(${EXPECTED_TENANT_NAME})
  `;

if (
  tenants.length !==
  1
) {
  throw new Error(
    `Se esperaba un tenant y se encontraron ${tenants.length}.`,
  );
}

const tenant =
  tenants[0];

if (
  tenant.clerk_organization_id !==
    EXPECTED_ORGANIZATION_ID ||
  tenant.industry !==
    EXPECTED_INDUSTRY
) {
  throw new Error(
    "El tenant no coincide con la organización e industria autorizadas.",
  );
}

const [
  branches,
  products,
  members,
] =
  await Promise.all([
    sql`
      select
        id,
        name,
        code
      from tenant_branches
      where tenant_id =
        ${tenant.id}
        and active = true
      order by code
    `,

    sql`
      select
        product.id,
        product.name,
        product.code,
        product.category,
        product.unit_price
      from crm_products
        as product
      inner join crm_product_types
        as product_type
        on product_type.id =
          product.product_type_id
        and product_type.tenant_id =
          product.tenant_id
      where product.tenant_id =
        ${tenant.id}
        and product.active = true
        and product_type.active = true
        and product_type.inventory_tracked =
          true
      order by product.code
    `,

    sql`
      select
        clerk_user_id,
        first_name,
        last_name
      from tenant_members
      where tenant_id =
        ${tenant.id}
        and status = 'active'
      order by created_at
      limit 1
    `,
  ]);

if (
  branches.length !==
    2 ||
  products.length !==
    4 ||
  members.length !==
    1
) {
  throw new Error(
    [
      "El demo no tiene la estructura esperada.",
      `Sucursales: ${branches.length}.`,
      `Productos físicos: ${products.length}.`,
      `Miembros: ${members.length}.`,
    ].join(
      " ",
    ),
  );
}

const actor =
  members[0];

const actorName =
  [
    actor.first_name,
    actor.last_name,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    ) ||
  "Administrador Demo";

const locationDefinitions =
  branches.map(
    (
      branch,
      index,
    ) => ({
      id:
        createId(
          tenant.id,
          `location:${branch.code}`,
        ),

      tenant_id:
        tenant.id,

      branch_id:
        branch.id,

      name:
        index ===
          0
          ? "Bodega Principal Centro"
          : "Bodega Principal Norte",

      code:
        `BOD-${branch.code}`,

      type:
        "Bodega",

      active:
        true,

      is_default:
        true,

      address_line:
        index ===
          0
          ? "Av. Insurgentes 1250"
          : "Av. Universidad 840",

      city:
        "Ciudad de México",

      state:
        "CDMX",

      postal_code:
        index ===
          0
          ? "03100"
          : "03330",

      country:
        "MX",

      metadata: {
        seed:
          SEED_KEY,
      },

      created_at:
        daysAgo(
          360,
        ),

      updated_at:
        daysAgo(
          2,
        ),
    }),
  );

for (
  const location of
  locationDefinitions
) {
  await upsertById(
    "inventory_locations",
    location,
  );
}

const quantityByProduct = {
  "DEMO-MOTO-PREMIUM": [
    12,
    7,
  ],

  "DEMO-MOTO-URBANA": [
    18,
    11,
  ],

  "DEMO-PREMIUM": [
    20,
    13,
  ],

  "DEMO-STANDARD": [
    28,
    19,
  ],
};

const stockDefinitions = [];

for (
  const [
    locationIndex,
    location,
  ] of
  locationDefinitions.entries()
) {
  for (
    const product of
    products
  ) {
    const quantities =
      quantityByProduct[
        product.code
      ];

    if (!quantities) {
      throw new Error(
        `No hay cantidades configuradas para ${product.code}.`,
      );
    }

    const quantity =
      quantities[
        locationIndex
      ];

    const unitPrice =
      Number(
        product.unit_price,
      );

    const averageCost =
      (
        unitPrice *
        0.76
      ).toFixed(
        2,
      );

    const lastCost =
      (
        unitPrice *
        0.78
      ).toFixed(
        2,
      );

    stockDefinitions.push({
      id:
        createId(
          tenant.id,
          `stock:${location.code}:${product.code}`,
        ),

      tenant_id:
        tenant.id,

      branch_id:
        location.branch_id,

      location_id:
        location.id,

      product_id:
        product.id,

      product_code:
        product.code,

      product_name:
        product.name,

      quantity,

      reserved_quantity:
        0,

      minimum_quantity:
        product.code.includes(
          "MOTO",
        )
          ? 3
          : 6,

      maximum_quantity:
        product.code.includes(
          "MOTO",
        )
          ? 25
          : 40,

      reorder_point:
        product.code.includes(
          "MOTO",
        )
          ? 5
          : 9,

      average_unit_cost:
        averageCost,

      last_unit_cost:
        lastCost,

      location:
        location.name,

      created_at:
        daysAgo(
          350,
        ),

      updated_at:
        daysAgo(
          1,
        ),
    });
  }
}

for (
  const stock of
  stockDefinitions
) {
  const {
    product_code:
      _productCode,

    product_name:
      _productName,

    ...databaseStock
  } =
    stock;

  await upsertById(
    "inventory_stocks",
    databaseStock,
  );
}

const transferredProductCodes =
  new Set([
    "DEMO-MOTO-PREMIUM",
    "DEMO-MOTO-URBANA",
    "DEMO-PREMIUM",
  ]);

const movementDefinitions = [];

for (
  const stock of
  stockDefinitions
) {
  const cost =
    Number(
      stock.average_unit_cost,
    );

  const baseEvents = [
    {
      key:
        "initial",

      type:
        "Entrada",

      quantity:
        stock.quantity +
        6,

      previous:
        0,

      resulting:
        stock.quantity +
        6,

      days:
        330,

      reason:
        "Recepción inicial de unidades",
    },
    {
      key:
        "sale-1",

      type:
        "Salida",

      quantity:
        3,

      previous:
        stock.quantity +
        6,

      resulting:
        stock.quantity +
        3,

      days:
        240,

      reason:
        "Entrega de unidades vendidas",
    },
    {
      key:
        "purchase-2",

      type:
        "Entrada",

      quantity:
        4,

      previous:
        stock.quantity +
        3,

      resulting:
        stock.quantity +
        7,

      days:
        165,

      reason:
        "Recepción de orden de compra",
    },
    {
      key:
        "sale-2",

      type:
        "Salida",

      quantity:
        5,

      previous:
        stock.quantity +
        7,

      resulting:
        stock.quantity +
        2,

      days:
        82,

      reason:
        "Salida por ventas del periodo",
    },
  ];

  for (
    const event of
    baseEvents
  ) {
    movementDefinitions.push({
      id:
        createId(
          tenant.id,
          `movement:${stock.id}:${event.key}`,
        ),

      tenant_id:
        tenant.id,

      branch_id:
        stock.branch_id,

      location_id:
        stock.location_id,

      product_id:
        stock.product_id,

      stock_id:
        stock.id,

      type:
        event.type,

      quantity:
        event.quantity,

      previous_quantity:
        event.previous,

      resulting_quantity:
        event.resulting,

      unit_cost:
        stock.average_unit_cost,

      total_cost:
        (
          Math.abs(
            event.quantity,
          ) *
          cost
        ).toFixed(
          2,
        ),

      resulting_average_cost:
        stock.average_unit_cost,

      reason:
        event.reason,

      reference:
        `DEMO-KDX-${stock.product_code}-${event.key}-${stock.location_id.slice(0, 4)}`,

      performed_by_clerk_user_id:
        actor.clerk_user_id,

      performed_by_name:
        actorName,

      metadata: {
        seed:
          SEED_KEY,

        productCode:
          stock.product_code,
      },

      created_at:
        daysAgo(
          event.days,
        ),
    });
  }
}

for (
  const productCode of
  transferredProductCodes
) {
  const source =
    stockDefinitions.find(
      (
        stock,
      ) =>
        stock.product_code ===
          productCode &&
        stock.location_id ===
          locationDefinitions[0]
            .id,
    );

  const destination =
    stockDefinitions.find(
      (
        stock,
      ) =>
        stock.product_code ===
          productCode &&
        stock.location_id ===
          locationDefinitions[1]
            .id,
    );

  if (
    !source ||
    !destination
  ) {
    throw new Error(
      `No fue posible preparar la transferencia de ${productCode}.`,
    );
  }

  const transferReference =
    `TR-DEMO-${productCode}`;

  movementDefinitions.push(
    {
      id:
        createId(
          tenant.id,
          `movement:${source.id}:transfer-out`,
        ),

      tenant_id:
        tenant.id,

      branch_id:
        source.branch_id,

      location_id:
        source.location_id,

      product_id:
        source.product_id,

      stock_id:
        source.id,

      type:
        "Transferencia",

      quantity:
        -1,

      previous_quantity:
        source.quantity +
        2,

      resulting_quantity:
        source.quantity +
        1,

      unit_cost:
        source.average_unit_cost,

      total_cost:
        source.average_unit_cost,

      resulting_average_cost:
        source.average_unit_cost,

      reason:
        "Transferencia a Bodega Principal Norte",

      reference:
        transferReference,

      performed_by_clerk_user_id:
        actor.clerk_user_id,

      performed_by_name:
        actorName,

      metadata: {
        seed:
          SEED_KEY,

        direction:
          "out",

        destinationLocationId:
          destination.location_id,
      },

      created_at:
        daysAgo(
          45,
          10,
        ),
    },
    {
      id:
        createId(
          tenant.id,
          `movement:${destination.id}:transfer-in`,
        ),

      tenant_id:
        tenant.id,

      branch_id:
        destination.branch_id,

      location_id:
        destination.location_id,

      product_id:
        destination.product_id,

      stock_id:
        destination.id,

      type:
        "Transferencia",

      quantity:
        1,

      previous_quantity:
        destination.quantity +
        2,

      resulting_quantity:
        destination.quantity +
        3,

      unit_cost:
        destination.average_unit_cost,

      total_cost:
        destination.average_unit_cost,

      resulting_average_cost:
        destination.average_unit_cost,

      reason:
        "Transferencia desde Bodega Principal Centro",

      reference:
        transferReference,

      performed_by_clerk_user_id:
        actor.clerk_user_id,

      performed_by_name:
        actorName,

      metadata: {
        seed:
          SEED_KEY,

        direction:
          "in",

        sourceLocationId:
          source.location_id,
      },

      created_at:
        daysAgo(
          45,
          11,
        ),
    },
  );
}

for (
  const stock of
  stockDefinitions
) {
  const wasTransferred =
    transferredProductCodes.has(
      stock.product_code,
    );

  const isSource =
    stock.location_id ===
    locationDefinitions[0].id;

  const previousQuantity =
    wasTransferred
      ? stock.quantity +
        (
          isSource
            ? 1
            : 3
        )
      : stock.quantity +
        2;

  const adjustment =
    stock.quantity -
    previousQuantity;

  movementDefinitions.push({
    id:
      createId(
        tenant.id,
        `movement:${stock.id}:final-adjustment`,
      ),

    tenant_id:
      tenant.id,

    branch_id:
      stock.branch_id,

    location_id:
      stock.location_id,

    product_id:
      stock.product_id,

    stock_id:
      stock.id,

    type:
      "Ajuste",

    quantity:
      adjustment,

    previous_quantity:
      previousQuantity,

    resulting_quantity:
      stock.quantity,

    unit_cost:
      stock.average_unit_cost,

    total_cost:
      (
        Math.abs(
          adjustment,
        ) *
        Number(
          stock.average_unit_cost,
        )
      ).toFixed(
        2,
      ),

    resulting_average_cost:
      stock.average_unit_cost,

    reason:
      "Ajuste derivado de conteo físico",

    reference:
      `AJ-DEMO-${stock.product_code}-${stock.location_id.slice(0, 4)}`,

    performed_by_clerk_user_id:
      actor.clerk_user_id,

    performed_by_name:
      actorName,

    metadata: {
      seed:
        SEED_KEY,
    },

    created_at:
      daysAgo(
        18,
      ),
  });
}

for (
  const movement of
  movementDefinitions
) {
  await upsertById(
    "inventory_movements",
    movement,
  );
}

console.log(
  "NÚCLEO PREPARADO:",
  {
    tenant:
      tenant.name,

    locations:
      locationDefinitions.length,

    stocks:
      stockDefinitions.length,

    movements:
      movementDefinitions.length,
  },
);

/*
 * ============================================================
 * RESERVAS
 * ============================================================
 */

const reservationStatuses = [
  "Activa",
  "Activa",
  "Consumida",
  "Liberada",
  "Activa",
  "Vencida",
  "Cancelada",
  "Consumida",
];

const reservationDefinitions =
  stockDefinitions.map(
    (
      stock,
      index,
    ) => {
      const status =
        reservationStatuses[
          index
        ];

      const quantity =
        index ===
          1 ||
        index ===
          4 ||
        index ===
          7
          ? 2
          : 1;

      const isReleased =
        [
          "Consumida",
          "Liberada",
          "Cancelada",
        ].includes(
          status,
        );

      return {
        id:
          createId(
            tenant.id,
            `reservation:${stock.id}:${index}`,
          ),

        tenant_id:
          tenant.id,

        branch_id:
          stock.branch_id,

        location_id:
          stock.location_id,

        product_id:
          stock.product_id,

        stock_id:
          stock.id,

        source_type:
          index %
            2 ===
          0
            ? "Oportunidad"
            : "Orden de venta",

        source_id:
          null,

        source_reference:
          `DEMO-RES-${String(
            index +
              1,
          ).padStart(
            3,
            "0",
          )}`,

        quantity,

        status,

        customer_name: [
          "Transportes Rivera",
          "Mariana López",
          "Grupo Horizonte",
          "Carlos Mendoza",
          "Logística del Valle",
          "Fernanda Ruiz",
          "Comercializadora Norte",
          "Ricardo Salas",
        ][index],

        notes:
          status ===
            "Activa"
            ? "Unidad apartada durante el proceso comercial."
            : `Reserva demo con estado ${status.toLowerCase()}.`,

        expires_at:
          status ===
            "Activa"
            ? daysAgo(
                -(
                  4 +
                  index
                ),
              )
            : status ===
                "Vencida"
              ? daysAgo(
                  5,
                )
              : null,

        created_by_clerk_user_id:
          actor.clerk_user_id,

        created_by_name:
          actorName,

        released_by_clerk_user_id:
          isReleased
            ? actor.clerk_user_id
            : null,

        released_by_name:
          isReleased
            ? actorName
            : null,

        released_at:
          isReleased
            ? daysAgo(
                8 +
                index,
              )
            : null,

        release_reason:
          status ===
            "Consumida"
            ? "Reserva aplicada a la venta."
            : status ===
                "Liberada"
              ? "El cliente cambió de modelo."
              : status ===
                  "Cancelada"
                ? "Operación comercial cancelada."
                : null,

        metadata: {
          seed:
            SEED_KEY,

          productCode:
            stock.product_code,
        },

        created_at:
          daysAgo(
            42 +
            index *
              3,
          ),

        updated_at:
          daysAgo(
            Math.max(
              1,
              8 +
                index,
            ),
          ),
      };
    },
  );

for (
  const reservation of
  reservationDefinitions
) {
  await upsertById(
    "inventory_reservations",
    reservation,
  );
}

for (
  const stock of
  stockDefinitions
) {
  const reservedQuantity =
    reservationDefinitions
      .filter(
        (
          reservation,
        ) =>
          reservation.stock_id ===
            stock.id &&
          reservation.status ===
            "Activa",
      )
      .reduce(
        (
          total,
          reservation,
        ) =>
          total +
          reservation.quantity,
        0,
      );

  await sql`
    update inventory_stocks
    set
      reserved_quantity =
        ${reservedQuantity},
      updated_at = now()
    where id =
      ${stock.id}
      and tenant_id =
        ${tenant.id}
  `;
}

/*
 * ============================================================
 * CONTEOS FÍSICOS
 * ============================================================
 */

const countStatuses = [
  "Aprobado",
  "En revisión",
  "Borrador",
  "Cancelado",
];

const countDefinitions =
  countStatuses.map(
    (
      status,
      index,
    ) => {
      const location =
        locationDefinitions[
          index %
          locationDefinitions.length
        ];

      const submitted =
        status ===
          "Aprobado" ||
        status ===
          "En revisión";

      const approved =
        status ===
        "Aprobado";

      const cancelled =
        status ===
        "Cancelado";

      return {
        id:
          createId(
            tenant.id,
            `count:${index}`,
          ),

        tenant_id:
          tenant.id,

        branch_id:
          location.branch_id,

        location_id:
          location.id,

        reference:
          `CNT-DEMO-${String(
            index +
              1,
          ).padStart(
            3,
            "0",
          )}`,

        status,

        notes:
          [
            "Conteo mensual de cierre con diferencias menores.",
            "Conteo cíclico pendiente de aprobación.",
            "Conteo físico en preparación.",
            "Conteo cancelado por cambio de responsable.",
          ][index],

        created_by_clerk_user_id:
          actor.clerk_user_id,

        created_by_name:
          actorName,

        submitted_by_clerk_user_id:
          submitted
            ? actor.clerk_user_id
            : null,

        submitted_by_name:
          submitted
            ? actorName
            : null,

        submitted_at:
          submitted
            ? daysAgo(
                24 -
                index *
                  3,
              )
            : null,

        approved_by_clerk_user_id:
          approved
            ? actor.clerk_user_id
            : null,

        approved_by_name:
          approved
            ? actorName
            : null,

        approved_at:
          approved
            ? daysAgo(
                21,
              )
            : null,

        cancelled_by_clerk_user_id:
          cancelled
            ? actor.clerk_user_id
            : null,

        cancelled_by_name:
          cancelled
            ? actorName
            : null,

        cancelled_at:
          cancelled
            ? daysAgo(
                4,
              )
            : null,

        cancellation_reason:
          cancelled
            ? "Cambio de fecha del inventario físico."
            : null,

        metadata: {
          seed:
            SEED_KEY,
        },

        created_at:
          daysAgo(
            30 -
            index *
              7,
          ),

        updated_at:
          daysAgo(
            Math.max(
              1,
              21 -
                index *
                  5,
            ),
          ),
      };
    },
  );

for (
  const count of
  countDefinitions
) {
  await upsertById(
    "inventory_counts",
    count,
  );
}

const countItemDefinitions = [];

for (
  const [
    countIndex,
    count,
  ] of
  countDefinitions.entries()
) {
  const locationStocks =
    stockDefinitions.filter(
      (
        stock,
      ) =>
        stock.location_id ===
        count.location_id,
    );

  for (
    const [
      stockIndex,
      stock,
    ] of
    locationStocks.entries()
  ) {
    const hasCount =
      count.status ===
        "Aprobado" ||
      count.status ===
        "En revisión";

    const difference =
      hasCount
        ? (
            (
              stockIndex +
              countIndex
            ) %
              3
          ) -
          1
        : null;

    countItemDefinitions.push({
      id:
        createId(
          tenant.id,
          `count-item:${count.id}:${stock.id}`,
        ),

      tenant_id:
        tenant.id,

      count_id:
        count.id,

      stock_id:
        stock.id,

      product_id:
        stock.product_id,

      expected_quantity:
        stock.quantity,

      counted_quantity:
        hasCount
          ? stock.quantity +
            difference
          : null,

      difference,

      notes:
        difference ===
          1
          ? "Se localizó una unidad pendiente de recepción."
          : difference ===
              -1
            ? "Unidad en exhibición pendiente de registrar."
            : hasCount
              ? "Existencia confirmada."
              : "Pendiente de conteo.",

      metadata: {
        seed:
          SEED_KEY,
      },

      created_at:
        count.created_at,

      updated_at:
        count.updated_at,
    });
  }
}

for (
  const item of
  countItemDefinitions
) {
  await upsertById(
    "inventory_count_items",
    item,
  );
}

/*
 * ============================================================
 * REPOSICIÓN
 * ============================================================
 */

const replenishmentStatuses = [
  "Solicitada",
  "Enviada",
  "Confirmada",
  "Recibida",
];

const replenishmentDefinitions =
  replenishmentStatuses.map(
    (
      status,
      index,
    ) => {
      const branch =
        branches[
          index %
          branches.length
        ];

      const requestedAt =
        daysAgo(
          55 -
          index *
            12,
        );

      return {
        id:
          createId(
            tenant.id,
            `replenishment:${index}`,
          ),

        tenant_id:
          tenant.id,

        branch_id:
          branch.id,

        reference:
          `REP-DEMO-${String(
            index +
              1,
          ).padStart(
            3,
            "0",
          )}`,

        status,

        supplier_name:
          index %
            2 ===
          0
            ? "Motocicletas Nacionales"
            : "Distribuidora de Accesorios MX",

        supplier_reference:
          `PROV-${202600 +
          index +
          1}`,

        currency:
          "mxn",

        notes:
          [
            "Reposición por punto de reorden.",
            "Pedido enviado al proveedor.",
            "Proveedor confirmó fecha de entrega.",
            "Mercancía recibida y validada.",
          ][index],

        external_system:
          "Demo ERP",

        external_id:
          `ERP-REP-${index +
          1}`,

        external_reference:
          `OC-DEMO-${index +
          1}`,

        sync_status:
          status ===
            "Solicitada"
            ? "Pendiente de integración"
            : "Sincronizada",

        sync_error:
          null,

        requested_by_clerk_user_id:
          actor.clerk_user_id,

        requested_by_name:
          actorName,

        requested_at:
          requestedAt,

        sent_at:
          status !==
            "Solicitada"
            ? daysAgo(
                50 -
                index *
                  12,
              )
            : null,

        confirmed_at:
          status ===
            "Confirmada" ||
          status ===
            "Recibida"
            ? daysAgo(
                22 -
                index *
                  4,
              )
            : null,

        received_at:
          status ===
            "Recibida"
            ? daysAgo(
                3,
              )
            : null,

        cancelled_at:
          null,

        cancellation_reason:
          null,

        metadata: {
          seed:
            SEED_KEY,
        },

        created_at:
          requestedAt,

        updated_at:
          daysAgo(
            Math.max(
              1,
              40 -
                index *
                  12,
            ),
          ),
      };
    },
  );

for (
  const request of
  replenishmentDefinitions
) {
  await upsertById(
    "inventory_replenishment_requests",
    request,
  );
}

const replenishmentItemDefinitions = [];

for (
  const [
    requestIndex,
    request,
  ] of
  replenishmentDefinitions.entries()
) {
  const branchStocks =
    stockDefinitions
      .filter(
        (
          stock,
        ) =>
          stock.branch_id ===
          request.branch_id,
      )
      .slice(
        0,
        2,
      );

  for (
    const [
      itemIndex,
      stock,
    ] of
    branchStocks.entries()
  ) {
    const requestedQuantity =
      3 +
      itemIndex +
      requestIndex;

    const receivedQuantity =
      request.status ===
        "Recibida"
        ? requestedQuantity
        : request.status ===
            "Confirmada"
          ? Math.max(
              0,
              requestedQuantity -
                1,
            )
          : 0;

    const unitCost =
      Number(
        stock.last_unit_cost,
      );

    replenishmentItemDefinitions.push({
      id:
        createId(
          tenant.id,
          `replenishment-item:${request.id}:${stock.id}`,
        ),

      tenant_id:
        tenant.id,

      request_id:
        request.id,

      branch_id:
        stock.branch_id,

      location_id:
        stock.location_id,

      product_id:
        stock.product_id,

      stock_id:
        stock.id,

      requested_quantity:
        requestedQuantity,

      received_quantity:
        receivedQuantity,

      unit_cost:
        unitCost.toFixed(
          2,
        ),

      total_cost:
        (
          requestedQuantity *
          unitCost
        ).toFixed(
          2,
        ),

      notes:
        receivedQuantity ===
          requestedQuantity
          ? "Partida recibida completamente."
          : receivedQuantity >
              0
            ? "Recepción parcial registrada."
            : "Pendiente de recepción.",

      metadata: {
        seed:
          SEED_KEY,
      },

      created_at:
        request.created_at,

      updated_at:
        request.updated_at,
    });
  }
}

for (
  const item of
  replenishmentItemDefinitions
) {
  await upsertById(
    "inventory_replenishment_request_items",
    item,
  );
}

/*
 * ============================================================
 * AUDITORÍA
 * ============================================================
 */

const auditDefinitions = [];

for (
  const movement of
  movementDefinitions
) {
  auditDefinitions.push({
    id:
      createId(
        tenant.id,
        `audit:movement:${movement.id}`,
      ),

    tenant_id:
      tenant.id,

    branch_id:
      movement.branch_id,

    location_id:
      movement.location_id,

    product_id:
      movement.product_id,

    entity_type:
      "inventory_movement",

    entity_id:
      movement.id,

    action:
      "created",

    summary:
      `${movement.type}: ${movement.reason}`,

    reason:
      movement.reason,

    actor_clerk_user_id:
      actor.clerk_user_id,

    actor_name:
      actorName,

    before: {
      quantity:
        movement.previous_quantity,
    },

    after: {
      quantity:
        movement.resulting_quantity,
    },

    metadata: {
      seed:
        SEED_KEY,

      reference:
        movement.reference,
    },

    created_at:
      movement.created_at,
  });
}

for (
  const reservation of
  reservationDefinitions
) {
  auditDefinitions.push({
    id:
      createId(
        tenant.id,
        `audit:reservation:${reservation.id}`,
      ),

    tenant_id:
      tenant.id,

    branch_id:
      reservation.branch_id,

    location_id:
      reservation.location_id,

    product_id:
      reservation.product_id,

    entity_type:
      "inventory_reservation",

    entity_id:
      reservation.id,

    action:
      "created",

    summary:
      `Reserva ${reservation.status.toLowerCase()} para ${reservation.customer_name}`,

    reason:
      reservation.release_reason,

    actor_clerk_user_id:
      actor.clerk_user_id,

    actor_name:
      actorName,

    before:
      null,

    after: {
      status:
        reservation.status,

      quantity:
        reservation.quantity,
    },

    metadata: {
      seed:
        SEED_KEY,
    },

    created_at:
      reservation.created_at,
  });
}

for (
  const count of
  countDefinitions
) {
  auditDefinitions.push({
    id:
      createId(
        tenant.id,
        `audit:count:${count.id}`,
      ),

    tenant_id:
      tenant.id,

    branch_id:
      count.branch_id,

    location_id:
      count.location_id,

    product_id:
      null,

    entity_type:
      "inventory_count",

    entity_id:
      count.id,

    action:
      count.status ===
        "Aprobado"
        ? "approved"
        : count.status ===
            "Cancelado"
          ? "cancelled"
          : "created",

    summary:
      `Conteo ${count.reference}: ${count.status}`,

    reason:
      count.cancellation_reason,

    actor_clerk_user_id:
      actor.clerk_user_id,

    actor_name:
      actorName,

    before:
      null,

    after: {
      status:
        count.status,
    },

    metadata: {
      seed:
        SEED_KEY,
    },

    created_at:
      count.created_at,
  });
}

for (
  const request of
  replenishmentDefinitions
) {
  auditDefinitions.push({
    id:
      createId(
        tenant.id,
        `audit:replenishment:${request.id}`,
      ),

    tenant_id:
      tenant.id,

    branch_id:
      request.branch_id,

    location_id:
      null,

    product_id:
      null,

    entity_type:
      "inventory_replenishment",

    entity_id:
      request.id,

    action:
      "created",

    summary:
      `Reposición ${request.reference}: ${request.status}`,

    reason:
      request.notes,

    actor_clerk_user_id:
      actor.clerk_user_id,

    actor_name:
      actorName,

    before:
      null,

    after: {
      status:
        request.status,

      supplier:
        request.supplier_name,
    },

    metadata: {
      seed:
        SEED_KEY,
    },

    created_at:
      request.created_at,
  });
}

for (
  const audit of
  auditDefinitions
) {
  await upsertById(
    "inventory_audit_logs",
    audit,
  );
}

const [verification] =
  await sql`
    select
      (
        select count(*)::integer
        from inventory_locations
        where tenant_id =
          ${tenant.id}
      ) as locations,

      (
        select count(*)::integer
        from inventory_stocks
        where tenant_id =
          ${tenant.id}
      ) as stocks,

      (
        select count(*)::integer
        from inventory_movements
        where tenant_id =
          ${tenant.id}
      ) as movements,

      (
        select count(*)::integer
        from inventory_reservations
        where tenant_id =
          ${tenant.id}
      ) as reservations,

      (
        select count(*)::integer
        from inventory_counts
        where tenant_id =
          ${tenant.id}
      ) as inventory_counts,

      (
        select count(*)::integer
        from inventory_count_items
        where tenant_id =
          ${tenant.id}
      ) as count_items,

      (
        select count(*)::integer
        from inventory_replenishment_requests
        where tenant_id =
          ${tenant.id}
      ) as replenishment_requests,

      (
        select count(*)::integer
        from inventory_replenishment_request_items
        where tenant_id =
          ${tenant.id}
      ) as replenishment_items,

      (
        select count(*)::integer
        from inventory_audit_logs
        where tenant_id =
          ${tenant.id}
      ) as audit_logs,

      (
        select
          coalesce(
            sum(quantity),
            0
          )::integer
        from inventory_stocks
        where tenant_id =
          ${tenant.id}
      ) as total_units,

      (
        select
          coalesce(
            sum(reserved_quantity),
            0
          )::integer
        from inventory_stocks
        where tenant_id =
          ${tenant.id}
      ) as reserved_units
  `;

console.log(
  "CORRECTO: inventario demo preparado.",
  verification,
);
