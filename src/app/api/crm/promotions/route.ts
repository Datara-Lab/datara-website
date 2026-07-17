import { NextResponse } from "next/server";

import { zohoRequest } from "@/lib/zoho/server";

export const dynamic = "force-dynamic";

type ZohoPromotionRecord = {
  id: string;

  Name?: string;
  Estado?: string;
  Prioridad?: number;

  Inicio_de_promoci_n?: string;
  Fin_de_promoci_n?: string;

  Tipo_de_beneficio?: string;
  Forma_de_pago?: string;
  Grupo_de_Promoci_n?: string;

  Meses_disponibles?: string[];
  Canal_aplicable?: string[];

  Enganche_m_nimo1?: number;
  M_ximo_de_beneficios?: number;
  Beneficios_entregados?: number;

  Limitar_promoci_n?: boolean;
  Pausada?: boolean;
  Requiere_elecci_n?: boolean;

  Productos_aplicables?:
    | {
        id?: string;
        name?: string;
      }
    | Array<{
        id?: string;
        name?: string;
      }>;

  Tipo_de_cliente?: string;
  Valor?: number;
  Mensaje_comercial?: string;
  Descripci_n?: string;

  Owner?: {
    id?: string;
    name?: string;
    email?: string;
  };

  Created_Time?: string;
  Modified_Time?: string;
};

type ZohoGetPromotionsResponse = {
  data?: ZohoPromotionRecord[];

  info?: {
    per_page?: number;
    count?: number;
    page?: number;
    more_records?: boolean;
  };
};

type PromotionFormPayload = {
  id?: unknown;
  promotionName?: unknown;
  status?: unknown;
  priority?: unknown;

  promotionStart?: unknown;
  promotionEnd?: unknown;

  benefitType?: unknown;
  paymentMethod?: unknown;
  promotionGroup?: unknown;

  availableMonths?: unknown;
  channel?: unknown;

  minimumDownPayment?: unknown;
  maximumBenefits?: unknown;
  usedBenefits?: unknown;

  limitPromotion?: unknown;
  paused?: unknown;
  requiresSelection?: unknown;

  applicableProducts?: unknown;

  customerType?: unknown;
  value?: unknown;
  commercialMessage?: unknown;
  conditions?: unknown;
};

type ZohoWriteResult = {
  code?: string;
  message?: string;
  status?: string;

  details?: {
    id?: string;
    Created_Time?: string;
    Modified_Time?: string;
    api_name?: string;
  };
};

type ZohoWriteResponse = {
  data?: ZohoWriteResult[];
};

function getModuleApiName(): string {
  return (
    process.env.ZOHO_PROMOTIONS_MODULE_API_NAME ??
    "Promoci_n"
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

/**
 * Normaliza valores de controles datetime-local o fechas ISO al formato
 * DateTime aceptado por Zoho CRM: yyyy-MM-ddTHH:mm:ss+00:00.
 */
function getOptionalDateTime(
  value: unknown,
): string | undefined {
  const normalizedValue =
    getOptionalString(value);

  if (!normalizedValue) {
    return undefined;
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "+00:00");
}

function getOptionalNumber(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const normalizedValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(normalizedValue)
    ? normalizedValue
    : undefined;
}

function getBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function calculatePromotionStatus(
  promotionStart: unknown,
  promotionEnd: unknown,
  paused: unknown,
): "Activa" | "Programada" | "Inactiva" | "Expirada" {
  if (getBoolean(paused)) {
    return "Inactiva";
  }

  const startValue =
    getOptionalString(promotionStart);
  const endValue =
    getOptionalString(promotionEnd);

  const startDate = startValue
    ? new Date(startValue)
    : null;
  const endDate = endValue
    ? new Date(endValue)
    : null;

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Inactiva";
  }

  const now = Date.now();

  if (now < startDate.getTime()) {
    return "Programada";
  }

  if (now >= endDate.getTime()) {
    return "Expirada";
  }

  return "Activa";
}

function getStringArray(
  value: unknown,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalizedValues = value
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) => item.trim())
    .filter(Boolean);

  return normalizedValues.length > 0
    ? normalizedValues
    : undefined;
}

