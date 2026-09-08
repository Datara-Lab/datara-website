import {
  asc,
  eq,
} from "drizzle-orm";

import {
  getCRMIndustryTemplate,
} from "@/config/crm/industries";

import { db } from "@/db";

import {
  crmProductCategories,
  crmProductTypes,
} from "@/db/schema";

import type {
  CRMIndustry,
} from "@/types/crm-config";

export async function provisionCRMProductCatalog(
  tenantId: string,
  industry: string,
) {
  const template =
    getCRMIndustryTemplate(
      industry as
        CRMIndustry,
    );

  if (
    !template
      .defaultProductTypes
      .length
  ) {
    return;
  }

  await db
    .insert(
      crmProductTypes,
    )
    .values(
      template
        .defaultProductTypes
        .map(
          (productType) => ({
            tenantId,

            key:
              productType.key,

            name:
              productType.name,

            inventoryTracked:
              productType
                .inventoryTracked,

            technicalProfile:
              productType
                .technicalProfile ??
              null,

            active: true,

            sortOrder:
              productType
                .sortOrder,

            metadata: {
              provisionedFromTemplate:
                template.id,

              technicalFields:
                productType
                  .technicalFields ??
                [],
            },
          }),
        ),
    )
    .onConflictDoNothing({
      target: [
        crmProductTypes
          .tenantId,
        crmProductTypes.key,
      ],
    });

    const storedTemplateTypes =
    await db
      .select()
      .from(
        crmProductTypes,
      )
      .where(
        eq(
          crmProductTypes
            .tenantId,
          tenantId,
        ),
      );

  const now =
    new Date();

  for (
    const productType of
    template.defaultProductTypes
  ) {
    const storedType =
      storedTemplateTypes.find(
        (item) =>
          item.key ===
          productType.key,
      );

    const storedMetadata =
      storedType?.metadata &&
      typeof storedType.metadata ===
        "object" &&
      !Array.isArray(
        storedType.metadata,
      )
        ? storedType.metadata
        : {};

    if (
      !storedType ||
      storedMetadata
        .provisionedFromTemplate !==
        template.id
    ) {
      continue;
    }

    await db
      .update(
        crmProductTypes,
      )
      .set({
        technicalProfile:
          productType
            .technicalProfile ??
          null,

        inventoryTracked:
          productType
            .inventoryTracked,

        sortOrder:
          productType
            .sortOrder,

        metadata: {
          ...storedMetadata,

          provisionedFromTemplate:
            template.id,

          technicalFields:
            productType
              .technicalFields ??
            [],
        },

        updatedAt:
          now,
      })
      .where(
        eq(
          crmProductTypes.id,
          storedType.id,
        ),
      );
  }

  const storedTypes =
    await db
      .select()
      .from(
        crmProductTypes,
      )
      .where(
        eq(
          crmProductTypes
            .tenantId,
          tenantId,
        ),
      )
      .orderBy(
        asc(
          crmProductTypes
            .sortOrder,
        ),
      );

  const storedTypeByKey =
    new Map(
      storedTypes.map(
        (productType) => [
          productType.key,
          productType,
        ],
      ),
    );

  const categoryRows =
    template
      .defaultProductTypes
      .flatMap(
        (productType) => {
          const storedType =
            storedTypeByKey.get(
              productType.key,
            );

          if (!storedType) {
            return [];
          }

          const catalogCategories =
            productType
              .categoryCatalogKey
              ? template
                  .defaultCatalogs[
                    productType
                      .categoryCatalogKey
                  ]?.map(
                    (option) =>
                      option.value,
                  ) ?? []
              : [];

          const categories =
            Array.from(
              new Set([
                ...catalogCategories,
                ...(
                  productType
                    .categories ??
                  []
                ),
              ]),
            );

          const legacyItemType:
            | "model"
            | "product"
            | "service" =
            productType
              .technicalProfile ===
              "motorcycle_model"
              ? "model"
              : productType
                    .inventoryTracked
                ? "product"
                : "service";

          return categories.map(
            (
              name,
              index,
            ) => ({
              tenantId,

              productTypeId:
                storedType.id,

              /*
               * Compatibilidad temporal
               * durante la transición.
               */
              itemType:
                legacyItemType,

              name,
              active: true,

              sortOrder:
                (
                  index +
                  1
                ) *
                10,

              metadata: {
                provisionedFromTemplate:
                  template.id,
              },
            }),
          );
        },
      );

  if (
    categoryRows.length >
    0
  ) {
    await db
      .insert(
        crmProductCategories,
      )
      .values(
        categoryRows,
      )
      .onConflictDoNothing({
        target: [
          crmProductCategories
            .tenantId,
          crmProductCategories
            .productTypeId,
          crmProductCategories
            .name,
        ],
      });
  }
}

export default provisionCRMProductCatalog;
