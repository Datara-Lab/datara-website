import type {
  CSSProperties,
} from "react";

export type AccessPreparationStage =
  | "invitation"
  | "account"
  | "permissions"
  | "workspace";

type AccessPreparationScreenProps = {
  stage?: AccessPreparationStage;
  error?: string | null;
};

const stages: Array<{
  id: AccessPreparationStage;
  label: string;
}> = [
  {
    id: "invitation",
    label: "Invitación verificada",
  },
  {
    id: "account",
    label: "Cuenta preparada",
  },
  {
    id: "permissions",
    label: "Configurando permisos",
  },
  {
    id: "workspace",
    label: "Abriendo Datara CRM",
  },
];

const progressByStage: Record<
  AccessPreparationStage,
  number
> = {
  invitation: 20,
  account: 45,
  permissions: 75,
  workspace: 100,
};

const messageByStage: Record<
  AccessPreparationStage,
  string
> = {
  invitation:
    "Estamos verificando tu invitación.",
  account:
    "Estamos preparando tu cuenta.",
  permissions:
    "Estamos asignando tu empresa, rol y permisos.",
  workspace:
    "Tu acceso está listo. Estamos abriendo tu espacio de trabajo.",
};

const iconMaskStyle: CSSProperties = {
  WebkitMaskImage:
    "url('/logos/lab-icon.png')",
  maskImage:
    "url('/logos/lab-icon.png')",
  WebkitMaskPosition:
    "center",
  maskPosition:
    "center",
  WebkitMaskRepeat:
    "no-repeat",
  maskRepeat:
    "no-repeat",
  WebkitMaskSize:
    "contain",
  maskSize:
    "contain",
};

export default function AccessPreparationScreen({
  stage = "invitation",
  error = null,
}: AccessPreparationScreenProps) {
  const currentIndex =
    stages.findIndex(
      (item) => item.id === stage,
    );

  const progress =
    progressByStage[stage];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-5 py-10">
      <section
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white px-7 py-9 shadow-2xl shadow-blue-950/10 sm:px-10"
        aria-live="polite"
        aria-busy={!error}
      >
        <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-blue-600">
          Datara Workspace
        </p>

        <div
          className="relative mx-auto mt-7 h-32 w-32 overflow-hidden"
          role="progressbar"
          aria-label="Preparación de acceso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="absolute inset-0 bg-slate-200"
            style={iconMaskStyle}
          />

          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden transition-[height] duration-1000 ease-in-out motion-reduce:transition-none"
            style={{
              height: `${progress}%`,
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-tr from-blue-800 via-blue-600 to-cyan-400"
              style={iconMaskStyle}
            />
          </div>
        </div>

        <h1 className="mt-7 text-center text-2xl font-black text-slate-950">
          Preparando tu acceso
        </h1>

        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-600">
          {messageByStage[stage]}
        </p>

        <ol className="mx-auto mt-8 grid max-w-sm gap-3">
          {stages.map(
            (item, index) => {
              const isComplete =
                index < currentIndex;

              const isCurrent =
                index === currentIndex;

              return (
                <li
                  key={item.id}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-500 motion-reduce:transition-none",
                    isCurrent
                      ? "bg-blue-50 text-blue-800"
                      : "",
                    isComplete
                      ? "text-slate-800"
                      : "",
                    !isComplete &&
                    !isCurrent
                      ? "text-slate-400"
                      : "",
                  ].join(" ")}
                  aria-current={
                    isCurrent
                      ? "step"
                      : undefined
                  }
                >
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : "",
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : "",
                      !isComplete &&
                      !isCurrent
                        ? "bg-slate-100 text-slate-400"
                        : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {isComplete
                      ? "✓"
                      : index + 1}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </li>
              );
            },
          )}
        </ol>

        {error ? (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
          >
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