function getLookupArray(
  value: unknown,
):
  | Array<{
      id: string;
    }>
  | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const lookupRecords = value
    .map((item) => {
      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return {
          id: item.trim(),
        };
      }

      if (isRecord(item)) {
        const id = item.id;

        if (
          typeof id === "string" &&
          id.trim()
        ) {
          return {
            id: id.trim(),
          };
        }
      }

      return null;
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
      } => item !== null,
    );

  return lookupRecords.length > 0
    ? lookupRecords
    : undefined;
}

function normalizeLookupValues(
  value: unknown,
): Array<{
  id: string;
  name: string;
}> {
  const products = new Map<
    string,
    string
  >();

  function visit(item: unknown): void {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }

    if (!isRecord(item)) {
      return;
    }

    const id = getOptionalString(item.id);
    const name =
      getOptionalString(item.name);

    if (id && name) {
      products.set(id, name);
      return;
    }

    Object.values(item).forEach(visit);
  }

  visit(value);

  return Array.from(
    products,
    ([id, name]) => ({ id, name }),
  );
}

function normalizeOptionValue(
  value: unknown,
): string | undefined {
  return getOptionalString(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function removeUndefinedValues(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) => value !== undefined,
    ),
  );
}

function mapFormValuesToZoho(
  values: PromotionFormPayload,
  forUpdate = false,
): Record<string, unknown> {
  return removeUndefinedValues({
    Name: getOptionalString(
      values.promotionName,
    ),

    Estado: calculatePromotionStatus(
      values.promotionStart,
      values.promotionEnd,
      values.paused,
    ),

    Prioridad: getOptionalNumber(
      values.priority,
    ),

    Inicio_de_promoci_n:
      getOptionalDateTime(
        values.promotionStart,
      ),

    Fin_de_promoci_n:
      getOptionalDateTime(
        values.promotionEnd,
      ),

    Tipo_de_beneficio:
      getOptionalString(
        values.benefitType,
      ),

    Forma_de_pago:
      getOptionalString(
        values.paymentMethod,
      ),

    Grupo_de_Promoci_n:
      getOptionalString(
        values.promotionGroup,
      ),

    Meses_disponibles:
      getStringArray(values.availableMonths) ??
      (forUpdate ? [] : undefined),

    Canal_aplicable:
      getStringArray(values.channel) ??
      (forUpdate ? [] : undefined),

    Enganche_m_nimo1:
      getOptionalNumber(
        values.minimumDownPayment,
      ) ?? (forUpdate ? null : undefined),

    M_ximo_de_beneficios:
      getOptionalNumber(
        values.maximumBenefits,
      ) ?? (forUpdate ? null : undefined),

    Beneficios_entregados:
      getOptionalNumber(
        values.usedBenefits,
      ) ?? 0,

    Limitar_promoci_n:
      getBoolean(
        values.limitPromotion,
      ),

    Pausada: getBoolean(
      values.paused,
    ),

    Requiere_elecci_n:
      getBoolean(
        values.requiresSelection,
      ),

    Productos_aplicables:
      getLookupArray(
        values.applicableProducts,
      ) ?? (forUpdate ? [] : undefined),

    Tipo_de_cliente:
      getOptionalString(
        values.customerType,
      ),

    Valor:
      getOptionalNumber(values.value) ??
      (forUpdate ? null : undefined),

    Mensaje_comercial:
      getOptionalString(
        values.commercialMessage,
      ) ?? (forUpdate ? null : undefined),

    Descripci_n:
      getOptionalString(
        values.conditions,
      ) ?? (forUpdate ? null : undefined),
  });
}

