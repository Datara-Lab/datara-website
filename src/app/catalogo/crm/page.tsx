import Image from "next/image";
import Link from "next/link";

import {
  FaArrowRight,
  FaCircleCheck,
  FaMotorcycle,
  FaPaw,
  FaSliders,
  FaUserTie,
} from "react-icons/fa6";

import CRMIndustryRequest from "@/components/crm/CRMIndustryRequest";
import Button from "@/components/ui/Button";

type IndustryProfile = {
  id: string;
  label: string;
  name: string;
  description: string;
  outcomes: string[];
  groupLabel?: string;
  availableProfiles: Array<{
    name: string;
    status: "available" | "coming-soon";
  }>;
  icon: "flexible" | "motorcycle" | "services" | "pets";
};

const capabilities = [
  ["01", "Clientes y ventas", "Del primer contacto al cierre, con todo el contexto disponible."],
  ["02", "Operación", "Cada negocio, responsable y siguiente paso en un mismo flujo."],
  ["03", "Inventario", "Existencias, unidades y reservas conectadas con la venta."],
  ["04", "Financiamiento y pagos", "Solicitudes, anticipos y cobros visibles desde la operación."],
  ["05", "Facturación CFDI", "Prepara, timbra y consulta facturas sin salir de Datara DBP."],
  ["06", "Automatización", "Reglas que eliminan tareas repetitivas y mantienen al equipo avanzando."],
] as const;

const profiles: IndustryProfile[] = [
  {
    id: "other",
    label: "Base flexible",
    name: "DBP para tu operación",
    description: "Una estructura adaptable para organizar clientes, ventas y procesos alrededor de tu empresa.",
    outcomes: ["Pipeline configurable", "Información centralizada", "Módulos que crecen contigo"],
    availableProfiles: [
      {
        name: "Configuración general",
        status: "available",
      },
    ],
    icon: "flexible",
  },
  {
    id: "motorcycle_dealership",
    label: "Perfil especializado",
    name: "Agencias y distribuidores",
    description: "Una operación conectada desde la oportunidad hasta la unidad, la factura y la entrega.",
    outcomes: ["Inventario por unidad y sucursal", "Reservas, pagos y financiamiento", "Ciclo comercial completo"],
    availableProfiles: [
      {
        name: "Motocicletas",
        status: "available",
      },
      {
        name: "Bicicletas",
        status: "available",
      },
      {
        name: "Scooters",
        status: "available",
      },
    ],
    icon: "motorcycle",
  },
  {
    id: "veterinary",
    label: "Template especializado",
    name: "Mascotas",
    description: "Una sola base para tutores y mascotas, con módulos que se activan conforme crece el negocio.",
    outcomes: ["Expediente único por mascota", "Agenda y operación conectadas", "Activa únicamente lo que necesitas"],
    groupLabel: "Módulos",
    availableProfiles: ["Veterinaria", "Grooming y estética", "Guardería y pensión", "Tienda de mascotas"].map((name) => ({ name, status: "available" as const })),
    icon: "pets",
  },
  {
    id: "professional_services",
    label: "Perfil especializado",
    name: "Servicios profesionales",
    description: "Seguimiento claro de prospectos, propuestas, clientes y responsables de principio a fin.",
    outcomes: ["Pipeline para servicios", "Cotizaciones y órdenes conectadas", "Control por cliente y responsable"],
    availableProfiles: [
      "Consultoría",
      "Software",
      "Infraestructura",
      "Agencias",
      "Despachos",
      "Servicios técnicos",
      "General",
    ].map((name) => ({
      name,
      status: "available" as const,
    })),
    icon: "services",
  },
];

function ProfileIcon({ icon }: { icon: IndustryProfile["icon"] }) {
  if (icon === "motorcycle") return <FaMotorcycle size={22} />;
  if (icon === "services") return <FaUserTie size={20} />;
  if (icon === "pets") return <FaPaw size={20} />;
  return <FaSliders size={20} />;
}

