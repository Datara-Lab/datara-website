import { NextResponse } from "next/server";

import { zohoRequest } from "@/lib/zoho/server";

export const dynamic = "force-dynamic";

type ZohoProduct = {
  id: string;
  Product_Name?: string;
  Product_Code?: string;
};

type ZohoProductsResponse = {
  data?: ZohoProduct[];
  info?: {
    more_records?: boolean;
  };
};

function getModuleApiName(): string {
  return (
    process.env.ZOHO_PRODUCTS_MODULE_API_NAME ??
    "Products"
  );
}

export async function GET() {
  try {
    const products: ZohoProduct[] = [];
    let page = 1;
    let hasMoreRecords = true;

    while (hasMoreRecords) {
      const response =
        await zohoRequest<ZohoProductsResponse>(
          getModuleApiName(),
          {
            method: "GET",
            query: {
              fields:
                "id,Product_Name,Product_Code",
              page,
              per_page: 200,
            },
          },
        );

      products.push(...(response.data ?? []));
      hasMoreRecords =
        response.info?.more_records === true;
      page += 1;
    }

    const data = products
      .filter(
        (product) =>
          product.id && product.Product_Name,
      )
      .map((product) => ({
        value: product.id,
        label: product.Product_Code
          ? `${product.Product_Name} (${product.Product_Code})`
          : product.Product_Name as string,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "es", {
          sensitivity: "base",
        }),
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "No fue posible cargar Products desde Zoho CRM:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el catálogo de productos desde Zoho CRM.",
      },
      { status: 500 },
    );
  }
}