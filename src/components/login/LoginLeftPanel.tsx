import Image from "next/image";

export default function LoginLeftPanel() {
  return (
    <section className="relative hidden h-full overflow-hidden bg-gradient-to-br from-[#020617] via-[#07152f] to-[#0b2948] text-white lg:block">

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      {/* Analytics */}
      <div className="absolute top-8 right-10 z-20 animate-[float1_7s_ease-in-out_infinite]">
        <div className="rotate-[-3deg] rounded-3xl border border-white/20 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              src="/logos/analytics-icon.png"
              alt="Analytics"
              width={50}
              height={50}
              className="h-12 w-12 object-contain"
            />

            <div>
              <p className="text-lg font-bold text-slate-900">
                Analytics
              </p>

              <p className="text-sm text-slate-500">
                Dashboards · KPIs · Reportes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex h-full flex-col justify-center px-12">

        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-400">
          Una sola plataforma
        </p>

        <h1 className="mt-6 text-5xl font-black leading-tight">
          Todos tus

          <span className="mt-2 block bg-gradient-to-r from-blue-400 via-cyan-300 to-cyan-400 bg-clip-text text-transparent">
            productos.
          </span>
        </h1>

        <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">
          Inicia sesión una sola vez y accede únicamente a los productos
          habilitados para tu empresa.
        </p>

        <div className="mt-8 space-y-4">

          <div className="flex items-center gap-4">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>Inicio de sesión único</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>Acceso según tu licencia</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span>Analytics, CRM o ambos</span>
          </div>

        </div>

      </div>

      {/* CRM */}
      <div className="absolute left-10 bottom-10 z-20 animate-[float2_8s_ease-in-out_infinite]">
        <div className="rotate-[3deg] rounded-3xl border border-white/20 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur">

          <div className="flex items-center gap-4">

            <Image
              src="/logos/crm-icon.png"
              alt="CRM"
              width={50}
              height={50}
              className="h-12 w-12 object-contain"
            />

            <div>

              <p className="text-lg font-bold text-slate-900">
                CRM
              </p>

              <p className="text-sm text-slate-500">
                Prospectos · Clientes · Ventas
              </p>

            </div>

          </div>

        </div>
      </div>

    </section>
  );
}