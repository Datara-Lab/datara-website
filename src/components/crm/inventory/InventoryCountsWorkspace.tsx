"use client";

import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import DataraTableScroll from "@/components/shared/DataraTableScroll";
import Button from "@/components/ui/Button";

type CountStatus =
    | "Borrador"
    | "En revisión"
    | "Aprobado"
    | "Cancelado";

type CountItem = {
    id: string;
    countId: string;
    stockId: string;
    productId: string;
    productName: string;

    productCode:
    | string
    | null;

    expectedQuantity: number;

    countedQuantity:
    | number
    | null;

    difference:
    | number
    | null;

    notes:
    | string
    | null;
};

type InventoryCount = {
    id: string;
    reference: string;
    status: CountStatus;

    notes:
    | string
    | null;

    locationId: string;
    locationName: string;
    locationLabel: string;

    branchId:
    | string
    | null;

    branchName:
    | string
    | null;

    branchLabel: string;

    createdByName:
    | string
    | null;

    submittedByName:
    | string
    | null;

    submittedAt:
    | string
    | null;

    approvedByName:
    | string
    | null;

    approvedAt:
    | string
    | null;

    cancellationReason:
    | string
    | null;

    createdAt: string;
    updatedAt: string;

    itemCount: number;
    countedItemCount: number;
    differenceCount: number;

    items: CountItem[];
};

type CountsResponse = {
    success: boolean;
    data?: InventoryCount[];
    error?: string;
};

type CountWriteResponse = {
    success: boolean;
    message?: string;
    error?: string;

    data?: {
        id: string;
        status: CountStatus;
    };
};

type ProductOption = {
    id: string;
    name: string;

    code?:
    | string
    | null;

    active?: boolean;
};

type ProductsResponse = {
    success: boolean;
    data?: ProductOption[];
    error?: string;
};

export type InventoryCountLocation = {
    value: string;
    label: string;

    branchLabel:
    | string
    | null;

    active: boolean;
};

type InventoryCountsWorkspaceProps = {
    locations:
    InventoryCountLocation[];

    canCreate: boolean;
    canEdit: boolean;

    onInventoryChanged:
    () => Promise<void>;
};

type EditableCountItem = {
    id: string;
    productName: string;

    productCode:
    | string
    | null;

    expectedQuantity: number;
    countedQuantity: string;
    notes: string;
};

function formatDate(
    value: string,
) {
    return new Intl.DateTimeFormat(
        "es-MX",
        {
            dateStyle: "medium",
            timeStyle: "short",
        },
    ).format(
        new Date(value),
    );
}

function getStatusClassName(
    status: CountStatus,
) {
    if (
        status === "Aprobado"
    ) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }

    if (
        status === "En revisión"
    ) {
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
    }

    if (
        status === "Cancelado"
    ) {
        return "bg-red-50 text-red-700 ring-red-600/20";
    }

    return "bg-amber-50 text-amber-700 ring-amber-600/20";
}

