export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-8 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <p className="text-lg font-bold text-slate-900">Datara Lab</p>

          <p className="mt-1 text-sm text-slate-500">
            Explora · Experimenta · Innova
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-600">
          <a className="transition hover:text-blue-600" href="#productos">
            Productos
          </a>

          <a className="transition hover:text-blue-600" href="#contacto">
            Contacto
          </a>

          <a
            className="transition hover:text-blue-600"
            href="mailto:ventas@datara-lab.com"
          >
            soporte@datara-lab.com
          </a>
        </div>

        <p className="text-sm text-slate-500">
          © 2026 Datara Lab
        </p>
      </div>
    </footer>
  );
}