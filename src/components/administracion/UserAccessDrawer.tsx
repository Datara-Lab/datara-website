"use client";

import {
  useEffect,
  useState,
} from "react";

import AccessConfiguration, {
  type Product,
  type ProductRoleSelection,
  type RoleOption,
} from "@/components/administracion/AccessConfiguration";

type ProductAccess = {
  product: Product;
  enabled: boolean;
  allBranches: boolean;
  regionIds: string[];
  branches: Array<{
    branchId: string;
    isPrimary: boolean;
  }>;
  role: {
    id: string;
    key: string;
    name: string;
    product: Product | null;
  };
};

type ProductScopeSelection = {
  allBranches: boolean;
  regionIds: string[];

  branches: Array<{
    branchId: string;
    isPrimary: boolean;
  }>;
};

type UserAccessDrawerProps = {
  isOpen: boolean;
  memberId: string;
  userName: string;
  userEmail: string;
  globalRoleId: string | null;
  globalRoleKey: string | null;
  enabledProducts: Product[];
  productAccess: ProductAccess[];

  regions: Array<{
    id: string;
    name: string;
    code: string;
    active: boolean;
  }>;

  branches: Array<{
    id: string;
    regionId: string | null;
    name: string;
    code: string;
    active: boolean;
  }>;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
};

type RolesResponse = {
  success: boolean;
  error?: string;
  data?: {
    globalRoles: RoleOption[];
    productRoles: Record<
      Product,
      RoleOption[]
    >;
  };
};

