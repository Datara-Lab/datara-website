"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type LoginFormProps = {
  redirectUrl?: string;
  initialMode?: "sign-in" | "sign-up";
};

export default function LoginForm({
  redirectUrl = "/seleccionar-empresa",
  initialMode = "sign-in",
}: LoginFormProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace(
        redirectUrl,
      );
    }
  }, [
    isLoaded,
    isSignedIn,
    redirectUrl,
    router,
  ]);

  return (
    <section className="flex h-full items-center justify-center bg-white px-8 py-5 sm:px-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Image
            src="/logos/lab.png"
            alt="Datara Lab"
            width={460}
            height={150}
            priority
            className="h-auto w-full max-w-[420px] object-contain"
          />
        </div>

        <h2 className="mt-3 text-center text-4xl font-bold tracking-tight text-slate-950">
        {initialMode === "sign-up"
          ? "Crea tu cuenta"
          : "Iniciar sesión"}
        </h2>

        <p className="mt-1.5 text-center text-slate-500">
        {initialMode === "sign-up"
          ? "Regístrate para activar tu prueba gratuita."
          : "Accede a tu espacio de trabajo."}
        </p>

        <div className="mt-6 flex min-h-[320px] justify-center">
          {!isLoaded ? (
            <p className="text-sm text-slate-500">
              Cargando inicio de sesión...
            </p>
          ) : isSignedIn ? (
            <p className="text-sm text-slate-500">
              Abriendo tu espacio de trabajo...
            </p>
          ) : (
          initialMode === "sign-up" ? (
          <SignUp
            routing="hash"
            fallbackRedirectUrl={
              redirectUrl
            }
            signInFallbackRedirectUrl={
              redirectUrl
            }
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-none border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
          />
          ) : (
            <SignIn
              routing="hash"
              fallbackRedirectUrl={
                redirectUrl
              }
              signUpFallbackRedirectUrl={
                redirectUrl
              }
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  footer: "hidden",
                },
              }}
            />
          )
          )}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4 text-center">
          <p className="text-sm text-slate-500">
            ¿Necesitas ayuda?{" "}
            <a
              href="mailto:paul@datara-lab.com"
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Contactar soporte
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
