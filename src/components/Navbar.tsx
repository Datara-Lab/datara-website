import Image from "next/image";

import Button from "./ui/Button";

type NavbarProps = {
  homeHref?: string;
};

export default function Navbar({
  homeHref = "/",
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a
          href={homeHref}
          className="flex items-center gap-2 sm:gap-4"
        >
          <Image
            src="/logos/lab-icon.png"
            alt="Datara Lab"
            width={42}
            height={42}
            priority
          />

          <div>
            <p className="text-lg font-bold text-slate-900 sm:text-2xl">
              Datara Lab
            </p>

            <p className="hidden text-sm text-slate-500 sm:block">
              Explora • Experimenta • Innova
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-10 text-base font-medium text-slate-700 lg:flex">
          <a
            href={`${homeHref}#productos`}
            className="transition hover:text-blue-600"
          >
            Productos
          </a>

          <a href="/sitios-web" className="transition hover:text-blue-600">Sitios Web</a>

          <a
            href={`${homeHref}#nosotros`}
            className="transition hover:text-blue-600"
          >
            Nosotros
          </a>

          <a
            href={`${homeHref}#contacto`}
            className="transition hover:text-blue-600"
          >
            Contacto
          </a>
        </nav>

        <Button
          size="lg"
          className="!px-3 sm:!px-8"
          href="/login"
        >
          Iniciar sesión
        </Button>
      </div>
      <nav aria-label="Navegación móvil" className="flex justify-center gap-6 border-t border-slate-100 px-5 py-3 text-sm font-medium text-slate-700 lg:hidden">
        <a href={`${homeHref}#productos`} className="hover:text-blue-600">Productos</a>
        <a href="/sitios-web" className="hover:text-blue-600">Sitios Web</a>
        <a href={`${homeHref}#contacto`} className="hover:text-blue-600">Contacto</a>
      </nav>
    </header>
  );
}
