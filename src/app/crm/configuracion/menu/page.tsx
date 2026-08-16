"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import { useCRMConfig } from "@/hooks/useCRMConfig";

import type {
  CRMNavigationItemConfig,
} from "@/types/crm-config";

type NavigationSettingsResponse = {
  success: boolean;

  data?: {
    order: string[];

    labels:
      Record<
        string,
        string
      >;

    hiddenItemIds:
      string[];

    visibleModuleIds:
      string[];

    canManage: boolean;
  };

  message?: string;
  error?: string;
};

function applySavedOrder(
  items:
    CRMNavigationItemConfig[],
  savedOrder: string[],
): CRMNavigationItemConfig[] {
  const savedPositions =
    new Map(
      savedOrder.map(
        (id, index) => [
          id,
          index,
        ],
      ),
    );

  const defaultPositions =
    new Map(
      items.map(
        (item, index) => [
          item.id,
          index,
        ],
      ),
    );

  return [
    ...items,
  ].sort((first, second) => {
    const firstSavedPosition =
      savedPositions.get(
        first.id,
      );

    const secondSavedPosition =
      savedPositions.get(
        second.id,
      );

    if (
      firstSavedPosition !==
        undefined &&
      secondSavedPosition !==
        undefined
    ) {
      return (
        firstSavedPosition -
        secondSavedPosition
      );
    }

    if (
      firstSavedPosition !==
      undefined
    ) {
      return -1;
    }

    if (
      secondSavedPosition !==
      undefined
    ) {
      return 1;
    }

    return (
      (
        defaultPositions.get(
          first.id,
        ) ?? 0
      ) -
      (
        defaultPositions.get(
          second.id,
        ) ?? 0
      )
    );
  });
}

