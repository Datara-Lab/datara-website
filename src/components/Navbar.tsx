import Image from "next/image";
import Button from "./ui/Button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        {/* Logo */}

        <a href="/" className="flex items-center gap-4">

          <Image
            src="/logos/lab-icon.png"
            alt="Datara Lab"
            width={42}
            height={42}
            priority
          />

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Datara Lab
            </h1>

            <p className="text-sm text-slate-500">
              Explora • Experimenta • Innova
            </p>

          </div>

        </a>

        {/* Menu */}

        <nav className="hidden items-center gap-10 text-base font-medium text-slate-700 lg:flex">

          <a href="#productos" className="transition hover:text-blue-600">
            Productos
          </a>

          <a href="#nosotros" className="transition hover:text-blue-600">
            Nosotros
          </a>

          <a href="#contacto" className="transition hover:text-blue-600">
            Contacto
          </a>

        </nav>

        {/* CTA */}

        <Button size="lg">
          Solicitar Demo
        </Button>

      </div>
    </header>
  );
}