"use client";

export type Product =
  | "crm"
  | "analytics"
  | "cloud";

export type RoleOption = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  product: Product | null;
  isSystem: boolean;
};

export type ProductRoleSelection =
  Partial<Record<Product, string>>;

type AccessConfigurationProps = {
  enabledProducts: Product[];
  rolesData: {
    globalRoles: RoleOption[];
    productRoles: Record<
      Product,
      RoleOption[]
    >;
  } | undefined;
  selectedGlobalRoleId: string;
  selectedRoleByProduct:
    ProductRoleSelection;
  isLoading: boolean;
  error: string | null;
  onGlobalRoleChange: (
    roleId: string,
  ) => void;
  onProductRoleChange: (
    product: Product,
    roleId: string,
  ) => void;
};

export default function AccessConfiguration({
  enabledProducts,
  rolesData,
  selectedGlobalRoleId,
  selectedRoleByProduct,
  isLoading,
  error,
  onGlobalRoleChange,
  onProductRoleChange,
}: AccessConfigurationProps) {
  return (
  <div className="grid gap-6">
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
      <label className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
        Rol global del Workspace
      </label>

      <select
        value={selectedGlobalRoleId}
        onChange={(event) =>
          onGlobalRoleChange(
            event.target.value,
          )
        }
        disabled={isLoading || !rolesData}
        className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="">
          Sin rol global
        </option>

        {(rolesData?.globalRoles ?? []).map(
          (role) => (
            <option
              key={role.id}
              value={role.id}
            >
              {role.name}
            </option>
          ),
        )}
      </select>

      <p className="mt-2 text-xs leading-5 text-blue-700">
        Este rol controla el acceso a Administración y a la configuración global del Workspace.
      </p>
    </section>

    <section>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
        Productos contratados
      </p>

      {isLoading ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Cargando roles...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        {enabledProducts.map((product) => {
          const productName = {
            crm: "Datara CRM",
            analytics: "Datara Analytics",
            cloud: "Datara Cloud",
          }[product];

          const selectedRoleId =
            selectedRoleByProduct[product] ?? "";

          const hasAccess =
            selectedRoleId.length > 0;

          return (
            <section
              key={product}
              className={[
                "rounded-2xl border p-5",
                hasAccess
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-slate-950">
                    {productName}
                  </h3>

                  <select
                    value={selectedRoleId}
                    onChange={(event) =>
                      onProductRoleChange(
                        product,
                        event.target.value,
                      )
                    }
                    disabled={
                      isLoading ||
                      !rolesData
                    }
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      Sin acceso
                    </option>

                    {(
                      rolesData?.productRoles[
                        product
                      ] ?? []
                    ).map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span
                  className={[
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                    hasAccess
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600",
                  ].join(" ")}
                >
                  {hasAccess
                    ? "Activo"
                    : "Inactivo"}
                </span>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  </div>
);
}