"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";

type ProductType = {
  id: string;
  key: string;
  name: string;
  inventoryTracked: boolean;
  technicalProfile:
    | string
    | null;
  active: boolean;
  sortOrder: number;
};

type Category = {
  id: string;
  productTypeId: string;
  itemType: string;
  productTypeName: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

type ProductTypesResponse = {
  success: boolean;
  data?: ProductType[];
  message?: string;
  error?: string;
};

type CategoriesResponse = {
  success: boolean;
  data?: Category[];
  message?: string;
  error?: string;
};

export default function CatalogSettingsPage() {
  const [
    productTypes,
    setProductTypes,
  ] = useState<
    ProductType[]
  >([]);

  const [
    selectedProductTypeId,
    setSelectedProductTypeId,
  ] = useState("");

  const [
    showDiscontinuedTypes,
    setShowDiscontinuedTypes,
  ] = useState(false);

  const [
    categories,
    setCategories,
  ] = useState<
    Category[]
  >([]);

  const [
    newTypeName,
    setNewTypeName,
  ] = useState("");

  const [
    newTypeInventory,
    setNewTypeInventory,
  ] = useState(false);

  const [
    newCategoryNames,
    setNewCategoryNames,
  ] = useState<
    Record<string, string>
  >({});

  const [
    categorySearch,
    setCategorySearch,
  ] = useState("");

  const [
    categoryStatusFilter,
    setCategoryStatusFilter,
  ] = useState<
    "all" |
    "active" |
    "inactive"
  >("all");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    savingId,
    setSavingId,
  ] = useState<
    string |
    null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<
    string |
    null
  >(null);

  const loadCatalog =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          typesResponse,
          categoriesResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/crm/product-types",
              {
                cache:
                  "no-store",
              },
            ),

            fetch(
              "/api/crm/product-categories",
              {
                cache:
                  "no-store",
              },
            ),
          ]);

        const typesResult =
          (await typesResponse.json()) as
            ProductTypesResponse;

        const categoriesResult =
          (await categoriesResponse.json()) as
            CategoriesResponse;

        if (
          !typesResponse.ok ||
          !typesResult.success ||
          !typesResult.data
        ) {
          throw new Error(
            typesResult.error ??
              "No fue posible cargar los tipos de elemento.",
          );
        }

        if (
          !categoriesResponse.ok ||
          !categoriesResult.success ||
          !categoriesResult.data
        ) {
          throw new Error(
            categoriesResult.error ??
              "No fue posible cargar las categorías.",
          );
        }

        setProductTypes(
          typesResult.data,
        );

        setSelectedProductTypeId(
          (current) =>
            typesResult.data
              ?.some(
                (productType) =>
                  productType.id ===
                    current,
              )
              ? current
              : typesResult.data
                  ?.find(
                    (productType) =>
                      productType.active,
                  )
                  ?.id ??
                typesResult.data?.[0]
                  ?.id ??
                "",
        );

        setCategories(
          categoriesResult.data,
        );
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "No fue posible cargar la configuración del catálogo.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadCatalog();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    loadCatalog,
  ]);

  function updateProductType(
    id: string,
    values:
      Partial<ProductType>,
  ) {
    setProductTypes(
      (current) =>
        current.map(
          (productType) =>
            productType.id === id
              ? {
                  ...productType,
                  ...values,
                }
              : productType,
        ),
    );
  }

  function updateCategory(
    id: string,
    values:
      Partial<Category>,
  ) {
    setCategories(
      (current) =>
        current.map(
          (category) =>
            category.id === id
              ? {
                  ...category,
                  ...values,
                }
              : category,
        ),
    );
  }

  async function createProductType() {
    const name =
      newTypeName.trim();

    if (!name) {
      setError(
        "Escribe el nombre del tipo de elemento.",
      );
      return;
    }

    try {
      setSavingId(
        "new-type",
      );
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/product-types",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,

                inventoryTracked:
                  newTypeInventory,

                sortOrder:
                  (
                    productTypes
                      .length +
                    1
                  ) *
                  10,
              }),
          },
        );

      const result =
        (await response.json()) as
          ProductTypesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible crear el tipo de elemento.",
        );
      }

      setNewTypeName("");
      setNewTypeInventory(
        false,
      );

      setMessage(
        result.message ??
          "El tipo fue creado correctamente.",
      );

      await loadCatalog();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible crear el tipo de elemento.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function saveProductType(
    productType:
      ProductType,
  ) {
    try {
      setSavingId(
        `type:${productType.id}`,
      );
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/product-types",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  productType.id,

                name:
                  productType.name,

                inventoryTracked:
                  productType
                    .inventoryTracked,

                active:
                  productType.active,

                sortOrder:
                  productType
                    .sortOrder,
              }),
          },
        );

      const result =
        (await response.json()) as
          ProductTypesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible actualizar el tipo.",
        );
      }

      setMessage(
        result.message ??
          "El tipo fue actualizado correctamente.",
      );

      await loadCatalog();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible actualizar el tipo.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function createCategory(
    productType:
      ProductType,
  ) {
    const name =
      (
        newCategoryNames[
          productType.id
        ] ?? ""
      ).trim();

    if (!name) {
      setError(
        "Escribe el nombre de la categoría.",
      );
      return;
    }

    const typeCategories =
      categories.filter(
        (category) =>
          category
            .productTypeId ===
          productType.id,
      );

    try {
      setSavingId(
        `new-category:${productType.id}`,
      );
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/product-categories",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                productTypeId:
                  productType.id,

                name,

                sortOrder:
                  (
                    typeCategories
                      .length +
                    1
                  ) *
                  10,
              }),
          },
        );

      const result =
        (await response.json()) as
          CategoriesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible crear la categoría.",
        );
      }

      setNewCategoryNames(
        (current) => ({
          ...current,
          [productType.id]:
            "",
        }),
      );

      setMessage(
        result.message ??
          "La categoría fue creada correctamente.",
      );

      await loadCatalog();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible crear la categoría.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function saveCategory(
    category:
      Category,
  ) {
    try {
      setSavingId(
        `category:${category.id}`,
      );
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/product-categories",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  category.id,

                productTypeId:
                  category
                    .productTypeId,

                name:
                  category.name,

                active:
                  category.active,

                sortOrder:
                  category
                    .sortOrder,
              }),
          },
        );

      const result =
        (await response.json()) as
          CategoriesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible actualizar la categoría.",
        );
      }

      setMessage(
        result.message ??
          "La categoría fue actualizada correctamente.",
      );

      await loadCatalog();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible actualizar la categoría.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function deleteProductType(
    productType:
      ProductType,
  ) {
    const confirmed =
      window.confirm(
        `¿Eliminar el tipo "${productType.name}" y todas sus categorías? Esta acción no se puede deshacer.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSavingId(
        `delete:${productType.id}`,
      );
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/product-types",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  productType.id,
              }),
          },
        );

      const result =
        (await response.json()) as
          ProductTypesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible eliminar el tipo.",
        );
      }

      setSelectedProductTypeId(
        "",
      );

      setMessage(
        result.message ??
          "El tipo fue eliminado correctamente.",
      );

      await loadCatalog();
    } catch (deleteError) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "No fue posible eliminar el tipo.",
      );
    } finally {
      setSavingId(null);
    }
  }

  const discontinuedTypeCount =
    productTypes.filter(
      (productType) =>
        !productType.active,
    ).length;

  /*
   * El tipo seleccionado permanece visible
   * mientras se edita, aunque se haya marcado
   * localmente como inactivo antes de guardar.
   */
  const visibleProductTypes =
    productTypes.filter(
      (productType) =>
        showDiscontinuedTypes ||
        productType.active ||
        productType.id ===
          selectedProductTypeId,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Configuración"
          title="Tipos y categorías del catálogo"
          description="Personaliza qué elementos administra tu empresa y cuáles generan existencias."
          action={
            <a
              href="/crm/configuracion"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a configuración
            </a>
          }
        />

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Nuevo tipo de elemento
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Por ejemplo: Modelo, Refacción, Medicamento, Tratamiento o Suscripción.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={
                newTypeName
              }
              maxLength={
                100
              }
              placeholder="Nombre del tipo"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              onChange={(
                event,
              ) =>
                setNewTypeName(
                  event.target
                    .value,
                )
              }
            />

            <label className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={
                  newTypeInventory
                }
                onChange={(
                  event,
                ) =>
                  setNewTypeInventory(
                    event.target
                      .checked,
                  )
                }
              />

              Controla inventario
            </label>

            <button
              type="button"
              disabled={
                savingId ===
                "new-type"
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              onClick={() =>
                void createProductType()
              }
            >
              Agregar tipo
            </button>
          </div>
        </section>

        {!isLoading &&
          productTypes.length >
            0 && (
          <section className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {visibleProductTypes.length <=
              5 ? (
                <div className="inline-flex max-w-full flex-wrap rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  {visibleProductTypes.map(
                    (
                      productType,
                    ) => {
                      const selected =
                        productType.id ===
                        selectedProductTypeId;

                      return (
                        <button
                          key={
                            productType.id
                          }
                          type="button"
                          className={[
                            "rounded-xl px-4 py-2 text-sm font-semibold transition",
                            selected
                              ? "bg-blue-600 text-white shadow-sm"
                              : productType.active
                                ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                : "text-slate-400 hover:bg-slate-50",
                          ].join(
                            " ",
                          )}
                          onClick={() =>
                            setSelectedProductTypeId(
                              productType.id,
                            )
                          }
                        >
                          {productType.name}

                          {!productType.active && (
                            <span className="ml-2 text-xs opacity-75">
                              Descontinuado
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <select
                  value={
                    selectedProductTypeId
                  }
                  className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500"
                  onChange={(
                    event,
                  ) =>
                    setSelectedProductTypeId(
                      event.target
                        .value,
                    )
                  }
                >
                  {visibleProductTypes.map(
                    (
                      productType,
                    ) => (
                      <option
                        key={
                          productType.id
                        }
                        value={
                          productType.id
                        }
                      >
                        {productType.name}
                        {!productType.active
                          ? " · Descontinuado"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              )}

              {discontinuedTypeCount >
                0 && (
                <button
                  type="button"
                  className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-950 sm:self-auto"
                  onClick={() => {
                    const nextValue =
                      !showDiscontinuedTypes;

                    setShowDiscontinuedTypes(
                      nextValue,
                    );

                    if (
                      !nextValue &&
                      productTypes.find(
                        (productType) =>
                          productType.id ===
                          selectedProductTypeId,
                      )?.active ===
                        false
                    ) {
                      setSelectedProductTypeId(
                        productTypes.find(
                          (productType) =>
                            productType.active,
                        )?.id ?? "",
                      );
                    }
                  }}
                >
                  {showDiscontinuedTypes
                    ? "Ocultar descontinuados"
                    : `Mostrar descontinuados (${discontinuedTypeCount})`}
                </button>
              )}
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-500">
            Cargando catálogo...
          </div>
        ) : (
          <div className="mt-6 max-w-6xl">
            {productTypes
              .filter(
                (productType) =>
                  productType.id ===
                    selectedProductTypeId,
              )
              .map(
              (
                productType,
              ) => {
                const typeCategories =
                  categories.filter(
                    (category) =>
                      category
                        .productTypeId ===
                      productType.id,
                  );

                const normalizedCategorySearch =
                  categorySearch
                    .trim()
                    .toLowerCase();

                const visibleCategories =
                  typeCategories.filter(
                    (category) => {
                      if (
                        categoryStatusFilter ===
                          "active" &&
                        !category.active
                      ) {
                        return false;
                      }

                      if (
                        categoryStatusFilter ===
                          "inactive" &&
                        category.active
                      ) {
                        return false;
                      }

                      return (
                        !normalizedCategorySearch ||
                        category.name
                          .toLowerCase()
                          .includes(
                            normalizedCategorySearch,
                          )
                      );
                    },
                  );

                const activeCategoryCount =
                  typeCategories.filter(
                    (category) =>
                      category.active,
                  ).length;

                const inactiveCategoryCount =
                  typeCategories.length -
                  activeCategoryCount;

                return (
                  <section
                    key={
                      productType.id
                    }
                    className={[
                      "rounded-3xl border bg-white p-6 shadow-sm",
                      productType.active
                        ? "border-slate-200"
                        : "border-slate-200 opacity-70",
                    ].join(
                      " ",
                    )}
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="hidden grid-cols-[minmax(180px,1fr)_130px_80px_130px_190px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 lg:grid">
                        <span>
                          Tipo
                        </span>

                        <span>
                          Inventario
                        </span>

                        <span>
                          Orden
                        </span>

                        <span>
                          Estado
                        </span>

                        <span className="text-right">
                          Acciones
                        </span>
                      </div>

                      <div className="grid gap-3 bg-white px-4 py-4 lg:grid-cols-[minmax(180px,1fr)_130px_80px_130px_190px] lg:items-center">
                        <div className="min-w-0">
                          <input
                            value={
                              productType.name
                            }
                            maxLength={
                              100
                            }
                            aria-label="Nombre del tipo"
                            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-blue-500"
                            onChange={(
                              event,
                            ) =>
                              updateProductType(
                                productType.id,
                                {
                                  name:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />

                          {productType
                            .technicalProfile && (
                            <span className="mt-1.5 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              Perfil técnico: motocicleta
                            </span>
                          )}
                        </div>

                        <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 lg:justify-center">
                          <input
                            type="checkbox"
                            checked={
                              productType
                                .inventoryTracked
                            }
                            onChange={(
                              event,
                            ) =>
                              updateProductType(
                                productType.id,
                                {
                                  inventoryTracked:
                                    event
                                      .target
                                      .checked,
                                },
                              )
                            }
                          />

                          Controla
                        </label>

                        <input
                          type="number"
                          min={
                            0
                          }
                          value={
                            productType
                              .sortOrder
                          }
                          aria-label="Orden del tipo"
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500"
                          onChange={(
                            event,
                          ) =>
                            updateProductType(
                              productType.id,
                              {
                                sortOrder:
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                              },
                            )
                          }
                        />

                        <button
                          type="button"
                          className={[
                            "rounded-lg px-3 py-2 text-xs font-bold",
                            productType.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          ].join(
                            " ",
                          )}
                          onClick={() =>
                            updateProductType(
                              productType.id,
                              {
                                active:
                                  !productType
                                    .active,
                              },
                            )
                          }
                        >
                          {productType.active
                            ? "Activo"
                            : "Descontinuado"}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={
                              savingId ===
                              `type:${productType.id}`
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            onClick={() =>
                              void saveProductType(
                                productType,
                              )
                            }
                          >
                            Guardar
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingId ===
                                `delete:${productType.id}` ||
                              productTypes.length <=
                                1
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              productTypes.length <=
                              1
                                ? "El catálogo debe conservar al menos un tipo."
                                : "Eliminar tipo"
                            }
                            onClick={() =>
                              void deleteProductType(
                                productType,
                              )
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="my-6 border-t border-slate-200" />

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="font-black text-slate-950">
                          Categorías
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {activeCategoryCount} activas
                          {" · "}
                          {inactiveCategoryCount} descontinuadas
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="search"
                          value={
                            categorySearch
                          }
                          placeholder="Buscar categoría..."
                          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:w-56"
                          onChange={(
                            event,
                          ) =>
                            setCategorySearch(
                              event.target
                                .value,
                            )
                          }
                        />

                        <select
                          value={
                            categoryStatusFilter
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                          onChange={(
                            event,
                          ) =>
                            setCategoryStatusFilter(
                              event.target
                                .value as
                                | "all"
                                | "active"
                                | "inactive",
                            )
                          }
                        >
                          <option value="all">
                            Todas
                          </option>

                          <option value="active">
                            Activas
                          </option>

                          <option value="inactive">
                            Descontinuadas
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        value={
                          newCategoryNames[
                            productType.id
                          ] ?? ""
                        }
                        maxLength={
                          100
                        }
                        placeholder="Nueva categoría"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        onChange={(
                          event,
                        ) =>
                          setNewCategoryNames(
                            (
                              current,
                            ) => ({
                              ...current,
                              [productType.id]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />

                      <button
                        type="button"
                        disabled={
                          savingId ===
                          `new-category:${productType.id}`
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        onClick={() =>
                          void createCategory(
                            productType,
                          )
                        }
                      >
                        Agregar
                      </button>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="hidden grid-cols-[minmax(0,1fr)_80px_130px_90px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 md:grid">
                        <span>
                          Nombre
                        </span>

                        <span>
                          Orden
                        </span>

                        <span>
                          Estado
                        </span>

                        <span className="text-right">
                          Acción
                        </span>
                      </div>

                      <div className="divide-y divide-slate-200 bg-white">
                        {visibleCategories.map(
                          (
                            category,
                          ) => (
                            <article
                              key={
                                category.id
                              }
                              className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_80px_130px_90px] md:items-center"
                            >
                              <input
                                value={
                                  category.name
                                }
                                maxLength={
                                  100
                                }
                                aria-label="Nombre de categoría"
                                className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                                onChange={(
                                  event,
                                ) =>
                                  updateCategory(
                                    category.id,
                                    {
                                      name:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />

                              <input
                                type="number"
                                min={
                                  0
                                }
                                value={
                                  category
                                    .sortOrder
                                }
                                aria-label="Orden de categoría"
                                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-blue-500"
                                onChange={(
                                  event,
                                ) =>
                                  updateCategory(
                                    category.id,
                                    {
                                      sortOrder:
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ),
                                    },
                                  )
                                }
                              />

                              <button
                                type="button"
                                className={[
                                  "rounded-lg px-3 py-2 text-xs font-bold",
                                  category.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600",
                                ].join(
                                  " ",
                                )}
                                onClick={() =>
                                  updateCategory(
                                    category.id,
                                    {
                                      active:
                                        !category
                                          .active,
                                    },
                                  )
                                }
                              >
                                {category.active
                                  ? "Activa"
                                  : "Descontinuada"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  savingId ===
                                  `category:${category.id}`
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                onClick={() =>
                                  void saveCategory(
                                    category,
                                  )
                                }
                              >
                                Guardar
                              </button>
                            </article>
                          ),
                        )}

                        {visibleCategories
                          .length ===
                          0 && (
                          <p className="px-4 py-10 text-center text-sm text-slate-500">
                            {typeCategories
                              .length ===
                              0
                              ? "Este tipo todavía no tiene categorías."
                              : "No hay categorías que coincidan con los filtros."}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}
