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

  Productos_aplicables?: Array<{
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

export async function GET() {
  try {
    const moduleApiName =
      process.env.ZOHO_PROMOTIONS_MODULE_API_NAME ??
      "Promoci_n";

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

    const promotions = (response.data ?? [])
      .map((promotion) => ({
        id: promotion.id,

        /*
         * La clave interna de Datara debe coincidir
         * con el key definido en promotions.ts.
         */
        promotionName:
          promotion.Name ??
          "Promoción sin nombre",

        status:
          promotion.Estado ??
          "Sin estado",

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
          promotion.Productos_aplicables ??
          [],

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