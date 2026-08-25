import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import {
  legalBundleEffectiveDate,
  legalBundleVersion,
  legalDocuments,
} from "@/lib/legal/legal-documents";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/logos/lab-icon.png"
              alt="Datara Lab"
              width={46}
              height={46}
              priority
              className="h-12 w-12 object-contain"
            />

            <div>
              <p className="text-lg font-black text-slate-950">
                Datara Lab
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Centro legal
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#071b4a] via-[#062b73] to-[#008ba3] px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_470px]">
            <div>
              <span className="inline-flex rounded-full border border-cyan-200/30 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
                Transparencia y confianza
              </span>

              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Documentación legal de Datara
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-blue-100 sm:text-lg">
                Consulta las condiciones de contratación,
                privacidad, tratamiento y conservación de datos
                aplicables a los productos Datara.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-blue-100">
                <span className="rounded-full bg-white/10 px-4 py-2">
                  Versión {legalBundleVersion}
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2">
                  Vigencia {legalBundleEffectiveDate}
                </span>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[470px] items-center gap-5 rounded-[30px] border border-white bg-white px-6 py-5 shadow-2xl shadow-slate-950/30">
              <Image
                src="/logos/lab-icon.png"
                alt="Ícono oficial de Datara Lab"
                width={112}
                height={112}
                priority
                className="h-28 w-28 shrink-0 object-contain"
              />

              <div className="min-w-0">
                <p className="text-4xl font-black tracking-tight text-[#071b4a]">
                  Datara
                </p>

                <p className="mt-1 text-xl font-black uppercase tracking-[0.32em] text-blue-600">
                  Lab
                </p>

                <div className="mt-3 h-0.5 w-full bg-gradient-to-r from-blue-600 to-cyan-400" />

                <p className="mt-3 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                  Explora · Experimenta · Innova
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
                Documentos vigentes
              </p>

              <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
                Consulta cada documento en línea
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Los documentos se presentan en formato de
                lectura web. Sus archivos fuente se conservan
                internamente para control documental.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {legalDocuments.map(
                (document, index) => (
                  <article
                    key={document.key}
                    className="group flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
                  >
                    <div className="h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                    <div className="flex flex-1 flex-col p-7">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        {document.requiredAtCheckout ? (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
                            Contratación
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                        {document.shortTitle}
                      </p>

                      <h3 className="mt-2 text-xl font-black leading-7 text-slate-950">
                        {document.title}
                      </h3>

                      <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                        {document.description}
                      </p>

                      <div className="mt-7 border-t border-slate-100 pt-5">
                        <Link
                          href={
                            document.viewUrl
                          }
                          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500 px-5 py-3 text-sm font-black !text-white shadow-md shadow-blue-900/10 transition hover:from-blue-800 hover:to-cyan-600"
                        >
                          Ver documento
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>

            <div className="mt-12 rounded-[28px] bg-[#071b4a] p-7 text-blue-100 shadow-xl sm:p-9">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-black text-white">
                    ¿Tienes alguna consulta?
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6">
                    Para soporte, privacidad o ejercicio de
                    derechos ARCO, comunícate directamente con
                    nuestro equipo.
                  </p>
                </div>

                <a
                  href="mailto:soporte@datara-lab.com"
                  className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-center text-sm font-black !text-white shadow-lg shadow-slate-950/20 transition hover:from-blue-500 hover:to-cyan-400"
                >
                  soporte@datara-lab.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
