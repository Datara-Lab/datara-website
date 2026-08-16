"use client";

import {
  useAuth,
  useOrganization,
  useSignIn,
  useSignUp,
} from "@clerk/nextjs";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Suspense,
  type FormEvent,
  useEffect,
  useState,
} from "react";

function AceptarInvitacionContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const {
    isLoaded: isAuthLoaded,
    isSignedIn,
  } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { organization } =
    useOrganization();

  const ticket =
    searchParams.get(
      "__clerk_ticket",
    );

  const accountStatus =
    searchParams.get(
      "__clerk_status",
    );

  const dataraToken =
    searchParams.get("token");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [invitationData, setInvitationData] =
    useState<{
      firstName: string | null;
      lastName: string | null;
      companyName: string;
      products: Array<{
        productName: string;
        roleName: string;
      }>;
    } | null>(null);

    useEffect(() => {
      if (!dataraToken) {
        return;
      }

      const invitationToken = dataraToken;

      let isCancelled = false;

      async function loadInvitationData() {
        try {
          const response = await fetch(
            `/api/invitaciones/resolve?token=${encodeURIComponent(
              invitationToken,
            )}`,
          );

          const result =
            (await response.json()) as {
              success?: boolean;
              error?: string;
              data?: {
                invitation?: {
                  firstName?: string | null;
                  lastName?: string | null;
                };
                company?: {
                  name?: string;
                };
                products?: Array<{
                  productName?: string;
                  roleName?: string;
                }>;
              };
            };

          if (
            !response.ok ||
            result.success !== true ||
            !result.data
          ) {
            throw new Error(
              result.error ??
                "No fue posible cargar la invitación.",
            );
          }

          if (isCancelled) {
            return;
          }

          setInvitationData({
            firstName:
              result.data.invitation?.firstName ??
              null,
            lastName:
              result.data.invitation?.lastName ??
              null,
            companyName:
              result.data.company?.name ??
              "Datara",
            products:
              result.data.products?.map(
                (product) => ({
                  productName:
                    product.productName ??
                    "Producto",
                  roleName:
                    product.roleName ??
                    "Sin rol",
                }),
              ) ?? [],
          });
        } catch (loadError) {
          if (isCancelled) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar la invitación.",
          );
        }
      }

      void loadInvitationData();

      return () => {
        isCancelled = true;
      };
    }, [dataraToken]);

  useEffect(() => {
    if (
      !isAuthLoaded ||
      !ticket ||
      accountStatus !== "sign_in"
    ) {
      return;
    }

    const invitationTicket = ticket;
    let isCancelled = false;

    async function acceptExistingUser() {
      setIsProcessing(true);
      setError(null);

      try {
        if (isSignedIn) {
          await finalizeDataraInvitation();

          router.replace("/portal");
          return;
        }

        const {
          error: signInError,
        } = await signIn.ticket({
          ticket:
            invitationTicket,
        });

        if (signInError) {
          console.error(
            "CLERK SIGN IN TICKET ERROR:",
            signInError,
          );

          throw new Error(
            signInError.longMessage ??
              signInError.message ??
              "No fue posible aceptar la invitación.",
          );
        }

        if (
          signIn.status !==
          "complete"
        ) {
          throw new Error(
            "La autenticación requiere pasos adicionales.",
          );
        }

        await signIn.finalize({
          navigate: async ({
            session,
            decorateUrl,
          }) => {
            if (
              session?.currentTask
            ) {
              throw new Error(
                "La sesión tiene una tarea pendiente.",
              );
            }

            await finalizeDataraInvitation();

            const destination =
              decorateUrl(
                "/portal",
              );

            if (
              destination.startsWith(
                "http",
              )
            ) {
              window.location.href =
                destination;
              return;
            }

            router.push(destination);
          },
        });
      } catch (acceptError) {
        if (!isCancelled) {
          setError(
            acceptError instanceof Error
              ? acceptError.message
              : "No fue posible aceptar la invitación.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsProcessing(false);
        }
      }
    }

    void acceptExistingUser();

    return () => {
      isCancelled = true;
    };
  }, [
    accountStatus,
    isAuthLoaded,
    isSignedIn,
    router,
    signIn,
    ticket,
  ]);

  async function finalizeDataraInvitation() {
  if (!dataraToken) {
    throw new Error(
      "La invitación no contiene el token de Datara.",
    );
  }

  const response = await fetch(
    "/api/invitaciones/accept",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        token: dataraToken,
      }),
    },
  );

  const result =
    (await response.json()) as {
      success?: boolean;
      error?: string;
    };

  if (
    !response.ok ||
    result.success !== true
  ) {
    throw new Error(
      result.error ??
        "No fue posible finalizar la invitación en Datara.",
    );
  }
}

  async function handleSignUp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!ticket) {
      setError(
        "La invitación no contiene un ticket válido.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Las contraseñas no coinciden.",
      );
      return;
    }

    const invitationTicket = ticket;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: signUpError } =
        await signUp.create({
          strategy: "ticket",
          ticket:
            invitationTicket,
          firstName:
            invitationData?.firstName ??
            undefined,
          lastName:
            invitationData?.lastName ??
            undefined,
          password,
        });

      if (signUpError) {
        console.error(
          "CLERK SIGN UP ERROR:",
          signUpError,
        );

        throw new Error(
          signUpError.longMessage ??
            signUpError.message ??
            "No fue posible crear la cuenta.",
        );
      }

      if (
        signUp.status !==
        "complete"
      ) {
        throw new Error(
          "El registro requiere pasos adicionales.",
        );
      }

      await signUp.finalize({
        navigate: ({
          session,
          decorateUrl,
        }) => {
          if (
            session?.currentTask
          ) {
            setError(
              "La sesión tiene una tarea pendiente.",
            );
            return;
          }

          const destination =
            decorateUrl(
              "/portal",
            );

          void (async () => {
            try {
              await finalizeDataraInvitation();

              if (
                destination.startsWith(
                  "http",
                )
              ) {
                window.location.href =
                  destination;
                return;
              }

              router.replace(
                destination,
              );
            } catch (finalizeError) {
              setError(
                finalizeError instanceof Error
                  ? finalizeError.message
                  : "No fue posible finalizar la invitación.",
              );

              setIsProcessing(false);
            }
          })();
        },
      });
    } catch (signUpError) {
      setError(
        signUpError instanceof Error
          ? signUpError.message
          : "No fue posible crear la cuenta.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-950">
            Invitación no válida
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            El enlace no contiene un ticket de invitación válido.
          </p>
        </div>
      </main>
    );
  }

  if (
    accountStatus === "sign_in"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <h1 className="mt-6 text-2xl font-black text-slate-950">
            Aceptando invitación
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Estamos preparando tu acceso a Datara Workspace.
          </p>

          {error ? (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  if (
    accountStatus === "sign_up"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <form
          onSubmit={handleSignUp}
          className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Datara Workspace
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {invitationData
              ? `¡Bienvenido, ${[
                  invitationData.firstName,
                  invitationData.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")}!`
              : "¡Bienvenido!"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {invitationData
              ? `Has sido invitado a formar parte de ${invitationData.companyName} en Datara.`
              : "Estamos preparando tu acceso a Datara."}
          </p>

          {invitationData &&
          invitationData.products.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Tu acceso
              </p>

              <div className="mt-3 grid gap-3">
                {invitationData.products.map(
                  (product) => (
                    <div
                      key={`${product.productName}-${product.roleName}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <p className="text-sm font-bold text-slate-950">
                        {product.productName}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {product.roleName}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-sm leading-6 text-slate-600">
            Crea una contraseña para activar tu cuenta y comenzar.
          </p>

          <div className="mt-7 grid gap-4">
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Contraseña"
              required
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Confirmar contraseña"
              required
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <p className="text-xs leading-5 text-slate-500">
              Usa al menos 8 caracteres. Puedes utilizar una frase larga para que sea más fácil de recordar.
            </p>
          </div>

          <div
            id="clerk-captcha"
            className="mt-5"
          />

          {error ? (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isProcessing}
            className="mt-7 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing
              ? "Activando cuenta..."
              : "Activar mi cuenta"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-5 text-sm font-semibold text-slate-600">
          Finalizando invitación...
        </p>
      </div>
    </main>
  );
}

export default function AceptarInvitacionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-5 text-sm font-semibold text-slate-600">
              Cargando invitación...
            </p>
          </div>
        </main>
      }
    >
      <AceptarInvitacionContent />
    </Suspense>
  );
}