function validateCreatePayload(
  values: PromotionFormPayload,
): string | null {
  const promotionName =
    getOptionalString(
      values.promotionName,
    );

  if (!promotionName) {
    return "El nombre de la promoción es obligatorio.";
  }

  const benefitType =
    normalizeOptionValue(
      values.benefitType,
    );

  const benefitTypesThatRequireValue =
    new Set([
      "descuento(%)",
      "descuento (%)",
      "descuento($)",
      "descuento ($)",
      "meses sin intereses",
      "bono",
    ]);

  if (
    benefitType &&
    benefitTypesThatRequireValue.has(
      benefitType,
    ) &&
    getOptionalNumber(values.value) ===
      undefined
  ) {
    return `El valor es obligatorio para el beneficio "${getOptionalString(values.benefitType)}".`;
  }

  return null;
}

export async function GET() {
  try {
    const moduleApiName =
      getModuleApiName();

    const response =
      await zohoRequest<ZohoGetPromotionsResponse>(
        moduleApiName,
        {
          method: "GET",
          query: {
            fields: [
              "id",
              "Name",
              "Estado",
              "Prioridad",
              "Inicio_de_promoci_n",
              "Fin_de_promoci_n",
              "Tipo_de_beneficio",
              "Forma_de_pago",
              "Grupo_de_Promoci_n",
              "Meses_disponibles",
              "Canal_aplicable",
              "Enganche_m_nimo1",
              "M_ximo_de_beneficios",
              "Beneficios_entregados",
              "Limitar_promoci_n",
              "Pausada",
              "Requiere_elecci_n",
              "Productos_aplicables",
              "Tipo_de_cliente",
              "Valor",
              "Mensaje_comercial",
              "Descripci_n",
              "Owner",
              "Created_Time",
              "Modified_Time",
            ].join(","),
            page: 1,
            per_page: 200,
            sort_by: "id",
            sort_order: "desc",
          },
        },
      );

    // Zoho omite los valores de los lookups multiselección al listar
    // registros. Esos valores se recuperan consultando cada registro.
    const promotionRecords =
      response.data ?? [];

    const detailedRecords:
      ZohoPromotionRecord[] = [];

    const detailBatchSize = 10;

    for (
      let index = 0;
      index < promotionRecords.length;
      index += detailBatchSize
    ) {
      const batch = promotionRecords.slice(
        index,
        index + detailBatchSize,
      );

      const batchDetails =
        await Promise.all(
          batch.map(async (promotion) => {
            try {
              const detail =
                await zohoRequest<ZohoGetPromotionsResponse>(
                  `${moduleApiName}/${promotion.id}`,
                  {
                    method: "GET",
                    query: {
                      fields:
                        "Productos_aplicables",
                    },
                  },
                );

              return {
                ...promotion,
                ...(detail.data?.[0] ?? {}),
              };
            } catch (error) {
              console.warn(
                `No fue posible cargar los productos de la promoción ${promotion.id}:`,
                error,
              );

              return promotion;
            }
          }),
        );

      detailedRecords.push(
        ...batchDetails,
      );
    }

    const promotions = detailedRecords
      .map((promotion) => ({
        id: promotion.id,

        promotionName:
          promotion.Name ??
          "Promoción sin nombre",

        status:
          calculatePromotionStatus(
            promotion.Inicio_de_promoci_n,
            promotion.Fin_de_promoci_n,
            promotion.Pausada,
          ),

        priority:
          promotion.Prioridad ??
          null,

        promotionStart:
          promotion.Inicio_de_promoci_n ??
          null,

        promotionEnd:
          promotion.Fin_de_promoci_n ??
          null,

        benefitType:
          promotion.Tipo_de_beneficio ??
          null,

        paymentMethod:
          promotion.Forma_de_pago ??
          null,

        promotionGroup:
          promotion.Grupo_de_Promoci_n ??
          null,

        availableMonths:
          promotion.Meses_disponibles ??
          [],

        channel:
          promotion.Canal_aplicable ??
          [],

        minimumDownPayment:
          promotion.Enganche_m_nimo1 ??
          null,

        maximumBenefits:
          promotion.M_ximo_de_beneficios ??
          null,

        usedBenefits:
          promotion.Beneficios_entregados ??
          0,

        limitPromotion:
          promotion.Limitar_promoci_n ??
          false,

        paused:
          promotion.Pausada ??
          false,

        requiresSelection:
          promotion.Requiere_elecci_n ??
          false,

        applicableProducts:
          normalizeLookupValues(
            promotion.Productos_aplicables,
          ),

        customerType:
          promotion.Tipo_de_cliente ??
          null,

        value:
          promotion.Valor ??
          null,

        commercialMessage:
          promotion.Mensaje_comercial ??
          null,

        conditions:
          promotion.Descripci_n ??
          null,

        owner:
          promotion.Owner ??
          null,

        createdTime:
          promotion.Created_Time ??
          null,

        modifiedTime:
          promotion.Modified_Time ??
          null,
      }))
      .sort((a, b) => {
        const aPriority =
          a.priority ??
          Number.MAX_SAFE_INTEGER;

        const bPriority =
          b.priority ??
          Number.MAX_SAFE_INTEGER;

        return aPriority - bPriority;
      });

    return NextResponse.json({
      success: true,
      data: promotions,
      meta: {
        count:
          response.info?.count ??
          promotions.length,

        page:
          response.info?.page ??
          1,

        perPage:
          response.info?.per_page ??
          200,

        moreRecords:
          response.info?.more_records ??
          false,
      },
    });
  } catch (error) {
    console.error(
      "Error loading Zoho promotions:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar las promociones.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La información enviada no tiene un formato válido.",
        },
        {
          status: 400,
        },
      );
    }

    const values =
      requestBody as PromotionFormPayload;

    const validationError =
      validateCreatePayload(values);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        {
          status: 400,
        },
      );
    }

    const zohoRecord =
      mapFormValuesToZoho(values);

    const moduleApiName =
      getModuleApiName();


    const response =
      await zohoRequest<ZohoWriteResponse>(
        moduleApiName,
        {
          method: "POST",
          body: {
            data: [zohoRecord],
            trigger: [
              "workflow",
              "approval",
              "blueprint",
            ],
          },
        },
      );

    const result = response.data?.[0];

    if (
      !result ||
      result.status?.toLowerCase() !==
        "success" ||
      !result.details?.id
    ) {
      throw new Error(
        result?.message ??
          result?.code ??
          "Zoho no confirmó la creación de la promoción.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "La promoción fue creada correctamente.",
        data: {
          id: result.details.id,
          createdTime:
            result.details.Created_Time ??
            null,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error creating Zoho promotion:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "No fue posible crear la promoción.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La información enviada no tiene un formato válido.",
        },
        { status: 400 },
      );
    }

    const values =
      requestBody as PromotionFormPayload;

    const recordId =
      getOptionalString(values.id);

    if (!recordId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible identificar la promoción que se desea actualizar.",
        },
        { status: 400 },
      );
    }

    const validationError =
      validateCreatePayload(values);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 },
      );
    }

    const zohoRecord =
      mapFormValuesToZoho(values, true);

    const response =
      await zohoRequest<ZohoWriteResponse>(
        `${getModuleApiName()}/${recordId}`,
        {
          method: "PUT",
          body: {
            data: [zohoRecord],
            trigger: [
              "workflow",
              "approval",
              "blueprint",
            ],
          },
        },
      );

    const result = response.data?.[0];

    if (
      !result ||
      result.status?.toLowerCase() !==
        "success"
    ) {
      throw new Error(
        result?.message ??
          result?.code ??
          "Zoho no confirmó la actualización de la promoción.",
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "La promoción fue actualizada correctamente.",
      data: {
        id: result.details?.id ?? recordId,
        modifiedTime:
          result.details?.Modified_Time ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Error updating Zoho promotion:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar la promoción.",
      },
      { status: 500 },
    );
  }
}
