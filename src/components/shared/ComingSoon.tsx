"use client";

import { usePathname, useRouter } from "next/navigation";

import Button from "@/components/ui/Button";

type ComingSoonProps = {
  eyebrow?: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export default function ComingSoon({
  eyebrow = "Datara",
  title,
  description,
  backHref,
  backLabel,
}: ComingSoonProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isCRM = pathname.startsWith("/crm");
  const isAnalytics = pathname.startsWith("/analytics");

  const resolvedBackHref =
    backHref ??
    (isCRM
      ? "/crm"
      : isAnalytics
        ? "/analytics"
        : "/portal");

  const resolvedBackLabel =
    backLabel ??
    (isCRM
      ? "Volver al inicio del CRM"
      : isAnalytics
        ? "Volver al resumen ejecutivo"
        : "Volver al portal");

  const accentStyles = isCRM
    ? {
        iconBackground: "bg-emerald-50",
        iconText: "text-emerald-700",
        eyebrow: "text-emerald-600",
      }
    : {
        iconBackground: "bg-blue-50",
        iconText: "text-blue-700",
        eyebrow: "text-blue-600",
      };

  return (
    <main className="flex min-h-[calc(100vh-144px)] items-center justify-center">
      <section className="w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div
          className={[
            "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
            accentStyles.iconBackground,
          ].join(" ")}
        >
          <span
            className={[
              "text-2xl font-black",
              accentStyles.iconText,
            ].join(" ")}
          >
            D
          </span>
        </div>

        <p
          className={[
            "mt-7 text-sm font-semibold uppercase tracking-[0.2em]",
            accentStyles.eyebrow,
          ].join(" ")}
        >
          {eyebrow}
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
          {description}
        </p>

        <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Disponible en la siguiente actualización
        </div>

        <div className="mt-9">
          <Button onClick={() => router.push(resolvedBackHref)}>
            {resolvedBackLabel}
          </Button>
        </div>
      </section>
    </main>
  );
}