import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@clerk/nextjs/server";
import {
  and,
  eq,
  inArray,
} from "drizzle-orm";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import {
  GET as getQuotes,
} from "@/app/api/crm/quotes/route";

import { db } from "@/db";

import {
  crmProducts,
  tenants,
} from "@/db/schema";

import {
  CRMPermissionError,
  requireCRMModulePermission,
} from "@/lib/crm/permissions";

import type {
  CRMQuoteAddress,
  CRMQuoteApiResponse,
  CRMQuoteRecord,
} from "@/types/crm-quotes";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    quoteId: string;
  }>;
};

type TenantMetadata =
  Record<string, unknown>;

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH =
  PAGE_WIDTH - MARGIN * 2;

const navy = rgb(
  0.035,
  0.075,
  0.17,
);

const slate = rgb(
  0.28,
  0.34,
  0.43,
);

const lightSlate = rgb(
  0.93,
  0.95,
  0.97,
);

const emerald = rgb(
  0.02,
  0.58,
  0.38,
);

function getMetadataString(
  metadata: TenantMetadata,
  keys: string[],
): string {
  for (const key of keys) {
    const value =
      metadata[key];

    if (
      typeof value ===
      "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function formatMoney(
  value: number,
  currency: string,
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency:
        currency.toUpperCase(),
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Sin fecha";
  }

  const datePart =
    value.slice(0, 10);

  const [
    year,
    month,
    day,
  ] = datePart
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
      ),
    );

  return date.toLocaleDateString(
    "es-MX",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

function formatAddress(
  address: CRMQuoteAddress,
): string {
  const street = [
    address.street,
    address.exteriorNumber,
    address.interiorNumber
      ? `Int. ${address.interiorNumber}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    street,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getTechnicalSpecificationRows(
  specifications:
    Record<string, unknown>,
): Array<{
  label: string;
  value: string;
}> {
  function getValue(
    key: string,
  ): string {
    const value =
      specifications[key];

    if (
      typeof value ===
        "string" ||
      typeof value ===
        "number"
    ) {
      return String(value)
        .trim();
    }

    if (Array.isArray(value)) {
      return value
        .map(String)
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
        .join(", ");
    }

    return "";
  }

  return [
    {
      label: "Año",
      value:
        getValue("modelYear"),
    },
    {
      label: "Colores",
      value:
        getValue("colors"),
    },
    {
      label: "Motor",
      value:
        getValue("engine"),
    },
    {
      label: "Cilindrada",
      value:
        getValue(
          "displacement",
        ),
    },
    {
      label: "Potencia",
      value:
        getValue("power"),
    },
    {
      label: "Enfriamiento",
      value:
        getValue(
          "coolingSystem",
        ),
    },
    {
      label: "Transmisión",
      value:
        getValue(
          "transmission",
        ),
    },
    {
      label:
        "Capacidad del tanque",
      value:
        getValue(
          "fuelCapacity",
        ),
    },
    {
      label:
        "Capacidad de carga",
      value:
        getValue(
          "loadCapacity",
        ),
    },
    {
      label:
        "Pasajeros",
      value:
        getValue(
          "passengerCapacity",
        ),
    },
    {
      label: "Garantía",
      value:
        getValue("warranty"),
    },
  ].filter(
    (
      row,
    ): row is {
      label: string;
      value: string;
    } =>
      Boolean(row.value),
  );
}

function safeFileName(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 80);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs =
    text
      .replaceAll("\r", "")
      .split("\n");

  const lines: string[] = [];

  for (
    const paragraph of paragraphs
  ) {
    const words =
      paragraph
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const candidate =
        currentLine
          ? `${currentLine} ${word}`
          : word;

      if (
        font.widthOfTextAtSize(
          candidate,
          size,
        ) <= maxWidth
      ) {
        currentLine =
          candidate;
      } else {
        if (currentLine) {
          lines.push(
            currentLine,
          );
        }

        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const {
      userId,
      orgId,
    } = await auth();

    if (!userId) {
      throw new ApiError(
        "No autenticado.",
        401,
      );
    }

    if (!orgId) {
      throw new ApiError(
        "No hay una organización activa.",
        400,
      );
    }

    const {
      quoteId,
    } = await context.params;

    const [tenant] =
      await db
        .select({
          id: tenants.id,
          name: tenants.name,
          legalName:
            tenants.legalName,
          taxId: tenants.taxId,
          tagline:
            tenants.tagline,
          logoObjectKey:
            tenants.logoObjectKey,
          primaryColor:
            tenants.primaryColor,

          timezone:
            tenants.timezone,

          metadata:
            tenants.metadata,
        })
        .from(tenants)
        .where(
          eq(
            tenants
              .clerkOrganizationId,
            orgId,
          ),
        )
        .limit(1);

    if (!tenant) {
      throw new ApiError(
        "La empresa aún no está sincronizada.",
        404,
      );
    }

    await requireCRMModulePermission(
      tenant.id,
      userId,
      "quotes",
      "view",
    );

    const quotesResponse =
      await getQuotes();

    const quotesResult =
      (await quotesResponse.json()) as
      CRMQuoteApiResponse<
        CRMQuoteRecord[]
      >;

    if (
      !quotesResponse.ok ||
      !quotesResult.success
    ) {
      throw new ApiError(
        quotesResult.error ??
        "No fue posible consultar la cotización.",
        quotesResponse.status,
      );
    }

    const quote =
      quotesResult.data?.find(
        (record) =>
          record.id === quoteId,
      );

    if (!quote) {
      throw new ApiError(
        "La cotización no existe.",
        404,
      );
    }

    const productIds =
      Array.from(
        new Set(
          quote.items
            .map(
              (item) =>
                item.productId,
            )
            .filter(
              (
                productId,
              ): productId is string =>
                Boolean(productId),
            ),
        ),
      );

    const productRecords =
      productIds.length > 0
        ? await db
            .select({
              id: crmProducts.id,

              imageObjectKey:
                crmProducts
                  .imageObjectKey,
            })
            .from(crmProducts)
            .where(
              and(
                eq(
                  crmProducts.tenantId,
                  tenant.id,
                ),

                inArray(
                  crmProducts.id,
                  productIds,
                ),
              ),
            )
        : [];

    const productImageKeys =
      new Map(
        productRecords.map(
          (product) => [
            product.id,
            product.imageObjectKey,
          ],
        ),
      );

    const metadata =
      tenant.metadata ?? {};

    const companyPhone =
      getMetadataString(
        metadata,
        [
          "phone",
          "telephone",
          "telefono",
        ],
      );

    const companyEmail =
      getMetadataString(
        metadata,
        [
          "email",
          "contactEmail",
          "correo",
        ],
      );

    const companyWebsite =
      getMetadataString(
        metadata,
        [
          "website",
          "web",
          "sitioWeb",
        ],
      );

    const companyAddress =
      getMetadataString(
        metadata,
        [
          "address",
          "fullAddress",
          "direccion",
        ],
      );

    const pdf =
      await PDFDocument.create();

    pdf.setTitle(
      `COTIZACIÓN ${quote!.quoteNumber}`,
    );

    pdf.setAuthor(
      tenant.name,
    );

    pdf.setSubject(
      quote.subject,
    );

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const bold =
      await pdf.embedFont(
        StandardFonts
          .HelveticaBold,
      );

    const {
      env,
    } = getCloudflareContext();

    const bucket =
      env.datara_crm_documents;

    async function embedR2Image(
      objectKey:
        | string
        | null
        | undefined,
    ): Promise<PDFImage | null> {
      if (
        !bucket ||
        !objectKey
      ) {
        return null;
      }

      try {
        const object =
          await bucket.get(
            objectKey,
          );

        if (!object) {
          return null;
        }

        const bytes =
          await object.arrayBuffer();

        const imageBytes =
          new Uint8Array(
            bytes,
          );

        const isPng =
          imageBytes[0] === 137 &&
          imageBytes[1] === 80 &&
          imageBytes[2] === 78 &&
          imageBytes[3] === 71 &&
          imageBytes[4] === 13 &&
          imageBytes[5] === 10 &&
          imageBytes[6] === 26 &&
          imageBytes[7] === 10;

        const isJpeg =
          imageBytes[0] === 255 &&
          imageBytes[1] === 216 &&
          imageBytes[2] === 255;

        const isWebP =
          imageBytes[0] === 82 &&
          imageBytes[1] === 73 &&
          imageBytes[2] === 70 &&
          imageBytes[3] === 70 &&
          imageBytes[8] === 87 &&
          imageBytes[9] === 69 &&
          imageBytes[10] === 66 &&
          imageBytes[11] === 80;

        if (isPng) {
          return await pdf.embedPng(
            imageBytes,
          );
        }

        if (isJpeg) {
          return await pdf.embedJpg(
            imageBytes,
          );
        }

        if (isWebP) {
          if (!env.IMAGES) {
            throw new Error(
              "El conversor de imágenes de Cloudflare no está disponible.",
            );
          }

          const sourceStream =
            new Blob([
              imageBytes,
            ]).stream();

          const transformed =
            (
              await env.IMAGES
                .input(sourceStream)
                .output({
                  format: "image/png",
                  anim: false,
                })
            ).response();

          if (!transformed.ok) {
            throw new Error(
              "Cloudflare no pudo convertir la imagen WebP.",
            );
          }

          const pngBytes =
            new Uint8Array(
              await transformed.arrayBuffer(),
            );

          return await pdf.embedPng(
            pngBytes,
          );
        }

        throw new Error(
          "El archivo no contiene una imagen PNG, JPG o WebP válida.",
        );
      } catch (imageError) {
        console.warn(
          "No fue posible integrar una imagen en el PDF.",
          imageError,
        );

        return null;
      }
    }

    const logoImage =
      await embedR2Image(
        tenant.logoObjectKey,
      );

    const productImages =
      new Map<
        string,
        PDFImage
      >();

    for (
      const [
        productId,
        objectKey,
      ] of productImageKeys
    ) {
      const image =
        await embedR2Image(
          objectKey,
        );

      if (image) {
        productImages.set(
          productId,
          image,
        );
      }
    }

    let page!: PDFPage;
    let y = 0;

    function addPage() {
      page =
        pdf.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      y =
        PAGE_HEIGHT -
        MARGIN;

      page.drawRectangle({
        x: 0,
        y:
          PAGE_HEIGHT - 8,
        width: PAGE_WIDTH,
        height: 8,
        color: emerald,
      });

      const companyTextX =
        logoImage
          ? MARGIN + 68
          : MARGIN;

      if (logoImage) {
        const logoScale =
          Math.min(
            56 /
              logoImage.width,
            50 /
              logoImage.height,
            1,
          );

        const logoWidth =
          logoImage.width *
          logoScale;

        const logoHeight =
          logoImage.height *
          logoScale;

        page.drawImage(
          logoImage,
          {
            x: MARGIN,
            y:
              y -
              logoHeight -
              2,
            width: logoWidth,
            height: logoHeight,
          },
        );
      }

      page.drawText(
        tenant.legalName ??
          tenant.name,
        {
          x: companyTextX,
          y: y - 14,
          size: 15,
          font: bold,
          color: navy,
        },
      );

      if (tenant.tagline) {
        page.drawText(
          tenant.tagline,
          {
            x: companyTextX,
            y: y - 28,
            size: 8,
            font: regular,
            color: slate,
          },
        );
      }

      const companyDetails = [
        tenant.taxId
          ? `RFC: ${tenant.taxId}`
          : "",
        companyPhone,
        companyEmail,
      ]
        .filter(Boolean)
        .join("  ·  ");

      if (companyDetails) {
        page.drawText(
          companyDetails,
          {
            x: companyTextX,
            y: y - 42,
            size: 7,
            font: regular,
            color: slate,
            maxWidth: 255,
          },
        );
      }

      const quoteTitle =
        `COTIZACIÓN ${quote!.quoteNumber}`;

      const titleWidth =
        bold.widthOfTextAtSize(
          quoteTitle,
          13,
        );

      page.drawText(
        quoteTitle,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            titleWidth,
          y: y - 14,
          size: 13,
          font: bold,
          color: navy,
        },
      );

      const statusText =
        `Estado: ${quote!.status}`;

      const statusWidth =
        regular.widthOfTextAtSize(
          statusText,
          8,
        );

      page.drawText(
        statusText,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            statusWidth,
          y: y - 30,
          size: 8,
          font: regular,
          color: slate,
        },
      );

      if (companyWebsite) {
        const websiteWidth =
          regular.widthOfTextAtSize(
            companyWebsite,
            7,
          );

        page.drawText(
          companyWebsite,
          {
            x:
              PAGE_WIDTH -
              MARGIN -
              websiteWidth,
            y: y - 44,
            size: 7,
            font: regular,
            color: slate,
          },
        );
      }

      y -= 72;

      page.drawLine({
        start: {
          x: MARGIN,
          y,
        },
        end: {
          x:
            PAGE_WIDTH -
            MARGIN,
          y,
        },
        thickness: 1,
        color: lightSlate,
      });

      y -= 20;
    }

    function ensureSpace(
      height: number,
    ) {
      if (
        y - height <
        58
      ) {
        addPage();
      }
    }

    function drawText(
      text: string,
      options?: {
        size?: number;
        font?: PDFFont;
        color?: ReturnType<
          typeof rgb
        >;
        x?: number;
        maxWidth?: number;
        lineHeight?: number;
      },
    ) {
      const size =
        options?.size ?? 9;

      const selectedFont =
        options?.font ??
        regular;

      const maxWidth =
        options?.maxWidth ??
        CONTENT_WIDTH;

      const lineHeight =
        options?.lineHeight ??
        size + 3;

      const lines =
        wrapText(
          text,
          selectedFont,
          size,
          maxWidth,
        );

      ensureSpace(
        lines.length *
        lineHeight,
      );

      for (const line of lines) {
        page.drawText(
          line || " ",
          {
            x:
              options?.x ??
              MARGIN,
            y,
            size,
            font:
              selectedFont,
            color:
              options?.color ??
              navy,
          },
        );

        y -= lineHeight;
      }
    }

    function drawSectionTitle(
      title: string,
    ) {
      ensureSpace(34);

      page.drawRectangle({
        x: MARGIN,
        y: y - 19,
        width:
          CONTENT_WIDTH,
        height: 25,
        color: lightSlate,
      });

      page.drawText(
        title,
        {
          x: MARGIN + 10,
          y: y - 10,
          size: 10,
          font: bold,
          color: navy,
        },
      );

      y -= 34;
    }

    function drawLabelValue(
      label: string,
      value: string,
      x: number,
      width: number,
    ) {
      page.drawText(
        label,
        {
          x,
          y,
          size: 7,
          font: bold,
          color: slate,
        },
      );

      const lines =
        wrapText(
          value ||
          "Sin información",
          regular,
          9,
          width,
        );

      let valueY =
        y - 13;

      for (
        const line of
        lines.slice(0, 3)
      ) {
        page.drawText(
          line,
          {
            x,
            y: valueY,
            size: 9,
            font: regular,
            color: navy,
          },
        );

        valueY -= 11;
      }
    }

    addPage();

    drawText(
      quote.subject,
      {
        size: 17,
        font: bold,
        color: navy,
        lineHeight: 21,
      },
    );

    y -= 6;

    ensureSpace(62);

    const columnWidth =
      (CONTENT_WIDTH - 20) /
      2;

    drawLabelValue(
      "CLIENTE O PROSPECTO",
      quote.relatedName ??
      "Sin relación",
      MARGIN,
      columnWidth,
    );

    drawLabelValue(
      "VÁLIDA HASTA",
      formatDate(
        quote.validUntil,
      ),
      MARGIN +
      columnWidth +
      20,
      columnWidth,
    );

    y -= 48;

    drawLabelValue(
      "RESPONSABLE",
      quote.owner.name ??
      quote.owner.email ??
      "Sin responsable",
      MARGIN,
      columnWidth,
    );

    drawLabelValue(
      "OPORTUNIDAD",
      quote.dealName ??
      "Sin oportunidad",
      MARGIN +
      columnWidth +
      20,
      columnWidth,
    );

    y -= 52;

    drawSectionTitle(
      "Productos y servicios",
    );

    const tableColumns = {
      description: MARGIN,
      quantity: MARGIN + 245,
      unitPrice: MARGIN + 305,
      discount: MARGIN + 380,
      total: MARGIN + 450,
    };

    ensureSpace(30);

    page.drawText(
      "Producto",
      {
        x:
          tableColumns
            .description,
        y,
        size: 7,
        font: bold,
        color: slate,
      },
    );

    page.drawText(
      "Cant.",
      {
        x:
          tableColumns
            .quantity,
        y,
        size: 7,
        font: bold,
        color: slate,
      },
    );

    page.drawText(
      "Precio",
      {
        x:
          tableColumns
            .unitPrice,
        y,
        size: 7,
        font: bold,
        color: slate,
      },
    );

    page.drawText(
      "Descuento",
      {
        x:
          tableColumns
            .discount,
        y,
        size: 7,
        font: bold,
        color: slate,
      },
    );

    page.drawText(
      "Total",
      {
        x:
          tableColumns
            .total,
        y,
        size: 7,
        font: bold,
        color: slate,
      },
    );

    y -= 16;

    for (
      const item of quote.items
    ) {
      const productImage =
        item.productId
          ? productImages.get(
              item.productId,
            )
          : undefined;

      const imageBoxWidth = 112;
      const imageBoxHeight = 86;

      const productTextX =
        tableColumns.description +
        (
          productImage
            ? imageBoxWidth + 10
            : 0
        );

      const productTextWidth =
        productImage
          ? 102
          : 225;

      const nameLines =
        wrapText(
          item.name,
          bold,
          8,
          productTextWidth,
        );

      const promotionText =
        item.promotions
          .map(
            (promotion) =>
              promotion
                .promotionName,
          )
          .join(", ");

      const promotionLines =
        promotionText
          ? wrapText(
              `Promoción: ${promotionText}`,
              regular,
              7,
              productTextWidth,
            ).slice(0, 2)
          : [];

      const textHeight =
        nameLines.length *
          11 +
        promotionLines.length *
          9 +
        6;

      const rowHeight =
        Math.max(
          productImage
            ? 100
            : 34,
          textHeight,
        );

      ensureSpace(rowHeight);

      page.drawLine({
        start: {
          x: MARGIN,
          y: y + 7,
        },
        end: {
          x:
            PAGE_WIDTH -
            MARGIN,
          y: y + 7,
        },
        thickness: 0.5,
        color: lightSlate,
      });

      if (productImage) {
        page.drawRectangle({
          x:
            tableColumns
              .description,
          y:
            y -
            rowHeight +
            (
              rowHeight -
              imageBoxHeight
            ) / 2 +
            3,
          width: imageBoxWidth,
          height: imageBoxHeight,
          color: lightSlate,
        });

        const imageScale =
          Math.min(
            (
              imageBoxWidth -
              6
            ) /
              productImage.width,
            (
              imageBoxHeight -
              6
            ) /
              productImage.height,
          );

        const imageWidth =
          productImage.width *
          imageScale;

        const imageHeight =
          productImage.height *
          imageScale;

        page.drawImage(
          productImage,
          {
            x:
              tableColumns
                .description +
              (
                imageBoxWidth -
                imageWidth
              ) /
                2,
            y:
              y -
              rowHeight +
              (
                rowHeight -
                imageBoxHeight
              ) / 2 +
              3 +
              (
                imageBoxHeight -
                imageHeight
              ) / 2,
            width: imageWidth,
            height: imageHeight,
          },
        );
      }

      const valueY =
        y -
        rowHeight / 2 +
        4;

      const textBaselineSpan =
        promotionLines.length > 0
          ? nameLines.length *
              11 +
            (
              promotionLines.length -
              1
            ) *
              9
          : Math.max(
              nameLines.length - 1,
              0,
            ) * 11;

      let nameY =
        valueY +
        textBaselineSpan / 2;

      for (
        const line of
        nameLines
      ) {
        page.drawText(
          line,
          {
            x: productTextX,
            y: nameY,
            size: 8,
            font: bold,
            color: navy,
          },
        );

        nameY -= 11;
      }

      for (
        const line of
        promotionLines
      ) {
        page.drawText(
          line,
          {
            x: productTextX,
            y: nameY,
            size: 7,
            font: regular,
            color: emerald,
          },
        );

        nameY -= 9;
      }

      page.drawText(
        String(
          item.quantity,
        ),
        {
          x:
            tableColumns
              .quantity,
          y: valueY,
          size: 8,
          font: regular,
          color: navy,
        },
      );

      page.drawText(
        formatMoney(
          item.unitPrice,
          quote.currency,
        ),
        {
          x:
            tableColumns
              .unitPrice,
          y: valueY,
          size: 7,
          font: regular,
          color: navy,
        },
      );

      page.drawText(
        formatMoney(
          item.discountAmount,
          quote.currency,
        ),
        {
          x:
            tableColumns
              .discount,
          y: valueY,
          size: 7,
          font: regular,
          color:
            item.discountAmount >
              0
              ? emerald
              : slate,
        },
      );

      page.drawText(
        formatMoney(
          item.totalAmount,
          quote.currency,
        ),
        {
          x:
            tableColumns
              .total,
          y: valueY,
          size: 7,
          font: bold,
          color: navy,
        },
      );

      y -= rowHeight;
    }

    y -= 8;

    ensureSpace(112);

    const totalsX =
      PAGE_WIDTH -
      MARGIN -
      210;

    const totalRows: Array<
      [string, number]
    > = [
        [
          "Subtotal",
          quote.baseAmount,
        ],
        [
          "Descuento",
          quote.discountAmount,
        ],
        [
          "Impuestos",
          quote.taxAmount,
        ],
        [
          "Ajuste",
          quote.adjustmentAmount,
        ],
      ];

    for (
      const [
        label,
        value,
      ] of totalRows
    ) {
      page.drawText(
        label,
        {
          x: totalsX,
          y,
          size: 8,
          font: regular,
          color: slate,
        },
      );

      const formatted =
        formatMoney(
          value,
          quote.currency,
        );

      page.drawText(
        formatted,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            regular.widthOfTextAtSize(
              formatted,
              8,
            ),
          y,
          size: 8,
          font: regular,
          color: navy,
        },
      );

      y -= 16;
    }

    page.drawLine({
      start: {
        x: totalsX,
        y: y + 6,
      },
      end: {
        x:
          PAGE_WIDTH -
          MARGIN,
        y: y + 6,
      },
      thickness: 1,
      color: navy,
    });

    const finalTotal =
      formatMoney(
        quote.totalAmount,
        quote.currency,
      );

    page.drawText(
      "TOTAL",
      {
        x: totalsX,
        y: y - 10,
        size: 11,
        font: bold,
        color: navy,
      },
    );

    page.drawText(
      finalTotal,
      {
        x:
          PAGE_WIDTH -
          MARGIN -
          bold.widthOfTextAtSize(
            finalTotal,
            13,
          ),
        y: y - 12,
        size: 13,
        font: bold,
        color: emerald,
      },
    );

    y -= 48;

    const financedItems =
      quote.items.filter(
        (item) =>
          item.financingMonths &&
          item.financingMonths >
          0,
      );

    if (
      financedItems.length >
      0
    ) {
      drawSectionTitle(
        "Condiciones de financiamiento",
      );

      for (
        const item of
        financedItems
      ) {
        ensureSpace(62);

        drawText(
          item.name,
          {
            size: 9,
            font: bold,
          },
        );

        drawText(
          [
            `${item.financingMonths} meses`,
            `Enganche: ${formatMoney(item.customerDownPayment, quote.currency)}`,
            `Saldo: ${formatMoney(item.financedAmount ?? 0, quote.currency)}`,
            `Mensualidad estimada: ${formatMoney(item.estimatedPayment ?? 0, quote.currency)}`,
          ].join("  |  "),
          {
            size: 8,
            color: slate,
            lineHeight: 11,
          },
        );

        y -= 8;
      }
    }

    const technicalItems =
      quote.items
        .map((item) => ({
          item,

          rows:
            getTechnicalSpecificationRows(
              item
                .technicalSpecifications,
            ),
        }))
        .filter(
          ({ rows }) =>
            rows.length > 0,
        );

    if (
      technicalItems.length > 0
    ) {
      drawSectionTitle(
        "Ficha técnica",
      );

      for (
        const {
          item,
          rows,
        } of technicalItems
      ) {
        ensureSpace(38);

        drawText(
          item.name,
          {
            size: 10,
            font: bold,
            color: navy,
            lineHeight: 13,
          },
        );

        y -= 4;

        for (
          let index = 0;
          index < rows.length;
          index += 2
        ) {
          const left =
            rows[index];

          const right =
            rows[index + 1];

          const leftLines =
            wrapText(
              left.value,
              regular,
              8,
              columnWidth,
            );

          const rightLines =
            right
              ? wrapText(
                  right.value,
                  regular,
                  8,
                  columnWidth,
                )
              : [];

          const rowHeight =
            Math.max(
              30,
              Math.max(
                leftLines.length,
                rightLines.length,
              ) *
                10 +
                13,
            );

          ensureSpace(
            rowHeight,
          );

          page.drawText(
            left.label
              .toUpperCase(),
            {
              x: MARGIN,
              y,
              size: 6.5,
              font: bold,
              color: slate,
            },
          );

          let leftY =
            y - 12;

          for (
            const line of leftLines
          ) {
            page.drawText(
              line,
              {
                x: MARGIN,
                y: leftY,
                size: 8,
                font: regular,
                color: navy,
              },
            );

            leftY -= 10;
          }

          if (right) {
            page.drawText(
              right.label
                .toUpperCase(),
              {
                x:
                  MARGIN +
                  columnWidth +
                  20,
                y,
                size: 6.5,
                font: bold,
                color: slate,
              },
            );

            let rightY =
              y - 12;

            for (
              const line of
              rightLines
            ) {
              page.drawText(
                line,
                {
                  x:
                    MARGIN +
                    columnWidth +
                    20,
                  y: rightY,
                  size: 8,
                  font: regular,
                  color: navy,
                },
              );

              rightY -= 10;
            }
          }

          y -= rowHeight;
        }

        y -= 6;
      }
    }

    const billingAddress =
      formatAddress(
        quote.billingAddress,
      );

    const shippingAddress =
      formatAddress(
        quote.shippingAddress,
      );

    if (
      billingAddress ||
      shippingAddress
    ) {
      drawSectionTitle(
        "Direcciones",
      );

      ensureSpace(70);

      drawLabelValue(
        "FACTURACIÓN",
        billingAddress ||
        "Sin información",
        MARGIN,
        columnWidth,
      );

      drawLabelValue(
        "ENVÍO",
        shippingAddress ||
        "Sin información",
        MARGIN +
        columnWidth +
        20,
        columnWidth,
      );

      y -= 64;
    }

    if (
      quote.commercialSummary
    ) {
      drawSectionTitle(
        "Resumen comercial",
      );

      drawText(
        quote.commercialSummary,
        {
          size: 9,
          color: slate,
          lineHeight: 13,
        },
      );

      y -= 12;
    }

    if (
      quote.termsAndConditions
    ) {
      drawSectionTitle(
        "Términos y condiciones",
      );

      drawText(
        quote.termsAndConditions,
        {
          size: 8,
          color: slate,
          lineHeight: 12,
        },
      );

      y -= 12;
    }

    if (quote.description) {
      drawSectionTitle(
        "Descripción",
      );

      drawText(
        quote.description,
        {
          size: 8,
          color: slate,
          lineHeight: 12,
        },
      );
    }

    const pages =
      pdf.getPages();

    pages.forEach(
      (
        currentPage,
        index,
      ) => {
        const footerParts = [
          tenant.legalName ??
          tenant.name,
          tenant.taxId
            ? `RFC: ${tenant.taxId}`
            : "",
          companyPhone,
          companyEmail,
          companyWebsite,
          companyAddress,
        ].filter(Boolean);

        const footer =
          footerParts.join(
            " · ",
          );

        const footerLines =
          wrapText(
            footer,
            regular,
            6.5,
            CONTENT_WIDTH - 60,
          );

        currentPage.drawLine({
          start: {
            x: MARGIN,
            y: 42,
          },
          end: {
            x:
              PAGE_WIDTH -
              MARGIN,
            y: 42,
          },
          thickness: 0.5,
          color: lightSlate,
        });

        currentPage.drawText(
          footerLines[0] ?? "",
          {
            x: MARGIN,
            y: 27,
            size: 6.5,
            font: regular,
            color: slate,
          },
        );

        const pageNumber =
          `Página ${index + 1} de ${pages.length}`;

        currentPage.drawText(
          pageNumber,
          {
            x:
              PAGE_WIDTH -
              MARGIN -
              regular.widthOfTextAtSize(
                pageNumber,
                6.5,
              ),
            y: 27,
            size: 6.5,
            font: regular,
            color: slate,
          },
        );
      },
    );

    const pdfBytes =
      await pdf.save();

    const fileName =
      safeFileName(
        `cotizacion-${quote.quoteNumber}`,
      );

    return new Response(
      new Blob([
        pdfBytes as unknown as BlobPart,
      ]),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}.pdf"`,

          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    const status =
      error instanceof ApiError ||
      error instanceof
        CRMPermissionError
        ? error.status
        : 500;

    console.error(
      "Error al generar PDF de cotización:",
      error,
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "No fue posible generar el PDF.",
      },
      {
        status,
      },
    );
  }
}