import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-blue-100 bg-white px-6 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <Image
            src="/logos/lab-icon.png"
            alt="Ícono oficial de Datara Lab"
            width={46}
            height={46}
            className="h-12 w-12 object-contain"
          />

          <div>
            <p className="text-lg font-black text-slate-950">
              Datara Lab
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Explora · Experimenta · Innova
            </p>
          </div>
        </Link>

        <nav
          aria-label="Navegación del pie de página"
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-600"
        >
          <Link
            className="transition hover:text-blue-700"
            href="/#productos"
          >
            Productos
          </Link>

          <Link
            className="transition hover:text-blue-700"
            href="/#contacto"
          >
            Contacto
          </Link>

          <Link
            className="transition hover:text-blue-700"
            href="/legal"
          >
            Centro legal
          </Link>

          <a
            className="transition hover:text-blue-700"
            href="mailto:soporte@datara-lab.com"
          >
            soporte@datara-lab.com
          </a>
        </nav>

        <p className="text-sm font-medium text-slate-400">
          © 2026 Datara Lab
        </p>
      </div>
    </footer>
  );
}
