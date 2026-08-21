import Image from "next/image";
import Link from "next/link";

import {
    FaCubesStacked,
    FaMotorcycle,
    FaPaw,
    FaShieldHalved,
    FaTooth,
    FaUserTie,
} from "react-icons/fa6";

import CRMIndustryRequest from "@/components/crm/CRMIndustryRequest";
import Button from "@/components/ui/Button";

type CRMIndustry = {
  id: string;
  name: string;
  description: string;
  availablePackages: string[];
  status: "available" | "coming-soon";
};

const industries: CRMIndustry[] = [
  {
    id: "other",
    name: "CRM Core",
    description:
      "El núcleo comercial de Datara CRM para empresas que necesitan centralizar y dar seguimiento a toda su operación comercial.",
    availablePackages: [
      "CRM Core",
    ],
    status: "available",
  },
  {
    id: "motorcycle_dealership",
    name: "Agencias y distribuidores de motos",
    description:
      "Una solución comercial diseñada para agencias, distribuidores y negocios especializados en la venta de motocicletas.",
    availablePackages: [
      "CRM Core",
      "Ventas",
      "Inventarios",
      "Servicios",
    ],
    status: "available",
  },
  {
    id: "professional_services",
    name: "Servicios profesionales",
    description:
      "Para consultoras, agencias, despachos y empresas de servicios que necesitan administrar clientes y oportunidades de principio a fin.",
    availablePackages: [
      "CRM Core",
      "Ventas",
    ],
    status: "available",
  },
  {
    id: "dentistas",
    name: "Dentistas y ortodoncistas",
    description:
      "Gestión comercial y operativa para consultorios, clínicas dentales y especialistas en ortodoncia.",
    availablePackages: [],
    status: "coming-soon",
  },
  {
    id: "veterinarias",
    name: "Veterinarias y servicios para mascotas",
    description:
      "Una solución para negocios que combinan atención veterinaria con servicios especializados para mascotas.",
    availablePackages: [],
    status: "coming-soon",
  },
  {
    id: "seguros",
    name: "Seguros",
    description:
      "Gestión comercial para agentes, brokers y empresas que administran clientes, pólizas y renovaciones.",
    availablePackages: [],
    status: "coming-soon",
  },
];

