export default function CTA() {
  return (
    <section id="contacto" className="px-8 py-24">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-8 py-16 text-center text-white shadow-2xl shadow-blue-500/20 md:px-16">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
          Da el siguiente paso
        </p>

        <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
          Descubre cómo Datara puede ayudar a tu empresa a vender mejor y tomar
          decisiones más claras.
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-50">
          Agenda una demostración y conoce Datara Analytics, Datara CRM o una
          solución integrada con ambos productos.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="mailto:paul@datara-lab.com?subject=Solicitud%20de%20demo%20Datara"
            className="rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 transition hover:-translate-y-1 hover:shadow-xl"
          >
            Solicitar una demo
          </a>

          <a
            href="mailto:paul@datara-lab.com"
            className="rounded-xl border border-white/40 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            paul@datara-lab.com
          </a>
        </div>
      </div>
    </section>
  );
}