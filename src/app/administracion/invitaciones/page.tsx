"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

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
  url: string | null;
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
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();
  const { getToken } = useClerkAuth();

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

  const [
    selectedInvitation,
    setSelectedInvitation,
  ] = useState<Invitation | null>(null);

  const [
    actionInvitationId,
    setActionInvitationId,
  ] = useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const loadInvitations = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();

        if (!token) {
          throw new Error(
            "No fue posible obtener la sesión de Clerk.",
          );
        }

        const authorizationHeaders = {
          Authorization: `Bearer ${token}`,
        };

        const response = await fetch(
          "/api/administracion/invitaciones",
          {
            cache: "no-store",
            headers: authorizationHeaders,
          },
        );

        const result =
          (await response.json()) as InvitationsResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar las invitaciones.",
          );
        }

        const invitations =
          await Promise.all(
            result.data.invitations.map(
              async (invitation) => {
                if (
                  invitation.status !==
                  "pending"
                ) {
                  return {
                    ...invitation,
                    url: null,
                  };
                }

                try {
                  const clerkResponse =
                    await fetch(
                      `/api/administracion/invitaciones/${invitation.id}/administrar`,
                      {
                        cache: "no-store",
                        headers:
                          authorizationHeaders,
                      },
                    );
                  const clerkResult =
                    (await clerkResponse.json()) as {
                      success: boolean;
                      data?: {
                        url: string | null;
                      };
                    };

                  return {
                    ...invitation,
                    url:
                      clerkResponse.ok &&
                      clerkResult.success
                        ? clerkResult.data
                            ?.url ?? null
                        : null,
                  };
                } catch {
                  return {
                    ...invitation,
                    url: null,
                  };
                }
              },
            ),
          );

        setData({
          ...result.data,
          invitations,
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar las invitaciones.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    if (
      isAuthLoading ||
      !isAuthenticated
    ) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => void loadInvitations(),
      0,
    );

    return () =>
      window.clearTimeout(timeoutId);
  }, [
    isAuthLoading,
    isAuthenticated,
    loadInvitations,
  ]);

  async function copyInvitationLink(
    invitation: Invitation,
  ) {
    if (!invitation.url) {
      setNotice(
        "Clerk no devolvió un enlace disponible para esta invitación.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        invitation.url,
      );
      setNotice(
        `Enlace de ${invitation.email} copiado.`,
      );
    } catch {
      setNotice(
        "No fue posible copiar el enlace. Inténtalo de nuevo.",
      );
    }
  }

  async function revokeInvitation(
    invitation: Invitation,
  ) {
    if (
      !window.confirm(
        `¿Revocar la invitación de ${invitation.email}? Esta acción invalidará su enlace.`,
      )
    ) {
      return;
    }

    setActionInvitationId(invitation.id);
    setNotice(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error(
          "No fue posible obtener la sesión de Clerk.",
        );
      }

      const response = await fetch(
        `/api/administracion/invitaciones/${invitation.id}/administrar`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const result =
        (await response.json()) as {
          success: boolean;
          error?: string;
        };

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible revocar la invitación.",
        );
      }

      setSelectedInvitation(null);
      setNotice(
        `La invitación de ${invitation.email} fue revocada.`,
      );
      await loadInvitations();
    } catch (revokeError) {
      setNotice(
        revokeError instanceof Error
          ? revokeError.message
          : "No fue posible revocar la invitación.",
      );
    } finally {
      setActionInvitationId(null);
    }
  }

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

        {notice ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800"
          >
            {notice}
          </div>
        ) : null}

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
                              onClick={() =>
                                setSelectedInvitation(
                                  invitation,
                                )
                              }
                            >
                              Ver
                            </Button>

                            {invitation.status ===
                            "pending" ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    void copyInvitationLink(
                                      invitation,
                                    )
                                  }
                                  disabled={
                                    !invitation.url
                                  }
                                  title={
                                    invitation.url
                                      ? undefined
                                      : "Clerk no devolvió un enlace disponible"
                                  }
                                >
                                  Copiar enlace
                                </Button>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    void revokeInvitation(
                                      invitation,
                                    )
                                  }
                                  disabled={
                                    actionInvitationId ===
                                    invitation.id
                                  }
                                >
                                  {actionInvitationId ===
                                  invitation.id
                                    ? "Revocando..."
                                    : "Revocar"}
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

      {selectedInvitation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invitation-detail-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedInvitation(null);
            }
          }}
        >
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                  Detalle de invitación
                </p>
                <h2
                  id="invitation-detail-title"
                  className="mt-2 text-2xl font-black text-slate-950"
                >
                  {selectedInvitation.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedInvitation.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedInvitation(null)
                }
                aria-label="Cerrar detalle"
              >
                Cerrar
              </Button>
            </div>

            <dl className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Estado
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {statusLabels[
                    selectedInvitation.status
                  ]}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Rol global
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {selectedInvitation.globalRole
                    ?.name ?? "Sin rol global"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Invitado por
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {
                    selectedInvitation.invitedBy
                      .name
                  }
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Creada
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {formatDate(
                    selectedInvitation.createdAt,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Expira
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {formatDate(
                    selectedInvitation.expiresAt,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Actualizada
                </dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {formatDate(
                    selectedInvitation.updatedAt,
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-7">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Productos y roles
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedInvitation.products
                  .length > 0 ? (
                  selectedInvitation.products.map(
                    (product) => (
                      <span
                        key={product.product}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-bold",
                          productClasses[
                            product.product
                          ],
                        ].join(" ")}
                      >
                        {product.productName} ·{" "}
                        {product.roleName}
                      </span>
                    ),
                  )
                ) : (
                  <span className="text-sm text-slate-500">
                    Sin productos asignados
                  </span>
                )}
              </div>
            </div>

            {selectedInvitation.message ? (
              <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Mensaje
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {selectedInvitation.message}
                </p>
              </div>
            ) : null}

            {selectedInvitation.status ===
            "pending" ? (
              <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void copyInvitationLink(
                      selectedInvitation,
                    )
                  }
                  disabled={
                    !selectedInvitation.url
                  }
                >
                  Copiar enlace
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    void revokeInvitation(
                      selectedInvitation,
                    )
                  }
                  disabled={
                    actionInvitationId ===
                    selectedInvitation.id
                  }
                >
                  {actionInvitationId ===
                  selectedInvitation.id
                    ? "Revocando..."
                    : "Revocar"}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