export default function CRMCatalogPage() {
    return (
        <main className="min-h-screen bg-slate-50">
            <section className="relative overflow-hidden border-b border-slate-200 bg-white">
                <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl" />
                <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                    <Link
                        href="/#productos"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
                    >
                        ← Volver a productos
                    </Link>

                    <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                        <div className="max-w-3xl">
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                Catálogo Datara CRM
                            </span>

                            <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                                Un CRM diseñado para{" "}
                                <span className="bg-gradient-to-r from-emerald-700 via-green-500 to-cyan-500 bg-clip-text text-transparent">
                                    la forma en que trabaja tu industria.
                                </span>
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                                Elige la solución que mejor se adapte a tu empresa. Cada
                                versión de Datara CRM combina nuestro núcleo comercial con
                                módulos, procesos y herramientas específicas para cada
                                industria.
                            </p>
                        </div>

                        <div className="hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 lg:block">
                            <Image
                                src="/logos/crm.png"
                                alt="Datara CRM"
                                width={280}
                                height={110}
                                priority
                                className="h-auto w-64 object-contain"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                <div className="max-w-3xl">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
                        Soluciones por industria
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        Elige el CRM que mejor se adapte a tu empresa
                    </h2>

                    <p className="mt-4 text-base leading-7 text-slate-600">
                        Todas nuestras soluciones parten de Datara CRM Core y
                        agregan herramientas, procesos y configuraciones
                        específicas para cada industria.
                    </p>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {industries.map((industry) => {
                        const isAvailable =
                            industry.status ===
                            "available";

                        return (
                            <article
                                key={
                                    industry.id
                                }
                                className={[
                                    "relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white p-7 shadow-lg shadow-slate-950/5 transition duration-300",
                                    isAvailable
                                        ? "border-slate-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10"
                                        : "border-slate-200",
                                ].join(
                                    " ",
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50 text-blue-700 shadow-sm ring-1 ring-slate-200">
                                        {industry.id === "other" && (
                                            <FaCubesStacked
                                                size={26}
                                            />
                                        )}

                                        {industry.id ===
                                            "motorcycle_dealership" && (
                                            <FaMotorcycle
                                                size={28}
                                            />
                                        )}

                                        {industry.id ===
                                            "professional_services" && (
                                            <FaUserTie
                                                size={26}
                                            />
                                        )}

                                        {industry.id === "dentistas" && (
                                            <FaTooth
                                                size={26}
                                            />
                                        )}

                                        {industry.id === "veterinarias" && (
                                            <FaPaw
                                                size={26}
                                            />
                                        )}

                                        {industry.id === "seguros" && (
                                            <FaShieldHalved
                                                size={26}
                                            />
                                        )}
                                    </div>

                                    {isAvailable ? (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                            Disponible
                                        </span>
                                    ) : (
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                                            Próximamente
                                        </span>
                                    )}
                                </div>

                                <h3 className="mt-6 min-h-[64px] text-2xl font-black tracking-tight text-slate-950">
                                    {
                                        industry.name
                                    }
                                </h3>

                                <p className="mt-3 min-h-[96px] text-sm leading-6 text-slate-600">
                                    {
                                        industry.description
                                    }
                                </p>

                                <div className="my-6 h-px bg-slate-200" />

                                {isAvailable ? (
                                    industry.id === "other" ? (
                                        <>
                                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                Incluye
                                            </p>

                                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-sm font-bold text-slate-900">
                                                    CRM Core
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    Todo lo necesario para comenzar
                                                    a gestionar tu operación
                                                    comercial.
                                                </p>

                                                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                                    {[
                                                        "Prospectos",
                                                        "Clientes",
                                                        "Oportunidades",
                                                        "Productos",
                                                        "Actividades",
                                                        "Documentos",
                                                        "Integraciones",
                                                        "Automatizaciones",
                                                        "Resumen y Analytics",
                                                    ].map(
                                                        (
                                                            moduleName,
                                                        ) => (
                                                            <div
                                                                key={
                                                                    moduleName
                                                                }
                                                                className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                                                            >
                                                                <span className="text-blue-600">
                                                                    ✓
                                                                </span>

                                                                <span>
                                                                    {
                                                                        moduleName
                                                                    }
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                Incluye
                                            </p>

                                            <div className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-800">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                                                    ✓
                                                </span>

                                                <span>
                                                    CRM Core
                                                </span>
                                            </div>

                                            {industry.availablePackages.length >
                                                1 && (
                                                <>
                                                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                        Expansiones disponibles
                                                    </p>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {industry.availablePackages
                                                            .filter(
                                                                (
                                                                    packageName,
                                                                ) =>
                                                                    packageName !==
                                                                    "CRM Core",
                                                            )
                                                            .map(
                                                                (
                                                                    packageName,
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            packageName
                                                                        }
                                                                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                                                                    >
                                                                        +{" "}
                                                                        {
                                                                            packageName
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                    </div>

                                                    <p className="mt-5 text-sm leading-6 text-slate-500">
                                                        Empieza con CRM Core y
                                                        agrega únicamente las
                                                        expansiones que necesites.
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                        <p className="text-sm leading-6 text-slate-500">
                                            Estamos preparando los módulos y
                                            configuración específicos para
                                            esta industria.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-auto pt-8">
                                    {isAvailable ? (
                                        <Button
                                            href={`/demo?industry=${industry.id}`}
                                            variant="primary"
                                            size="lg"
                                            className="w-full"
                                        >
                                            Iniciar prueba gratis 14 días
                                        </Button>
                                    ) : (
                                        <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-slate-500">
                                            Próximamente
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <CRMIndustryRequest />
        </main>
    );
}
