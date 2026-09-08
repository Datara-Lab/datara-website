import DataraEcosystemVisual from "@/components/DataraEcosystemVisual";

export default function Hero() {
  return (
    <section
      id="nosotros"
      className="relative scroll-mt-20 overflow-hidden"
    >
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-8 py-20 lg:grid-cols-[1fr_0.95fr]">
        <div>
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700">
            Una operación · Una visión · Más crecimiento
          </span>

          <h1 className="mt-8 max-w-3xl text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            Todo tu negocio conectado.{" "}
            <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Cada decisión, más clara.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Datara Lab integra operación, infraestructura y datos para que
            vendas, controles y crezcas sin saltar entre sistemas.
          </p>

          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-slate-500">
            <span>✓ Hecho para tu industria</span>
            <span>✓ Todo conectado</span>
            <span>✓ Escala a tu ritmo</span>
          </div>
        </div>

        <DataraEcosystemVisual />
      </div>
    </section>
  );
}