export default function CRMCatalogPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -top-28 h-[30rem] w-[30rem] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-200/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pb-24 lg:pb-28">
          <Link href="/#productos" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            ← Productos Datara
          </Link>

          <div className="mt-16 grid items-end gap-12 lg:grid-cols-[1fr_0.72fr] lg:gap-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Datara Business Platform
              </p>

              <h1 className="mt-10 max-w-4xl text-5xl font-black tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Todo tu negocio.
                <span className="block text-blue-600">Finalmente conectado.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                Clientes, ventas, operación, inventario y facturación en una plataforma configurada para la forma en que trabaja tu empresa.
              </p>
            </div>

            <div className="border-l border-slate-200 pl-7 sm:pl-9">
              <div className="mb-10 flex items-center gap-5">
                <Image
                  src="/logos/dbp-icon.png"
                  alt="Icono de Datara DBP"
                  width={132}
                  height={132}
                  priority
                  className="h-28 w-28 rounded-3xl object-contain sm:h-32 sm:w-32"
                />
                <div>
                  <p className="text-2xl font-black leading-none">Datara DBP</p>
                  <p className="mt-2 max-w-36 text-xs font-semibold leading-5 text-slate-500">
                    Una plataforma. Todo tu negocio.
                  </p>
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">De oportunidad a resultado</p>
              <div className="mt-6 space-y-5">
                {["Vende con contexto", "Opera con claridad", "Factura sin fricción", "Decide con información"].map((item, index) => (
                  <div key={item} className="flex items-center gap-4">
                    <span className="text-xs font-black text-blue-600">0{index + 1}</span>
                    <span className="font-bold text-slate-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-48 top-1/3 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Una sola operación</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Menos sistemas. Más control.</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600">
              Cada área comparte la misma información. Tu equipo avanza sin duplicar trabajo y tú entiendes qué está pasando.
            </p>
          </div>

          <div className="border-t border-slate-950">
            {capabilities.map(([number, title, description]) => (
              <article key={title} className="grid gap-3 border-b border-slate-200 py-6 sm:grid-cols-[3rem_0.7fr_1.3fr] sm:items-start sm:gap-5">
                <span className="text-xs font-black text-blue-600">{number}</span>
                <h3 className="font-black">{title}</h3>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="border-y border-slate-950 py-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            14 días gratis
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Descubre qué cambia cuando todo trabaja junto.
          </h2>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200 bg-slate-50">
        <div className="pointer-events-none absolute -left-48 top-24 h-[28rem] w-[28rem] rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-52 bottom-0 h-[30rem] w-[30rem] rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Perfiles disponibles</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">La plataforma se adapta a tu industria. No al revés.</h2>
          </div>

          <div className="mt-12 grid border-y border-slate-300 lg:grid-cols-4">
            {profiles.map((profile, index) => (
              <article
                key={profile.id}
                className={[
                  "flex h-full flex-col py-8 lg:px-8",
                  index > 0 ? "border-t border-slate-300 lg:border-l lg:border-t-0" : "",
                  index === 0 ? "lg:pl-0" : "",
                  index === profiles.length - 1 ? "lg:pr-0" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-blue-600">
                    <ProfileIcon icon={profile.icon} />
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Disponible</span>
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{profile.label}</p>
                <h3 className="mt-3 text-2xl font-black tracking-tight">{profile.name}</h3>
                <p className="mt-4 min-h-24 text-sm leading-6 text-slate-600">{profile.description}</p>

                <div className="mt-6 border-y border-slate-200 py-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {profile.groupLabel ?? "Perfiles"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2.5">
                    {profile.availableProfiles.map(
                      (availableProfile) => (
                        <span
                          key={
                            availableProfile.name
                          }
                          className={[
                            "inline-flex items-center gap-1.5 text-xs font-bold",
                            availableProfile.status ===
                            "available"
                              ? "text-blue-700"
                              : "text-slate-400",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              availableProfile.status ===
                              "available"
                                ? "bg-emerald-500"
                                : "bg-slate-300",
                            ].join(" ")}
                          />
                          {availableProfile.name}
                          {availableProfile.status ===
                            "coming-soon" && (
                            <span className="font-medium">
                              Próximamente
                            </span>
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {profile.outcomes.map((outcome) => (
                    <div key={outcome} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                      <FaCircleCheck className="mt-0.5 shrink-0 text-blue-600" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-9">
                  <Button href={`/demo?industry=${profile.id}`} variant="primary" size="lg" className="w-full">
                    {(profile.id === "professional_services" ||
                      profile.id === "motorcycle_dealership")
                      ? "Ver perfiles y probar"
                      : profile.id === "veterinary"
                        ? "Probar Mascotas"
                        : "Probar este perfil"}
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <a href="#solicitar-industria" className="mt-8 inline-flex items-center gap-3 text-sm font-black transition hover:text-blue-600">
            ¿Necesitas otra configuración? Cuéntanos cómo trabajas.
            <FaArrowRight />
          </a>
        </div>
      </section>

      <div id="solicitar-industria">
        <CRMIndustryRequest />
      </div>
    </main>
  );
}
