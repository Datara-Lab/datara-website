"use client";

import Link from "next/link";

import Button from "@/components/ui/Button";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Product =
  | "crm"
  | "analytics"
  | "cloud";

type ProductSelection =
  | Product
  | "global";

type PermissionAction =
  | "canView"
  | "canCreate"
  | "canEdit"
  | "canDelete"
  | "canManage";

type RolePermission = {
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
};

type RoleRecord = {
  id: string;
  key: string;
  name: string;
  description:
    | string
    | null;
  product:
    | Product
    | null;
  isSystem: boolean;
  permissions:
    RolePermission[];
};

type PermissionModule = {
  id: string;
  label: string;
  product:
    | ProductSelection;
  description: string;
};

type RolesResponse = {
  success: boolean;
  error?: string;
  message?: string;

  data?: {
    globalRoles:
      RoleRecord[];

    productRoles: {
      crm: RoleRecord[];
      analytics:
        RoleRecord[];
      cloud:
        RoleRecord[];
    };

    permissionModules:
      PermissionModule[];
  };
};

const productLabels:
  Record<
    ProductSelection,
    string
  > = {
    global: "Datara Workspace",
    crm: "Datara CRM",
    analytics:
      "Datara Analytics",
    cloud: "Datara Cloud",
  };

const permissionColumns:
  Array<{
    key: PermissionAction;
    label: string;
  }> = [
    {
      key: "canView",
      label: "Ver",
    },
    {
      key: "canCreate",
      label: "Crear",
    },
    {
      key: "canEdit",
      label: "Editar",
    },
    {
      key: "canDelete",
      label: "Eliminar",
    },
    {
      key: "canManage",
      label: "Administrar",
    },
  ];

function getProductSelection(
  product:
    | Product
    | null,
): ProductSelection {
  return product ?? "global";
}

function createPermissions(
  modules:
    PermissionModule[],
  current:
    RolePermission[] = [],
): RolePermission[] {
  return modules.map(
    (module) => {
      const permission =
        current.find(
          (item) =>
            item.moduleId ===
            module.id,
        );

      return {
        moduleId: module.id,

        canView:
          permission?.canView ??
          false,

        canCreate:
          permission?.canCreate ??
          false,

        canEdit:
          permission?.canEdit ??
          false,

        canDelete:
          permission?.canDelete ??
          false,

        canManage:
          permission?.canManage ??
          false,
      };
    },
  );
}

