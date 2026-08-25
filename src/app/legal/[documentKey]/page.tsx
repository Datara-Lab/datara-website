import Image from "next/image";
import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import Footer from "@/components/Footer";
import {
  legalDocumentContent,
} from "@/lib/legal/legal-document-content";
import {
  legalDocuments,
  type LegalDocumentKey,
} from "@/lib/legal/legal-documents";

type LegalDocumentPageProps = {
  params: Promise<{
    documentKey: string;
  }>;
};

export const dynamicParams =
  false;

export function generateStaticParams() {
  return legalDocuments.map(
    (document) => ({
      documentKey:
        document.key,
    }),
  );
}

export default async function LegalDocumentPage({
  params,
}: LegalDocumentPageProps) {
  const {
    documentKey,
  } = await params;

  const documentIndex =
    legalDocuments.findIndex(
      (document) =>
        document.key ===
        documentKey,
    );

  if (documentIndex < 0) {
    notFound();
  }

  const metadata =
    legalDocuments[
      documentIndex
    ];

  if (!metadata) {
    notFound();
  }

  const content =
    legalDocumentContent[
      documentKey as
        LegalDocumentKey
    ];

  if (!content) {
    notFound();
  }

  const previousDocument =
    documentIndex > 0
      ? legalDocuments[
          documentIndex - 1
        ]
      : null;

  const nextDocument =
    documentIndex <
    legalDocuments.length - 1
      ? legalDocuments[
          documentIndex + 1
        ]
      : null;

  return (
    <div className="min-h-screen bg-slate-100">
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
                Documento legal
              </p>
            </div>
          </Link>

          <Link
            href="/legal"
            className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition hover:border-blue-600 hover:bg-blue-50"
          >
            Centro legal
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#071b4a] via-[#07317c] to-[#0093a7] px-5 py-14 text-white sm:px-8">
          <div className="absolute -right-24 -top-36 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-center">
            <div className="flex w-full max-w-[410px] shrink-0 items-center gap-4 rounded-[26px] border border-white bg-white px-5 py-4 shadow-xl shadow-slate-950/25 md:w-[410px]">
              <Image
                src="/logos/lab-icon.png"
                alt="Ícono oficial de Datara Lab"
                width={88}
                height={88}
                priority
                className="h-24 w-24 shrink-0 object-contain"
              />

              <div className="min-w-0">
                <p className="text-3xl font-black tracking-tight text-[#071b4a]">
                  Datara
                </p>

                <p className="text-lg font-black uppercase tracking-[0.3em] text-blue-600">
                  Lab
                </p>

                <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-blue-600 to-cyan-400" />

                <p className="mt-2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.11em] text-slate-600">
                  Explora · Experimenta · Innova
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                {metadata.shortTitle}
              </p>

              <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                {metadata.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-blue-100">
                <span className="rounded-full bg-white/10 px-4 py-2">
                  Versión {content.version}
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2">
                  Referencia {content.effectiveDate}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-900">
            Versión de trabajo sujeta a revisión jurídica antes
            de su publicación definitiva en producción.
          </div>

          <article className="rounded-[30px] border border-slate-200 bg-white px-6 py-9 shadow-xl shadow-slate-900/5 sm:px-10 sm:py-12 lg:px-14">
            <div className="space-y-5">
              {content.blocks.map(
                (
                  block,
                  index,
                ) => {
                  if (
                    block.type ===
                    "title"
                  ) {
                    return null;
                  }

                  if (
                    block.type ===
                    "heading"
                  ) {
                    if (
                      block.level ===
                      3
                    ) {
                      return (
                        <h3
                          key={index}
                          className="border-l-4 border-cyan-500 pl-4 pt-4 text-xl font-black text-slate-900"
                        >
                          {block.text}
                        </h3>
                      );
                    }

                    return (
                      <h2
                        key={index}
                        className="border-b border-blue-100 pb-3 pt-7 text-2xl font-black text-[#071b4a]"
                      >
                        {block.text}
                      </h2>
                    );
                  }

                  if (
                    block.type ===
                    "list-item"
                  ) {
                    return (
                      <div
                        key={index}
                        role="listitem"
                        className="flex gap-3 pl-2 text-[15px] leading-7 text-slate-700"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[11px] h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-blue-700 to-cyan-500"
                        />

                        <p>
                          {block.text}
                        </p>
                      </div>
                    );
                  }

                  if (
                    block.type ===
                    "table"
                  ) {
                    return (
                      <div
                        key={index}
                        className="my-7 overflow-x-auto rounded-2xl border border-slate-200"
                      >
                        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                          <tbody>
                            {block.rows.map(
                              (
                                row,
                                rowIndex,
                              ) => (
                                <tr
                                  key={
                                    rowIndex
                                  }
                                  className={
                                    rowIndex ===
                                    0
                                      ? "bg-[#071b4a] text-white"
                                      : "border-t border-slate-200 even:bg-slate-50"
                                  }
                                >
                                  {row.map(
                                    (
                                      cell,
                                      cellIndex,
                                    ) => {
                                      const Cell =
                                        rowIndex ===
                                        0
                                          ? "th"
                                          : "td";

                                      return (
                                        <Cell
                                          key={
                                            cellIndex
                                          }
                                          className="whitespace-pre-line px-4 py-3 align-top leading-6"
                                        >
                                          {cell}
                                        </Cell>
                                      );
                                    },
                                  )}
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  const isDraftNotice =
                    index <= 5 &&
                    (
                      block.text.includes(
                        "VERSIÓN DE TRABAJO",
                      ) ||
                      block.text.includes(
                        "BORRADOR PARA REVISIÓN LEGAL",
                      )
                    );

                  if (
                    isDraftNotice
                  ) {
                    return null;
                  }

                  return (
                    <p
                      key={index}
                      className="text-[15px] leading-7 text-slate-700"
                    >
                      {block.text}
                    </p>
                  );
                },
              )}
            </div>
          </article>

          <nav
            aria-label="Navegación entre documentos legales"
            className="mt-8 grid gap-4 sm:grid-cols-2"
          >
            {previousDocument ? (
              <Link
                href={
                  previousDocument
                    .viewUrl
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-lg"
              >
                <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  Documento anterior
                </span>

                <p className="mt-2 font-bold text-slate-900">
                  {
                    previousDocument
                      .shortTitle
                  }
                </p>
              </Link>
            ) : (
              <div />
            )}

            {nextDocument ? (
              <Link
                href={
                  nextDocument
                    .viewUrl
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 text-right transition hover:border-blue-400 hover:shadow-lg"
              >
                <span className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  Documento siguiente
                </span>

                <p className="mt-2 font-bold text-slate-900">
                  {
                    nextDocument
                      .shortTitle
                  }
                </p>
              </Link>
            ) : null}
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
