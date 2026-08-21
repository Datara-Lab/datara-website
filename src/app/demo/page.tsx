import {
    auth,
} from "@clerk/nextjs/server";

import Image from "next/image";

import {
    redirect,
} from "next/navigation";

import TrialActivationForm from "@/components/onboarding/TrialActivationForm";

type DemoPageProps = {
    searchParams: Promise<{
        industry?: string;
    }>;
};

const allowedIndustries = [
    "motorcycle_dealership",
    "professional_services",
] as const;

export default async function DemoPage({
    searchParams,
}: DemoPageProps) {
    if (
        process.env
            .DATARA_ENVIRONMENT
            ?.trim()
            .toLowerCase() ===
        "demo"
    ) {
        redirect(
            "/login?redirect_url=%2Fseleccionar-empresa",
        );
    }

    const {
        industry,
    } = await searchParams;

    if (
        !industry ||
        !allowedIndustries.includes(
            industry as (
                typeof allowedIndustries
            )[number],
        )
    ) {
        redirect(
            "/catalogo/crm",
        );
    }

    const {
        userId,
    } = await auth();

    if (!userId) {
        const redirectUrl =
            encodeURIComponent(
                `/demo?industry=${industry}`,
            );

        redirect(
            `/login?mode=sign-up&redirect_url=${redirectUrl}`,
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 py-10 sm:px-8">
            <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
                <section className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-12">
                    <div>
                        <a
                            href="/"
                            aria-label="Volver al inicio de Datara Lab"
                            className="inline-flex w-fit items-center gap-4 rounded-2xl border border-white/20 bg-white px-5 py-3 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/30"
                        >
                            <Image
                                src="/logos/lab-icon.png"
                                alt=""
                                width={52}
                                height={52}
                                priority
                                className="h-[52px] w-[52px] object-contain"
                            />

                            <span className="text-left">
                                <span className="block text-2xl font-bold leading-none text-slate-900">
                                    Datara Lab
                                </span>

                                <span className="mt-1.5 block text-sm text-slate-500">
                                    Explora • Experimenta • Innova
                                </span>
                            </span>
                        </a>

                        <p className="mt-14 text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">
                            Demo gratuito
                        </p>

                        <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight sm:text-5xl">
                            Conoce Datara CRM durante 14 días.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                            Activaremos la edición completa correspondiente a tu industria, con sus módulos, roles y configuración inicial.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p className="text-2xl font-black text-cyan-300">
                                14 días
                            </p>

                            <p className="mt-2 text-sm text-slate-300">
                                Acceso sin tarjeta bancaria.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p className="text-2xl font-black text-cyan-300">
                                Completo
                            </p>

                            <p className="mt-2 text-sm text-slate-300">
                                Template integral de la industria.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <p className="text-2xl font-black text-cyan-300">
                                Seguro
                            </p>

                            <p className="mt-2 text-sm text-slate-300">
                                Una activación por usuario y RFC.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="flex items-center bg-white p-8 sm:p-12">
                    <div className="mx-auto w-full max-w-md">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                            Configura tu espacio
                        </p>

                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                            Activa tu demo
                        </h2>

                        <p className="mt-3 leading-7 text-slate-500">
                            Captura los datos de tu empresa para preparar automáticamente Datara CRM.
                        </p>

                        <div className="mt-8">
                            <TrialActivationForm
                                initialIndustry={
                                    industry
                                }
                            />
                        </div>

                        <p className="mt-8 text-center text-sm text-slate-500">
                            ¿Ya tienes una empresa configurada?{" "}

                            <a
                                href="/portal"
                                className="font-bold text-blue-600 transition hover:text-blue-700"
                            >
                                Ir al portal
                            </a>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}