export default function UserAccessDrawer({
  isOpen,
  memberId,
  userName,
  userEmail,
  globalRoleId,
  globalRoleKey,
  enabledProducts,
  productAccess,
  regions,
  branches,
  onSaved,
  onClose,
}: UserAccessDrawerProps) {
  const [rolesData, setRolesData] =
    useState<RolesResponse["data"]>(undefined);

  const [rolesError, setRolesError] =
    useState<string | null>(null);

  const [isLoadingRoles, setIsLoadingRoles] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(
        `/api/administracion/usuarios/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            globalRoleId: selectedGlobalRoleId || null,
            products: enabledProducts.map(
              (product) => {
                const scope =
                  scopeByProduct[
                    product
                  ];

                return {
                  product,

                  roleId:
                    selectedRoleByProduct[
                      product
                    ] ?? null,

                  allBranches:
                    scope
                      ?.allBranches ??
                    false,

                  regionIds:
                    scope
                      ?.regionIds ??
                    [],

                  branches:
                    scope
                      ?.branches ??
                    [],
                };
              },
            ),
          }),
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible guardar los cambios.",
        );
      }

      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar los cambios.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar a ${userName} de esta empresa?\n\nEl usuario perderá todos sus accesos a Datara dentro de esta organización.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setSaveError(null);

    try {
      const response = await fetch(
        `/api/administracion/usuarios/${memberId}`,
        {
          method: "DELETE",
        },
      );

      const result =
        (await response.json()) as {
          success: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible eliminar al usuario.",
        );
      }

      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar al usuario.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const [
    selectedRoleByProduct,
    setSelectedRoleByProduct,
  ] = useState<ProductRoleSelection>({});

  const [
    scopeByProduct,
    setScopeByProduct,
  ] = useState<
    Partial<
      Record<
        Product,
        ProductScopeSelection
      >
    >
  >({});

  const [
  selectedGlobalRoleId,
  setSelectedGlobalRoleId,
] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadRoles() {
      setIsLoadingRoles(true);
      setRolesError(null);

      try {
        const response = await fetch(
          "/api/administracion/roles",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as RolesResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ??
              "No fue posible cargar los roles.",
          );
        }

        setRolesData(result.data);
      } catch (error) {
        setRolesError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar los roles.",
        );
      } finally {
        setIsLoadingRoles(false);
      }
    }

    void loadRoles();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialRoles: Partial<
      Record<Product, string>
    > = {};

    for (const access of productAccess) {
      if (access.enabled) {
        initialRoles[access.product] =
          access.role.id;
      }
    }

    setSelectedRoleByProduct(initialRoles);
  }, [isOpen, productAccess]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialScopes:
      Partial<
        Record<
          Product,
          ProductScopeSelection
        >
      > = {};

    for (
      const access of
      productAccess
    ) {
      initialScopes[
        access.product
      ] = {
        allBranches:
          access.allBranches,

        regionIds:
          access.regionIds,

        branches:
          access.branches,
      };
    }

    setScopeByProduct(
      initialScopes,
    );
  }, [
    isOpen,
    productAccess,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedGlobalRoleId(
      globalRoleId ?? "",
    );
  }, [isOpen, globalRoleId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Cerrar panel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              Administración
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Administrar accesos
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-700">
              {userName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {userEmail}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600 transition hover:bg-slate-50"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AccessConfiguration
            enabledProducts={enabledProducts}
            rolesData={rolesData}
            selectedGlobalRoleId={
              selectedGlobalRoleId
            }
            selectedRoleByProduct={
              selectedRoleByProduct
            }
            isLoading={isLoadingRoles}
            error={rolesError}
            onGlobalRoleChange={
              setSelectedGlobalRoleId
            }
            onProductRoleChange={(
              product,
              roleId,
            ) => {
              setSelectedRoleByProduct(
                (current) => ({
                  ...current,
                  [product]: roleId,
                }),
              );
            }}
          />
          <div className="mt-8 space-y-6">
            {enabledProducts.map(
              (product) => {
                const roleId =
                  selectedRoleByProduct[
                    product
                  ];

                if (!roleId) {
                  return null;
                }

                const scope =
                  scopeByProduct[
                    product
                  ] ?? {
                    allBranches:
                      false,
                    regionIds: [],
                    branches: [],
                  };

                return (
                  <section
                    key={product}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                      Alcance territorial
                    </p>

                    <h3 className="mt-2 text-lg font-black uppercase text-slate-950">
                      {product}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Define qué regiones y sucursales puede consultar este usuario.
                    </p>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={
                          scope.allBranches
                        }
                        onChange={(
                          event,
                        ) => {
                          const checked =
                            event.target
                              .checked;

                          setScopeByProduct(
                            (
                              current,
                            ) => ({
                              ...current,

                              [product]: {
                                allBranches:
                                  checked,

                                regionIds:
                                  checked
                                    ? []
                                    : scope.regionIds,

                                branches:
                                  checked
                                    ? []
                                    : scope.branches,
                              },
                            }),
                          );
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />

                      <span>
                        <span className="block text-sm font-bold text-slate-900">
                          Todas las sucursales
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          Permite consultar toda la organización, incluyendo nuevas sucursales.
                        </span>
                      </span>
                    </label>

                    {!scope.allBranches && (
                      <div className="mt-5">
                        <p className="text-sm font-black text-slate-900">
                          Regiones asignadas
                        </p>

                        <div className="mt-3 grid gap-2">
                          {regions.map(
                            (
                              region,
                            ) => {
                              const checked =
                                scope.regionIds.includes(
                                  region.id,
                                );

                              return (
                                <label
                                  key={
                                    region.id
                                  }
                                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      checked
                                    }
                                    onChange={() => {
                                      const regionIds =
                                        checked
                                          ? scope.regionIds.filter(
                                              (
                                                id,
                                              ) =>
                                                id !==
                                                region.id,
                                            )
                                          : [
                                              ...scope.regionIds,
                                              region.id,
                                            ];

                                      setScopeByProduct(
                                        (
                                          current,
                                        ) => ({
                                          ...current,

                                          [product]: {
                                            ...scope,
                                            regionIds,
                                          },
                                        }),
                                      );
                                    }}
                                    className="h-4 w-4 rounded border-slate-300"
                                  />

                                  <span className="text-sm font-semibold text-slate-700">
                                    {
                                      region.name
                                    }
                                    {!region.active
                                      ? " · Inactiva"
                                      : ""}
                                  </span>
                                </label>
                              );
                            },
                          )}

                          {regions.length ===
                            0 && (
                            <p className="text-sm text-slate-500">
                              No hay regiones registradas.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {!scope.allBranches && (
                      <div className="mt-5">
                        <p className="text-sm font-black text-slate-900">
                          Sucursales asignadas
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Selecciona una o varias sucursales y marca la principal.
                        </p>

                        <div className="mt-3 grid gap-2">
                          {branches.map(
                            (
                              branch,
                            ) => {
                              const branchAccess =
                                scope.branches.find(
                                  (
                                    item,
                                  ) =>
                                    item.branchId ===
                                    branch.id,
                                );

                              const checked =
                                Boolean(
                                  branchAccess,
                                );

                              return (
                                <div
                                  key={
                                    branch.id
                                  }
                                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <label className="flex cursor-pointer items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={
                                        checked
                                      }
                                      onChange={() => {
                                        const nextBranches =
                                          checked
                                            ? scope.branches.filter(
                                                (
                                                  item,
                                                ) =>
                                                  item.branchId !==
                                                  branch.id,
                                              )
                                            : [
                                                ...scope.branches,
                                                {
                                                  branchId:
                                                    branch.id,

                                                  isPrimary:
                                                    scope.branches.length ===
                                                    0,
                                                },
                                              ];

                                        setScopeByProduct(
                                          (
                                            current,
                                          ) => ({
                                            ...current,

                                            [product]: {
                                              ...scope,

                                              branches:
                                                nextBranches,
                                            },
                                          }),
                                        );
                                      }}
                                      className="h-4 w-4 rounded border-slate-300"
                                    />

                                    <span className="text-sm font-semibold text-slate-700">
                                      {
                                        branch.name
                                      }
                                      {!branch.active
                                        ? " · Inactiva"
                                        : ""}
                                    </span>
                                  </label>

                                  {checked && (
                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-blue-700">
                                      <input
                                        type="radio"
                                        name={`primary-branch-${product}`}
                                        checked={
                                          branchAccess
                                            ?.isPrimary ??
                                          false
                                        }
                                        onChange={() => {
                                          setScopeByProduct(
                                            (
                                              current,
                                            ) => ({
                                              ...current,

                                              [product]: {
                                                ...scope,

                                                branches:
                                                  scope.branches.map(
                                                    (
                                                      item,
                                                    ) => ({
                                                      ...item,

                                                      isPrimary:
                                                        item.branchId ===
                                                        branch.id,
                                                    }),
                                                  ),
                                              },
                                            }),
                                          );
                                        }}
                                      />

                                      Principal
                                    </label>
                                  )}
                                </div>
                              );
                            },
                          )}

                          {branches.length ===
                            0 && (
                            <p className="text-sm text-slate-500">
                              No hay sucursales registradas.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                );
              },
            )}
          </div>
        </div>

        {saveError ? (
          <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
            {saveError}
          </div>
        ) : null}

    <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
      {globalRoleKey !== "owner" ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
          className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting
            ? "Eliminando..."
            : "Eliminar usuario"}
        </button>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting || isSaving}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isDeleting}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Guardando..."
            : "Guardar cambios"}
        </button>
      </div>
    </footer>
      </aside>
    </div>
  );
}