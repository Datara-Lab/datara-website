import Link from "next/link";

import {
  requirePlatformAdministrator,
} from "@/lib/platform/authorization";

const baseAdministrationModules = [
  {
    title: "Empresa",
    description:
      "Información general, branding, logo, colores corporativos y personalización del Workspace.",
    href: "/administracion/empresa",
    status: "Disponible",
  },
  {
    title: "Suscripción y pagos",
    description:
      "Consulta tu plan, próxima renovación, estado de pago y administra el método de pago de la empresa.",
    href: "/administracion/suscripcion",
    status: "Disponible",
  },
  {
    title: "Usuarios",
    description:
      "Invita colaboradores, administra miembros y organiza equipos de trabajo.",
    href: "/administracion/usuarios",
    status: "Disponible",
  },
  {
    title: "Roles y permisos",
    description:
      "Define qué puede consultar, crear, editar, eliminar o administrar cada perfil.",
    href: "/administracion/roles",
    status: "Disponible",
  },
  {
    title: "Integraciones",
    description:
      "Conecta Datara con ERP, correo, pagos, mensajería y otras plataformas.",
    href: "#",
    status: "Próximamente",
  },
  {
    title: "Seguridad",
    description:
      "Administra sesiones, acceso, autenticación y políticas de seguridad.",
    href: "#",
    status: "Próximamente",
  },
];

export default async function AdministracionPage() {
  let isPlatformAdministrator =
    false;

  try {
    await requirePlatformAdministrator();

    isPlatformAdministrator =
      true;
  } catch {
    isPlatformAdministrator =
      false;
  }

  const administrationModules =
    isPlatformAdministrator
      ? [
          ...baseAdministrationModules,

          {
            title:
              "Catálogo comercial",

            description:
              "Administra precios, paquetes, expansiones, módulos, usuarios y almacenamiento de los productos Datara.",

            href:
              "/administracion/comercial",

            status:
              "Disponible",
          },

          {
            title:
              "Inteligencia artificial",

            description:
              "Selecciona el proveedor de IA del ambiente, pausa el servicio y monitorea consultas, rendimiento y gasto estimado.",

            href:
              "/administracion/ia",

            status:
              "Disponible",
          },
        ]
      : baseAdministrationModules;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Datara Workspace
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Administración
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Administra la organización, los usuarios y la configuración global de todos los productos Datara.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {administrationModules.map((module) => {
            const isAvailable = module.status === "Disponible";

            const card = (
              <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-black text-slate-950">
                    {module.title}
                  </h2>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-bold",
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {module.status}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>

                <p className="mt-auto pt-6 text-sm font-bold text-blue-700">
                  {isAvailable ? "Abrir módulo →" : "En desarrollo"}
                </p>
              </article>
            );

            return isAvailable ? (
              <Link key={module.title} href={module.href}>
                {card}
              </Link>
            ) : (
              <div key={module.title}>{card}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
