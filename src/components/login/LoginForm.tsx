import Button from "@/components/ui/Button";
import Image from "next/image";

export default function LoginForm() {
  return (
    <section className="flex h-full items-center justify-center bg-white px-8 py-5 sm:px-12">
      <div className="w-full max-w-md">
        <div className="flex w-full justify-center">
          <div className="w-[420px] max-w-full">
            <Image
              src="/logos/lab.png"
              alt="Datara Lab"
              width={460}
              height={150}
              priority
              className="mx-auto h-auto w-full object-contain"
            />
          </div>
        </div>

        <h2 className="mt-3 text-center text-4xl font-bold tracking-tight text-slate-950">
          Iniciar sesión
        </h2>

        <p className="mt-1.5 text-center text-slate-500">
          Accede a tu espacio de trabajo.
        </p>

        <form className="mt-5 space-y-3.5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.com"
              className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-800"
              >
                Contraseña
              </label>

              <a
                href="mailto:paul@datara-lab.com?subject=Recuperar%20acceso%20a%20Datara"
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                ¿La olvidaste?
              </a>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            Recordarme
          </label>

          <Button
            type="submit"
            size="lg"
            className="w-full justify-center py-3"
          >
            Iniciar sesión
          </Button>
        </form>

        <div className="mt-4 border-t border-slate-200 pt-4 text-center">
          <p className="text-sm text-slate-500">
            ¿Necesitas ayuda?{" "}
            <a
              href="mailto:paul@datara-lab.com"
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Contactar soporte
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}