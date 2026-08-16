"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

type Product = {
  product:
    | "crm"
    | "analytics"
    | "cloud";
  productName: string;
  roleId: string;
  roleKey: string | null;
  roleName: string;
};

type Invitation = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: InvitationStatus;
  message: string | null;
  globalRole: {
    id: string;
    key: string;
    name: string;
  } | null;
  products: Product[];
  invitedBy: {
    memberId: string;
    name: string;
    email: string | null;
  };
  acceptedByMemberId: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InvitationsResponse = {
  success: boolean;
  error?: string;
  data?: {
    organization: {
      id: string;
      name: string;
    };
    summary: {
      total: number;
      pending: number;
      accepted: number;
      expired: number;
      revoked: number;
    };
    invitations: Invitation[];
  };
};

const statusLabels: Record<
  InvitationStatus,
  string
> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  expired: "Expirada",
  revoked: "Revocada",
};

const statusClasses: Record<
  InvitationStatus,
  string
> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700",
  accepted:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired:
    "border-slate-200 bg-slate-100 text-slate-600",
  revoked:
    "border-red-200 bg-red-50 text-red-700",
};

const productClasses = {
  crm:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  analytics:
    "border-blue-200 bg-blue-50 text-blue-700",
  cloud:
    "border-cyan-200 bg-cyan-50 text-cyan-700",
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export default function InvitationsPage() {
  const [data, setData] =
    useState<
      InvitationsResponse["data"]
    >(undefined);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<
      InvitationStatus | "all"
    >("all");

  useEffect(() => {
    async function loadInvitations() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/administracion/invitaciones",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as InvitationsResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar las invitaciones.",
          );
        }

        setData(result.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar las invitaciones.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvitations();
  }, []);

  const filteredInvitations =
    useMemo(() => {
      const invitations =
        data?.invitations ?? [];

      if (statusFilter === "all") {
        return invitations;
      }

      return invitations.filter(
        (invitation) =>
          invitation.status ===
          statusFilter,
      );
    }, [
      data?.invitations,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                    Administración
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                    Invitaciones
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Consulta el estado de las invitaciones enviadas y los accesos preparados para cada usuario.
                </p>
                </div>

                <Button
                  href="/administracion/usuarios"
                >
                  + Invitar usuario
                </Button>
            </div>
            </div>

        {isLoading ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-5 text-sm font-semibold text-slate-600">
              Cargando invitaciones...
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && data ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Total",
                  value:
                    data.summary.total,
                  filter: "all" as const,
                },
                {
                  label: "Pendientes",
                  value:
                    data.summary.pending,
                  filter:
                    "pending" as const,
                },
                {
                  label: "Aceptadas",
                  value:
                    data.summary.accepted,
                  filter:
                    "accepted" as const,
                },
                {
                  label: "Expiradas",
                  value:
                    data.summary.expired,
                  filter:
                    "expired" as const,
                },
                {
                  label: "Revocadas",
                  value:
                    data.summary.revoked,
                  filter:
                    "revoked" as const,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      item.filter,
                    )
                  }
                  className={[
                    "rounded-2xl border bg-white p-5 text-left shadow-sm transition",
                    statusFilter ===
                    item.filter
                      ? "border-blue-300 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300",
                  ].join(" ")}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {item.value}
                  </p>
                </button>
              ))}
            </div>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Invitaciones
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredInvitations.length} registros
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setStatusFilter("all")
                  }
                >
                  Mostrar todas
                </Button>
              </div>

              {filteredInvitations.length ===
              0 ? (
                <div className="p-12 text-center">
                  <h3 className="text-lg font-black text-slate-950">
                    No hay invitaciones
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    No existen invitaciones con el filtro seleccionado.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredInvitations.map(
                    (invitation) => (
                      <article
                        key={invitation.id}
                        className="p-6 transition hover:bg-slate-50/70"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-black text-slate-950">
                                {invitation.name}
                              </h3>

                              <span
                                className={[
                                  "rounded-full border px-3 py-1 text-xs font-bold",
                                  statusClasses[
                                    invitation.status
                                  ],
                                ].join(" ")}
                              >
                                {
                                  statusLabels[
                                    invitation.status
                                  ]
                                }
                              </span>
                            </div>

                            <p className="mt-1 text-sm font-medium text-slate-600">
                              {invitation.email}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {invitation.products.length >
                              0 ? (
                                invitation.products.map(
                                  (product) => (
                                    <span
                                      key={
                                        product.product
                                      }
                                      className={[
                                        "rounded-full border px-3 py-1 text-xs font-bold",
                                        productClasses[
                                          product.product
                                        ],
                                      ].join(" ")}
                                    >
                                      {
                                        product.productName
                                      }{" "}
                                      ·{" "}
                                      {
                                        product.roleName
                                      }
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                  Sin productos asignados
                                </span>
                              )}
                            </div>

                            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Invitado por
                                </p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {
                                    invitation
                                      .invitedBy
                                      .name
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Creada
                                </p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {formatDate(
                                    invitation.createdAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Expira
                                </p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {formatDate(
                                    invitation.expiresAt,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                            >
                              Ver
                            </Button>

                            {invitation.status ===
                            "pending" ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled
                                >
                                  Copiar enlace
                                </Button>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled
                                >
                                  Revocar
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}