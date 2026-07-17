import Image from "next/image";
import Link from "next/link";

const services = [
  {
    title: "Infraestructura Cloud",
    description:
      "Servidores y recursos preparados para las necesidades reales de tu empresa.",
  },
  {
    title: "Hosting de aplicaciones",
    description:
      "Alojamiento confiable para sitios web, sistemas empresariales y aplicaciones.",
  },
  {
    title: "Seguridad y respaldos",
    description:
      "Protección, respaldos automáticos y recuperación de información crítica.",
  },
  {
    title: "Servicios administrados",
    description:
      "Monitoreo, mantenimiento, actualizaciones y soporte especializado.",
  },
];

export default function CloudPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <nav className="flex items-center justify-between">
            <Link
              href="/portal"
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              ← Volver al Workspace
            </Link>

            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              Nuevo servicio
            </span>
          </nav>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">
                Datara Cloud
              </p>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                La infraestructura detrás de tu negocio.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Servidores, aplicaciones, almacenamiento,
                seguridad y servicios administrados para
                que tu operación permanezca siempre
                disponible.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#contacto"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5"
                >
                  Solicitar información
                </Link>

                <Link
                  href="/portal"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Ver productos Datara
                </Link>
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white p-8 shadow-2xl shadow-cyan-950/30">
              <Image
                src="/logos/cloud.png"
                alt="Datara Cloud"
                width={1400}
                height={800}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
              Servicios Cloud
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Nosotros administramos la tecnología.
              Tú administras tu negocio.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 font-black text-cyan-300">
                  ✓
                </div>

                <h3 className="mt-5 text-lg font-bold">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}