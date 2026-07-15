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

        <div className="mx-auto mt-12 flex w-full max-w-3xl flex-col gap-4 sm:flex-row">

          <input
            type="email"
            placeholder="Tu correo empresarial"
            className="
              flex-1
              rounded-xl
              border
              border-white/20
              bg-white
              px-6
              py-4
              text-slate-900
              placeholder:text-slate-400
              outline-none
              transition
              focus:border-cyan-300
              focus:ring-4
              focus:ring-white/20
            "
          />

          <a
            href="mailto:ventas@datara-lab.com?subject=Solicitud%20de%20Demo"
            className="
              flex
              items-center
              justify-center
              rounded-xl
              bg-slate-900
              px-8
              py-4
              font-semibold
              text-white
              transition
              hover:-translate-y-1
              hover:bg-slate-950
              hover:shadow-xl
            "
          >
            Solicitar demo →
          </a>

        </div>

        <p className="mt-6 text-sm text-blue-100">
          ¿Prefieres escribirnos directamente?{" "}
          <a
            href="mailto:ventas@datara-lab.com"
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            ventas@datara-lab.com
          </a>
        </p>

      </div>
    </section>
  );
}