export default function CRMMenuSettingsPage() {
  const {
    navigation,
    tenantConfig,
  } = useCRMConfig();

  const defaultItems =
    useMemo(
      () =>
        navigation.filter(
          (item) =>
            item.visible !==
              false &&
            item.status ===
              "active" &&
            typeof item.route ===
              "string" &&
            item.route.length >
              0,
        ),
      [navigation],
    );

  const [
    items,
    setItems,
  ] = useState<
    CRMNavigationItemConfig[]
  >([]);

    const [
    labels,
    setLabels,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    hiddenItemIds,
    setHiddenItemIds,
  ] = useState<string[]>(
    [],
  );

  const [
    canManage,
    setCanManage,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

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

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/crm/settings/navigation",
            {
              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as
            NavigationSettingsResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar la configuración del menú.",
          );
        }

        if (!isActive) {
          return;
        }

        setCanManage(
          result.data
            ?.canManage ??
            false,
        );

        const visibleModuleIds =
          result.data
            ?.visibleModuleIds ??
          [];

        const availableItems =
          defaultItems.filter(
            (item) =>
              item.id ===
                "home" ||
              (
                typeof item.moduleId ===
                  "string" &&
                visibleModuleIds.includes(
                  item.moduleId,
                )
              ),
          );

        setItems(
          applySavedOrder(
            availableItems,
            result.data?.order ??
              [],
          ),
        );

        setLabels(
          result.data?.labels ??
            {},
        );

        setHiddenItemIds(
          result.data
            ?.hiddenItemIds ??
            [],
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar la configuración del menú.",
        );

        setItems(
          defaultItems,
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, [defaultItems]);

  const sectionLabels =
    useMemo(
      () =>
        new Map(
          tenantConfig
            ?.navigationSections
            ?.map(
              (section) => [
                section.id,
                section.label,
              ],
            ) ?? [],
        ),
      [tenantConfig],
    );

  const sectionIds =
    useMemo(
      () =>
        Array.from(
          new Set(
            items.map(
              (item) =>
                item.sectionId,
            ),
          ),
        ),
      [items],
    );

  function moveItem(
    itemId: string,
    direction:
      | "up"
      | "down",
  ) {
    setItems(
      (currentItems) => {
        const currentIndex =
          currentItems.findIndex(
            (item) =>
              item.id ===
              itemId,
          );

        if (
          currentIndex <
          0
        ) {
          return currentItems;
        }

        const currentItem =
          currentItems[
            currentIndex
          ];

        const sectionIndexes =
          currentItems
            .map(
              (
                item,
                index,
              ) => ({
                item,
                index,
              }),
            )
            .filter(
              (entry) =>
                entry.item
                  .sectionId ===
                currentItem
                  .sectionId,
            )
            .map(
              (entry) =>
                entry.index,
            );

        const positionInSection =
          sectionIndexes.indexOf(
            currentIndex,
          );

        const targetPosition =
          direction === "up"
            ? positionInSection -
              1
            : positionInSection +
              1;

        if (
          targetPosition <
            0 ||
          targetPosition >=
            sectionIndexes.length
        ) {
          return currentItems;
        }

        const targetIndex =
          sectionIndexes[
            targetPosition
          ];

        const nextItems = [
          ...currentItems,
        ];

        [
          nextItems[
            currentIndex
          ],
          nextItems[
            targetIndex
          ],
        ] = [
          nextItems[
            targetIndex
          ],
          nextItems[
            currentIndex
          ],
        ];

        return nextItems;
      },
    );
  }

    function updateItemLabel(
    itemId: string,
    label: string,
  ) {
    setLabels(
      (currentLabels) => ({
        ...currentLabels,

        [itemId]:
          label,
      }),
    );
  }

  function toggleItemVisibility(
    itemId: string,
  ) {
    setHiddenItemIds(
      (currentItemIds) =>
        currentItemIds.includes(
          itemId,
        )
          ? currentItemIds.filter(
              (currentItemId) =>
                currentItemId !==
                itemId,
            )
          : [
              ...currentItemIds,
              itemId,
            ],
    );
  }

  function restoreDefaults() {
    setItems(
      (currentItems) =>
        defaultItems.filter(
          (defaultItem) =>
            currentItems.some(
              (currentItem) =>
                currentItem.id ===
                defaultItem.id,
            ),
        ),
    );
    setLabels(
      {},
    );

    setHiddenItemIds(
      [],
    );

    setMessage(null);
    setError(null);
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      setMessage(null);
      setError(null);

      const response =
        await fetch(
          "/api/crm/settings/navigation",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              order:
                items.map(
                  (item) =>
                    item.id,
                ),

              labels:
                Object.fromEntries(
                  items.map(
                    (item) => [
                      item.id,

                      (
                        labels[
                          item.id
                        ] ??
                        item.label
                      ).trim(),
                    ],
                  ),
                ),

              hiddenItemIds:
                hiddenItemIds.filter(
                  (itemId) =>
                    items.some(
                      (item) =>
                        item.id ===
                        itemId,
                    ),
                ),
            }),
          },
        );

      const result =
        (await response.json()) as
          NavigationSettingsResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar el orden del menú.",
        );
      }

      setMessage(
        result.message ??
          "El orden del menú fue actualizado correctamente.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar el orden del menú.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Configuración"
          title="Menú del CRM"
          description="Define el orden en que los módulos aparecen para los usuarios de tu empresa."
          action={
            <Button
              href="/crm/configuracion"
              variant="secondary"
            >
              Volver a configuración
            </Button>
          }
        />

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

        {!canManage &&
          !isLoading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
            Puedes consultar el orden, pero solo el dueño o un administrador pueden modificarlo.
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <h2 className="font-bold text-slate-950">
              Orden de navegación
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Usa las flechas para mover cada módulo dentro de su sección.
            </p>
          </header>

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Cargando menú...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-7 p-6">
              {sectionIds.map(
                (sectionId) => {
                  const sectionItems =
                    items.filter(
                      (item) =>
                        item.sectionId ===
                        sectionId,
                    );

                  return (
                    <section
                      key={
                        sectionId
                      }
                    >
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                        {sectionLabels.get(
                          sectionId,
                        ) ??
                          sectionId}
                      </h3>

                      <div className="mt-3 space-y-3">
                        {sectionItems.map(
                          (
                            item,
                            index,
                          ) => (
                            <article
                              key={
                                item.id
                              }
                              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                                  {index +
                                    1}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    maxLength={
                                      60
                                    }
                                    disabled={
                                      !canManage
                                    }
                                    value={
                                      labels[
                                        item.id
                                      ] ??
                                      item.label
                                    }
                                    aria-label={
                                      `Nombre de ${item.label}`
                                    }
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    onChange={(
                                      event,
                                    ) =>
                                      updateItemLabel(
                                        item.id,
                                        event.target
                                          .value,
                                      )
                                    }
                                  />

                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {
                                      item.route
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={
                                    !canManage ||
                                    item.id ===
                                      "home" ||
                                    item.moduleId ===
                                      "crm-users" ||
                                    item.moduleId ===
                                      "crm-settings"
                                  }
                                  onClick={() =>
                                    toggleItemVisibility(
                                      item.id,
                                    )
                                  }
                                >
                                  {hiddenItemIds.includes(
                                    item.id,
                                  )
                                    ? "Mostrar"
                                    : "Ocultar"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={
                                    !canManage ||
                                    index ===
                                      0
                                  }
                                  onClick={() =>
                                    moveItem(
                                      item.id,
                                      "up",
                                    )
                                  }
                                >
                                  ↑
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={
                                    !canManage ||
                                    index ===
                                      sectionItems.length -
                                        1
                                  }
                                  onClick={() =>
                                    moveItem(
                                      item.id,
                                      "down",
                                    )
                                  }
                                >
                                  ↓
                                </Button>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          )}

          {canManage &&
            !isLoading && (
            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  isSaving
                }
                onClick={
                  restoreDefaults
                }
              >
                Restaurar orden recomendado
              </Button>

              <Button
                type="button"
                disabled={
                  isSaving
                }
                onClick={() =>
                  void handleSave()
                }
              >
                {isSaving
                  ? "Guardando..."
                  : "Guardar orden"}
              </Button>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}