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

type InviteUserDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (
        message: string,
    ) => void | Promise<void>;
};

const productNames: Record<
  Product,
  string
> = {
  crm: "Datara CRM",
  analytics:
    "Datara Analytics",
  cloud: "Datara Cloud",
};

export default function InviteUserDrawer({
  isOpen,
  onClose,
  onSuccess,
}: InviteUserDrawerProps) {
  const [rolesData, setRolesData] =
    useState<RolesResponse["data"]>(undefined);

  const [isLoadingRoles, setIsLoadingRoles] =
    useState(false);

  const [rolesError, setRolesError] =
    useState<string | null>(null);

const [
  selectedGlobalRoleId,
  setSelectedGlobalRoleId,
] = useState("");

const [
  selectedRoleByProduct,
  setSelectedRoleByProduct,
] = useState<ProductRoleSelection>({});

const [firstName, setFirstName] =
  useState("");

const [lastName, setLastName] =
  useState("");

const [email, setEmail] =
  useState("");

const [isSubmitting, setIsSubmitting] =
  useState(false);

const [submitError, setSubmitError] =
  useState<string | null>(null);

const [submitMessage, setSubmitMessage] =
  useState<string | null>(null);

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

async function handleInvite() {
  setSubmitError(null);
  setSubmitMessage(null);
  setIsSubmitting(true);

  try {
    const response = await fetch(
      "/api/administracion/usuarios/invitaciones",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          globalRoleId:
            selectedGlobalRoleId ||
            null,
          products: Object.entries(
            selectedRoleByProduct,
          )
            .filter(
              ([, roleId]) =>
                Boolean(roleId),
            )
            .map(
              ([product, roleId]) => ({
                product,
                roleId,
              }),
            ),
        }),
      },
    );

    const result =
      (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ??
          "No fue posible enviar la invitación.",
      );
    }

    const successMessage =
      result.message ??
      "La invitación fue enviada correctamente.";

    setFirstName("");
    setLastName("");
    setEmail("");
    setSelectedGlobalRoleId("");
    setSelectedRoleByProduct({});

    await onSuccess(
      successMessage,
    );

    onClose();
  } catch (error) {
    setSubmitError(
      error instanceof Error
        ? error.message
        : "No fue posible enviar la invitación.",
    );
  } finally {
    setIsSubmitting(false);
  }
}

  if (!isOpen) {
    return null;
  }

    return (
        <div className="fixed inset-0 z-[120]">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
                <header className="border-b border-slate-200 px-6 py-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                        Administración
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                        Invitar usuario
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Configura los accesos del usuario antes de enviar la invitación.
                    </p>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-base font-black text-slate-950">
                      Información del usuario
                    </h3>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                          Nombre
                        </label>

                        <input
                          type="text"
                          value={firstName}
                          onChange={(event) =>
                            setFirstName(
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                          Apellidos
                        </label>

                        <input
                          type="text"
                          value={lastName}
                          onChange={(event) =>
                            setLastName(
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                          Correo electrónico
                        </label>

                        <input
                          type="email"
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </section>

                  <AccessConfiguration
                    enabledProducts={[
                      "crm",
                      "analytics",
                      "cloud",
                    ]}
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

                  <p className="mt-6 text-xs leading-5 text-slate-500">
                    Se enviará una invitación por correo electrónico para que el usuario pueda unirse al Workspace con los permisos configurados.
                  </p>
                </div>

                <>
                  {submitError ? (
                    <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
                      {submitError}
                    </div>
                  ) : null}

                  {submitMessage ? (
                    <div className="border-t border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700">
                      {submitMessage}
                    </div>
                  ) : null}

                  <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={isSubmitting}
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Enviando..."
                        : "Enviar invitación"}
                    </button>
                  </footer>
                </>
            </aside>
        </div>
    );
}