export default function InventoryCountsWorkspace({
  locations,
  canCreate,
  canEdit,
  onInventoryChanged,
}: InventoryCountsWorkspaceProps) {
  const [
    counts,
    setCounts,
  ] = useState<InventoryCount[]>(
    [],
  );

  const [
    selectedCount,
    setSelectedCount,
  ] = useState<InventoryCount | null>(
    null,
  );

  const [
    editableItems,
    setEditableItems,
  ] = useState<EditableCountItem[]>(
    [],
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    createLocationId,
    setCreateLocationId,
  ] = useState("");

  const [
    createNotes,
    setCreateNotes,
  ] = useState("");

  const [
    products,
    setProducts,
  ] = useState<ProductOption[]>(
    [],
  );

  const [
    isAddFoundOpen,
    setIsAddFoundOpen,
  ] = useState(false);

  const [
    foundProductId,
    setFoundProductId,
  ] = useState("");

  const [
    foundQuantity,
    setFoundQuantity,
  ] = useState("");

  const [
    foundNotes,
    setFoundNotes,
  ] = useState(
    "Encontrado durante conteo físico",
  );

  const [
    editorNotes,
    setEditorNotes,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadCounts =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/crm/inventory/counts",
            {
              cache: "no-store",
            },
          );

        const payload =
          (await response.json()) as
            CountsResponse;

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.error ??
              "No fue posible cargar los conteos físicos.",
          );
        }

        const nextCounts =
          payload.data ?? [];

        setCounts(
          nextCounts,
        );

        return nextCounts;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar los conteos físicos.",
        );

        return [];
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadCounts();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    loadCounts,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProducts() {
      try {
        const response =
          await fetch(
            "/api/crm/products",
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          );

        const payload =
          (await response.json()) as
            ProductsResponse;

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.error ??
              "No fue posible cargar los modelos.",
          );
        }

        setProducts(
          (payload.data ?? [])
            .filter(
              (product) =>
                product.active !==
                false,
            )
            .sort(
              (first, second) =>
                first.name.localeCompare(
                  second.name,
                  "es",
                ),
            ),
        );
      } catch (loadError) {
        if (
          loadError instanceof
            DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar los modelos.",
        );
      }
    }

    void loadProducts();

    return () =>
      controller.abort();
  }, []);

  const visibleCounts =
    useMemo(
      () =>
        counts.filter(
          (count) =>
            !statusFilter ||
            count.status ===
              statusFilter,
        ),
      [
        counts,
        statusFilter,
      ],
    );

  function openCount(
    count: InventoryCount,
  ) {
    setSelectedCount(
      count,
    );

    setEditorNotes(
      count.notes ?? "",
    );

    setEditableItems(
      count.items.map(
        (item) => ({
          id:
            item.id,

          productName:
            item.productName,

          productCode:
            item.productCode,

          expectedQuantity:
            item
              .expectedQuantity,

          countedQuantity:
            item.countedQuantity ===
            null
              ? ""
              : String(
                  item.countedQuantity,
                ),

          notes:
            item.notes ?? "",
        }),
      ),
    );

    setError(null);
  }

  async function handleCreate(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!createLocationId) {
      setError(
        "Selecciona una ubicación.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          "/api/crm/inventory/counts",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              locationId:
                createLocationId,

              notes:
                createNotes.trim() ||
                undefined,
            }),
          },
        );

      const payload =
        (await response.json()) as
          CountWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            "No fue posible iniciar el conteo.",
        );
      }

      setMessage(
        payload.message ??
          "El conteo fue iniciado correctamente.",
      );

      setIsCreateOpen(false);
      setCreateLocationId("");
      setCreateNotes("");

      await loadCounts();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No fue posible iniciar el conteo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateCountedQuantity(
    itemId: string,
    value: string,
  ) {
    setEditableItems(
      (current) =>
        current.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  countedQuantity:
                    value,
                }
              : item,
        ),
    );
  }

  function updateItemNotes(
    itemId: string,
    value: string,
  ) {
    setEditableItems(
      (current) =>
        current.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  notes: value,
                }
              : item,
        ),
    );
  }

    async function addFoundProduct(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedCount) {
      return;
    }

    if (!foundProductId) {
      setError(
        "Selecciona el modelo encontrado.",
      );
      return;
    }

    const countedQuantity =
      Number(foundQuantity);

    if (
      !Number.isInteger(
        countedQuantity,
      ) ||
      countedQuantity < 0
    ) {
      setError(
        "La cantidad encontrada debe ser un entero igual o mayor que cero.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          `/api/crm/inventory/counts/${selectedCount.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action:
                "Agregar modelo",

              productId:
                foundProductId,

              countedQuantity,

              reason:
                foundNotes.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
          CountWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible agregar el modelo encontrado.",
        );
      }

      setMessage(
        result.message ??
          "El modelo encontrado fue agregado al conteo.",
      );

      setFoundProductId("");
      setFoundQuantity("");

      setFoundNotes(
        "Encontrado durante conteo físico",
      );

      setIsAddFoundOpen(false);

      const refreshedCounts =
        await loadCounts();

      const refreshedCount =
        refreshedCounts.find(
          (count) =>
            count.id ===
            selectedCount.id,
        );

      if (refreshedCount) {
        openCount(
          refreshedCount,
        );
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible agregar el modelo encontrado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

    async function saveCount(
    action:
      | "Guardar"
      | "Enviar",
  ) {
    if (!selectedCount) {
      return;
    }

    const items =
      editableItems.map(
        (item) => {
          const countedQuantity =
            Number(
              item.countedQuantity,
            );

          if (
            !Number.isInteger(
              countedQuantity,
            ) ||
            countedQuantity < 0
          ) {
            throw new Error(
              `Captura una cantidad válida para ${item.productName}.`,
            );
          }

          return {
            id:
              item.id,

            countedQuantity,

            notes:
              item.notes.trim() ||
              undefined,
          };
        },
      );

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          `/api/crm/inventory/counts/${selectedCount.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action,
              items,

              notes:
                editorNotes.trim() ||
                undefined,
            }),
          },
        );

      const payload =
        (await response.json()) as
          CountWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            "No fue posible actualizar el conteo.",
        );
      }

      setMessage(
        payload.message ??
          "El conteo fue actualizado correctamente.",
      );

      setSelectedCount(null);

      await loadCounts();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible actualizar el conteo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewCount(
    action:
      | "Aprobar"
      | "Cancelar",
  ) {
    if (!selectedCount) {
      return;
    }

    const defaultReason =
      action === "Aprobar"
        ? "Ajuste por conteo físico"
        : "Conteo cancelado";

    const reason =
      window.prompt(
        action === "Aprobar"
          ? "Motivo o referencia de la aprobación:"
          : "Motivo de la cancelación:",
        defaultReason,
      );

    if (reason === null) {
      return;
    }

    const confirmation =
      action === "Aprobar"
        ? "¿Confirmas la aprobación? Las diferencias modificarán las existencias y generarán movimientos en el Kardex."
        : "¿Confirmas la cancelación del conteo?";

    if (
      !window.confirm(
        confirmation,
      )
    ) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const response =
        await fetch(
          `/api/crm/inventory/counts/${selectedCount.id}/review`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              action,

              reason:
                reason.trim() ||
                defaultReason,
            }),
          },
        );

      const payload =
        (await response.json()) as
          CountWriteResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
            "No fue posible revisar el conteo.",
        );
      }

      setMessage(
        payload.message ??
          "El conteo fue actualizado correctamente.",
      );

      setSelectedCount(null);

      await Promise.all([
        loadCounts(),
        onInventoryChanged(),
      ]);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "No fue posible revisar el conteo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

    return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Conteos físicos
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Compara las existencias registradas contra las unidades encontradas físicamente.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={
              statusFilter
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="">
              Todos los estados
            </option>

            <option value="Borrador">
              Borradores
            </option>

            <option value="En revisión">
              En revisión
            </option>

            <option value="Aprobado">
              Aprobados
            </option>

            <option value="Cancelado">
              Cancelados
            </option>
          </select>

          {canCreate && (
            <Button
              type="button"
              onClick={() => {
                setIsCreateOpen(
                  true,
                );

                setError(null);
              }}
            >
              Nuevo conteo
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="px-6 py-20 text-center text-sm font-semibold text-slate-500">
          Cargando conteos físicos...
        </div>
      ) : (
        <DataraTableScroll>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Referencia",
                  "Ubicación",
                  "Estado",
                  "Avance",
                  "Diferencias",
                  "Creado por",
                  "Fecha",
                  "Acciones",
                ].map(
                  (header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleCounts.map(
                (count) => (
                  <tr
                    key={
                      count.id
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-950">
                      {
                        count.reference
                      }
                    </td>

                    <td className="min-w-64 px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {
                          count.locationLabel
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          count.branchLabel
                        }
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                          getStatusClassName(
                            count.status,
                          ),
                        ].join(" ")}
                      >
                        {
                          count.status
                        }
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      {count.countedItemCount} de{" "}
                      {count.itemCount}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-amber-700">
                      {
                        count.differenceCount
                      }
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {count.createdByName ??
                        "Usuario"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(
                        count.createdAt,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          openCount(
                            count,
                          )
                        }
                      >
                        {count.status ===
                        "Borrador"
                          ? "Capturar"
                          : "Ver detalle"}
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </DataraTableScroll>
      )}

      {!isLoading &&
        visibleCounts.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center">
            <p className="font-bold text-slate-800">
              Aún no hay conteos físicos
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Inicia un conteo para comparar el inventario registrado con la existencia física.
            </p>
          </div>
        )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[170]">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              !isSubmitting &&
              setIsCreateOpen(
                false,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <form
              className="flex h-full flex-col"
              onSubmit={
                handleCreate
              }
            >
              <header className="border-b border-slate-200 bg-white px-6 py-5">
                <h2 className="text-2xl font-black text-slate-950">
                  Nuevo conteo físico
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Se cargarán todos los modelos inicializados en la ubicación.
                </p>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <label className="block text-sm font-semibold text-slate-700">
                  Ubicación *

                  <select
                    required
                    value={
                      createLocationId
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setCreateLocationId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona una ubicación
                    </option>

                    {locations
                      .filter(
                        (location) =>
                          location.active,
                      )
                      .map(
                        (location) => (
                          <option
                            key={
                              location.value
                            }
                            value={
                              location.value
                            }
                          >
                            {
                              location.label
                            }
                            {location.branchLabel
                              ? ` · ${location.branchLabel}`
                              : ""}
                          </option>
                        ),
                      )}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Notas

                  <textarea
                    rows={4}
                    value={
                      createNotes
                    }
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal"
                    onChange={(
                      event,
                    ) =>
                      setCreateNotes(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isSubmitting
                  }
                  onClick={() =>
                    setIsCreateOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Creando..."
                    : "Iniciar conteo"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {selectedCount && (
        <div className="fixed inset-0 z-[180]">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              !isSubmitting &&
              setSelectedCount(
                null,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {
                      selectedCount.reference
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {selectedCount.locationLabel} ·{" "}
                    {selectedCount.status}
                  </p>
                </div>

                {selectedCount.status ===
                  "Borrador" &&
                  canCreate && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setError(null);

                        setIsAddFoundOpen(
                          (current) =>
                            !current,
                        );
                      }}
                    >
                      {isAddFoundOpen
                        ? "Cerrar captura"
                        : "Agregar modelo encontrado"}
                    </Button>
                  )}
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {isAddFoundOpen &&
                selectedCount.status ===
                  "Borrador" && (
                  <form
                    className="rounded-[24px] border border-blue-200 bg-blue-50 p-5"
                    onSubmit={
                      addFoundProduct
                    }
                  >
                    <div>
                      <p className="font-bold text-blue-950">
                        Modelo encontrado durante el conteo
                      </p>

                      <p className="mt-1 text-sm text-blue-700">
                        Úsalo cuando el modelo físico no aparezca en las partidas de esta ubicación.
                      </p>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Modelo encontrado *

                        <select
                          required
                          value={
                            foundProductId
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          onChange={(
                            event,
                          ) =>
                            setFoundProductId(
                              event.target
                                .value,
                            )
                          }
                        >
                          <option value="">
                            Selecciona un modelo
                          </option>

                          {products
                            .filter(
                              (product) =>
                                !selectedCount.items.some(
                                  (item) =>
                                    item.productId ===
                                    product.id,
                                ),
                            )
                            .map(
                              (product) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {product.name}
                                  {product.code
                                    ? ` (${product.code})`
                                    : ""}
                                </option>
                              ),
                            )}
                        </select>
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Cantidad encontrada *

                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={
                            foundQuantity
                          }
                          placeholder="Unidades físicas"
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          onChange={(
                            event,
                          ) =>
                            setFoundQuantity(
                              event.target
                                .value,
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                        Nota

                        <input
                          value={
                            foundNotes
                          }
                          placeholder="Describe dónde fue encontrado"
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          onChange={(
                            event,
                          ) =>
                            setFoundNotes(
                              event.target
                                .value,
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          isSubmitting
                        }
                      >
                        {isSubmitting
                          ? "Agregando..."
                          : "Agregar al conteo"}
                      </Button>
                    </div>
                  </form>
                )}

              <DataraTableScroll>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Modelo",
                        "Sistema",
                        "Conteo físico",
                        "Diferencia",
                        "Notas",
                      ].map(
                        (header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase text-slate-500"
                          >
                            {header}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {editableItems.map(
                      (item) => {
                        const counted =
                          Number(
                            item.countedQuantity,
                          );

                        const difference =
                          item.countedQuantity ===
                          ""
                            ? null
                            : counted -
                              item.expectedQuantity;

                        return (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td className="min-w-60 px-4 py-3">
                              <p className="font-semibold text-slate-950">
                                {
                                  item.productName
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {item.productCode ??
                                  "Sin código"}
                              </p>
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-700">
                              {
                                item.expectedQuantity
                              }
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                disabled={
                                  selectedCount.status !==
                                  "Borrador"
                                }
                                value={
                                  item.countedQuantity
                                }
                                className="w-28 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                onChange={(
                                  event,
                                ) =>
                                  updateCountedQuantity(
                                    item.id,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>

                            <td className="px-4 py-3 font-black">
                              {difference ===
                              null
                                ? "—"
                                : difference >
                                    0
                                  ? `+${difference}`
                                  : difference}
                            </td>

                            <td className="px-4 py-3">
                              <input
                                disabled={
                                  selectedCount.status !==
                                  "Borrador"
                                }
                                value={
                                  item.notes
                                }
                                className="min-w-56 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                                onChange={(
                                  event,
                                ) =>
                                  updateItemNotes(
                                    item.id,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </DataraTableScroll>

              <textarea
                rows={3}
                disabled={
                  selectedCount.status !==
                  "Borrador"
                }
                value={
                  editorNotes
                }
                placeholder="Notas generales"
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100"
                onChange={(
                  event,
                ) =>
                  setEditorNotes(
                    event.target.value,
                  )
                }
              />
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setSelectedCount(
                    null,
                  )
                }
              >
                Cerrar
              </Button>

              {selectedCount.status ===
                "Borrador" &&
                canCreate && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void saveCount(
                        "Guardar",
                      )
                    }
                  >
                    Guardar borrador
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void saveCount(
                        "Enviar",
                      )
                    }
                  >
                    Enviar a revisión
                  </Button>
                </>
              )}

              {selectedCount.status ===
                "En revisión" &&
                canEdit && (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void reviewCount(
                        "Cancelar",
                      )
                    }
                  >
                    Cancelar conteo
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      void reviewCount(
                        "Aprobar",
                      )
                    }
                  >
                    Aprobar y ajustar
                  </Button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