export default function RolesPage() {
  const [
    data,
    setData,
  ] = useState<
    RolesResponse["data"]
  >();

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    isEditorOpen,
    setIsEditorOpen,
  ] = useState(false);

  const [
    editingRole,
    setEditingRole,
  ] = useState<
    RoleRecord | null
  >(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    product,
    setProduct,
  ] = useState<
    ProductSelection
  >("crm");

  const [
    permissions,
    setPermissions,
  ] = useState<
    RolePermission[]
  >([]);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

    const [
        deletingRoleId,
        setDeletingRoleId,
    ] = useState<
        string | null
    >(null);

  const loadRoles =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/administracion/roles",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              RolesResponse;

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.error ??
                "No fue posible cargar los roles.",
            );
          }

          setData(
            result.data,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No fue posible cargar los roles.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const allRoles =
    useMemo(
      () =>
        data
          ? [
              ...data
                .globalRoles,

              ...data
                .productRoles
                .crm,

              ...data
                .productRoles
                .analytics,

              ...data
                .productRoles
                .cloud,
            ]
          : [],
      [data],
    );

  const availableModules =
    useMemo(
      () =>
        data
          ?.permissionModules
          .filter(
            (module) =>
              module.product ===
              product,
          ) ?? [],
      [
        data,
        product,
      ],
    );

  function openCreate() {
    const nextProduct:
      ProductSelection =
      "crm";

    const modules =
      data
        ?.permissionModules
        .filter(
          (module) =>
            module.product ===
            nextProduct,
        ) ?? [];

    setEditingRole(null);
    setName("");
    setDescription("");
    setProduct(
      nextProduct,
    );
    setPermissions(
      createPermissions(
        modules,
      ),
    );
    setError(null);
    setMessage(null);
    setIsEditorOpen(true);
  }

  function openEdit(
    role: RoleRecord,
  ) {
    const nextProduct =
      getProductSelection(
        role.product,
      );

    const modules =
      data
        ?.permissionModules
        .filter(
          (module) =>
            module.product ===
            nextProduct,
        ) ?? [];

    setEditingRole(role);
    setName(role.name);
    setDescription(
      role.description ?? "",
    );
    setProduct(
      nextProduct,
    );
    setPermissions(
      createPermissions(
        modules,
        role.permissions,
      ),
    );
    setError(null);
    setMessage(null);
    setIsEditorOpen(true);
  }

  function changeProduct(
    nextProduct:
      ProductSelection,
  ) {
    const modules =
      data
        ?.permissionModules
        .filter(
          (module) =>
            module.product ===
            nextProduct,
        ) ?? [];

    setProduct(
      nextProduct,
    );

    setPermissions(
      createPermissions(
        modules,
      ),
    );
  }

  function togglePermission(
    moduleId: string,
    action:
      PermissionAction,
  ) {
    const actionIndex =
      permissionColumns.findIndex(
        (column) =>
          column.key ===
          action,
      );

    setPermissions(
      (current) =>
        current.map(
          (permission) => {
            if (
              permission.moduleId !==
              moduleId
            ) {
              return permission;
            }

            const enabled =
              !permission[
                action
              ];

            const next = {
              ...permission,
            };

            permissionColumns.forEach(
              (
                column,
                index,
              ) => {
                if (
                  enabled &&
                  index <=
                    actionIndex
                ) {
                  next[
                    column.key
                  ] = true;
                }

                if (
                  !enabled &&
                  index >=
                    actionIndex
                ) {
                  next[
                    column.key
                  ] = false;
                }
              },
            );

            return next;
          },
        ),
    );
  }

  async function saveRole() {
    if (!name.trim()) {
      setError(
        "El nombre del rol es obligatorio.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/administracion/roles",
          {
            method:
              editingRole
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  editingRole
                    ?.id,

                name:
                  name.trim(),

                description:
                  description
                    .trim(),

                product:
                  product ===
                  "global"
                    ? null
                    : product,

                permissions,
              }),
          },
        );

      const result =
        (await response.json()) as
          RolesResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar el rol.",
        );
      }

      setMessage(
        result.message ??
          "El rol fue guardado correctamente.",
      );

      setIsEditorOpen(
        false,
      );

      setEditingRole(null);

      await loadRoles();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible guardar el rol.",
      );
        } finally {
            setIsSaving(false);
            }
        }

        async function deleteRole(
            role: RoleRecord,
        ) {
            const confirmed =
            window.confirm(
                `¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`,
            );

            if (!confirmed) {
            return;
            }

            setDeletingRoleId(
            role.id,
            );

            setError(null);
            setMessage(null);

            try {
            const response =
                await fetch(
                "/api/administracion/roles",
                {
                    method:
                    "DELETE",

                    headers: {
                    "Content-Type":
                        "application/json",
                    },

                    body:
                    JSON.stringify({
                        id: role.id,
                    }),
                },
                );

            const result =
                (await response.json()) as
                RolesResponse;

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                result.error ??
                    "No fue posible eliminar el rol.",
                );
            }

            setMessage(
                result.message ??
                "El rol fue eliminado correctamente.",
            );

            await loadRoles();
            } catch (
            deleteError
            ) {
            setError(
                deleteError instanceof
                Error
                ? deleteError.message
                : "No fue posible eliminar el rol.",
            );
            } finally {
            setDeletingRoleId(
                null,
            );
            }
        }

        return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/administracion"
          className="text-sm font-bold text-blue-700 hover:text-blue-800"
        >
          ← Administración
        </Link>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Datara Workspace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Roles y permisos
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Define qué puede consultar,
              crear, editar, eliminar y
              administrar cada perfil.
            </p>
          </div>

            <Button
                onClick={
                openCreate
                }
            >
                Nuevo rol
          </Button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error &&
          !isEditorOpen && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

        {isLoading && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Cargando roles...
          </div>
        )}

        {!isLoading &&
          data && (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {allRoles.map(
                (role) => {
                  const roleProduct =
                    getProductSelection(
                      role.product,
                    );

                  const enabledPermissions =
                    role.permissions
                      .filter(
                        (
                          permission,
                        ) =>
                          permission
                            .canView,
                      )
                      .length;

                  return (
                    <article
                      key={
                        role.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-slate-950">
                              {
                                role.name
                              }
                            </h2>

                            {role.isSystem && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                Sistema
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm font-semibold text-slate-600">
                            {
                              productLabels[
                                roleProduct
                              ]
                            }
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEdit(
                                role,
                              )
                            }
                          >
                            Configurar
                          </Button>

                          {!role.isSystem && (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={
                                deletingRoleId ===
                                role.id
                              }
                              onClick={() =>
                                void deleteRole(
                                  role,
                                )
                              }
                            >
                              {deletingRoleId ===
                              role.id
                                ? "Eliminando..."
                                : "Eliminar"}
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 min-h-10 text-sm leading-6 text-slate-500">
                        {role.description ??
                          "Sin descripción."}
                      </p>

                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          {
                            enabledPermissions
                          }{" "}
                          módulo
                          {enabledPermissions ===
                          1
                            ? ""
                            : "s"}{" "}
                          con acceso
                        </p>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/45">
          <aside className="flex h-full w-full max-w-4xl flex-col bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    {editingRole
                      ? "Editar rol"
                      : "Nuevo rol"}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Configuración de permisos
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsEditorOpen(
                      false,
                    )
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-2xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Nombre del rol
                    </label>

                    <input
                      type="text"
                      value={name}
                      disabled={
                        editingRole
                          ?.isSystem
                      }
                      onChange={(
                        event,
                      ) =>
                        setName(
                          event
                            .target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Producto
                    </label>

                    <select
                      value={
                        product
                      }
                      disabled={
                        Boolean(
                          editingRole,
                        )
                      }
                      onChange={(
                        event,
                      ) =>
                        changeProduct(
                          event
                            .target
                            .value as
                            ProductSelection,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100"
                    >
                      <option value="global">
                        Datara Workspace
                      </option>

                      <option value="crm">
                        Datara CRM
                      </option>

                      <option value="analytics">
                        Datara Analytics
                      </option>

                      <option value="cloud">
                        Datara Cloud
                      </option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Descripción
                    </label>

                    <textarea
                      value={
                        description
                      }
                      disabled={
                        editingRole
                          ?.isSystem
                      }
                      onChange={(
                        event,
                      ) =>
                        setDescription(
                          event
                            .target
                            .value,
                        )
                      }
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <h3 className="text-lg font-black text-slate-950">
                    Permisos por módulo
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Los permisos superiores incluyen automáticamente los anteriores.
                  </p>
                </header>

                {availableModules.length ===
                0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Este producto todavía no tiene módulos configurables.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Módulo
                          </th>

                          {permissionColumns.map(
                            (
                              column,
                            ) => (
                              <th
                                key={
                                  column.key
                                }
                                className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500"
                              >
                                {
                                  column.label
                                }
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {availableModules.map(
                          (
                            module,
                          ) => {
                            const permission =
                              permissions.find(
                                (
                                  item,
                                ) =>
                                  item.moduleId ===
                                  module.id,
                              );

                            return (
                              <tr
                                key={
                                  module.id
                                }
                                className="border-b border-slate-100 last:border-0"
                              >
                                <td className="px-6 py-5">
                                  <p className="font-bold text-slate-950">
                                    {
                                      module.label
                                    }
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      module.description
                                    }
                                  </p>
                                </td>

                                {permissionColumns.map(
                                  (
                                    column,
                                  ) => (
                                    <td
                                      key={
                                        column.key
                                      }
                                      className="px-3 py-5 text-center"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          permission?.[
                                            column
                                              .key
                                          ] ??
                                          false
                                        }
                                        onChange={() =>
                                          togglePermission(
                                            module.id,
                                            column.key,
                                          )
                                        }
                                        className="h-5 w-5 rounded border-slate-300 text-blue-600"
                                      />
                                    </td>
                                  ),
                                )}
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsEditorOpen(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    void saveRole()
                  }
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? "Guardando..."
                    : "Guardar rol"}
                </button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}