import Image from "next/image";

type FlowStep = {
  key: string;
  label: string;
  detail: string;
  icon: "person" | "target" | "invoice" | "loyalty";
};

const flowSteps: FlowStep[] = [
  {
    key: "prospect",
    label: "Prospecto",
    detail: "Nuevo interés",
    icon: "person",
  },
  {
    key: "opportunity",
    label: "Oportunidad",
    detail: "Seguimiento",
    icon: "target",
  },
  {
    key: "invoice",
    label: "Venta y factura",
    detail: "Operación cerrada",
    icon: "invoice",
  },
  {
    key: "loyalty",
    label: "Lealtad",
    detail: "Cliente recurrente",
    icon: "loyalty",
  },
];

function FlowIcon({
  icon,
}: {
  icon: FlowStep["icon"];
}) {
  if (icon === "person") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
      </svg>
    );
  }

  if (icon === "target") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="11" cy="13" r="7" />
        <circle cx="11" cy="13" r="3" />
        <path d="m14 10 6-6M16 4h4v4" />
      </svg>
    );
  }

  if (icon === "invoice") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 3h9l3 3v15l-3-1.5L12 21l-3-1.5L6 21V3Z" />
        <path d="M9 9h6M9 13h6M9 17h3" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}

function QRGraphic() {
  return (
    <svg
      aria-label="Código QR"
      role="img"
      viewBox="0 0 72 72"
      className="h-16 w-16"
      fill="none"
    >
      <rect width="72" height="72" rx="10" fill="white" />
      <g fill="#0f172a">
        <path d="M8 8h22v22H8V8Zm5 5v12h12V13H13ZM42 8h22v22H42V8Zm5 5v12h12V13H47ZM8 42h22v22H8V42Zm5 5v12h12V47H13Z" />
        <path d="M36 35h8v8h-8zM48 35h7v7h-7zM59 35h5v12h-5zM36 48h7v16h-7zM47 47h6v6h-6zM55 53h9v11h-9zM47 58h5v6h-5z" />
      </g>
      <path
        d="M33 9c7 2 14 7 18 13"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AnalyticsGraphic() {
  return (
    <svg
      aria-label="Gráfica de crecimiento"
      role="img"
      viewBox="0 0 220 88"
      className="h-[88px] w-full"
      fill="none"
    >
      <defs>
        <linearGradient
          id="analyticsArea"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="analyticsLine"
          x1="10"
          y1="70"
          x2="210"
          y2="14"
        >
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      <path
        d="M10 69 42 62 74 66 106 45 138 50 171 30 210 16v62H10V69Z"
        fill="url(#analyticsArea)"
      />
      <path
        d="M10 69 42 62 74 66 106 45 138 50 171 30 210 16"
        stroke="url(#analyticsLine)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[10, 42, 74, 106, 138, 171, 210].map(
        (x, index) => {
          const y =
            [69, 62, 66, 45, 50, 30, 16][index];

          return (
            <circle
              key={x}
              cx={x}
              cy={y}
              r="3.5"
              fill="white"
              stroke="#0891b2"
              strokeWidth="2"
            />
          );
        },
      )}
    </svg>
  );
}

export default function DataraEcosystemVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <div className="absolute inset-10 rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-teal-300/20 blur-3xl" />

      <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logos/dbp-icon.png"
              alt="Ícono de Datara DBP"
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl object-contain"
            />

            <div>
              <p className="text-lg font-black tracking-tight text-slate-950">
                Datara DBP
              </p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-600">
                Una plataforma · Todo tu negocio
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600">
              Visión completa
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Todo sucede en Datara
            </p>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">
                Así fluye tu negocio
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Cada paso actualiza la misma historia
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
              En vivo
            </span>
          </div>

          <div className="relative mt-5 grid grid-cols-4 gap-2">
            <div className="pointer-events-none absolute left-[10%] right-[10%] top-5 h-px bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />

            {flowSteps.map(
              (step, index) => (
                <div
                  key={step.key}
                  className="relative min-w-0 text-center"
                >
                  <span
                    className={[
                      "relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm",
                      index === 0
                        ? "border-blue-200 text-blue-600"
                        : index === 1
                          ? "border-cyan-200 text-cyan-600"
                          : index === 2
                            ? "border-violet-200 text-violet-600"
                            : "border-emerald-200 text-emerald-600",
                    ].join(" ")}
                  >
                    <FlowIcon icon={step.icon} />
                  </span>

                  <p className="mt-2 truncate text-[11px] font-black text-slate-800">
                    {step.label}
                  </p>
                  <p className="mt-0.5 hidden text-[9px] text-slate-400 sm:block">
                    {step.detail}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Datara Analytics
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  Crecimiento visible
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-emerald-600">
                  +28%
                </p>
                <p className="text-[9px] font-semibold text-slate-400">
                  vs. periodo anterior
                </p>
              </div>
            </div>

            <AnalyticsGraphic />
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">
                  QR conectado
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Escanea, consulta y actúa.
                </p>
              </div>

              <QRGraphic />
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
              <Image
                src="/logos/cloud-icon.png"
                alt="Datara Cloud"
                width={24}
                height={24}
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-white">
                  Respaldado por Datara Cloud
                </p>
                <p className="text-[9px] text-emerald-300">
                  99.9% disponible
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-[10px] font-bold text-slate-500">
          <span>Inventario conectado</span>
          <span className="h-1 w-1 rounded-full bg-cyan-400" />
          <span>CFDI relacionado</span>
          <span className="h-1 w-1 rounded-full bg-cyan-400" />
          <span>Lealtad medible</span>
        </div>
      </div>
    </div>
  );
}
