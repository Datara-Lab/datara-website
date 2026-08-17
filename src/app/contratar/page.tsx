import CommercialConfigurator from "@/components/commercial/CommercialConfigurator";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

type ContratarPageProps = {
    searchParams:
        Promise<{
            purchase?:
                | string
                | string[];

            industry?:
                | string
                | string[];
        }>;
};

export default async function ContratarPage({
    searchParams,
}: ContratarPageProps) {
    const parameters =
        await searchParams;

    const purchaseType =
        parameters.purchase ===
        "trial_conversion"
            ? "trial_conversion"
            : parameters.purchase ===
                "subscription_change"
              ? "subscription_change"
              : "new_customer";

    const initialIndustry =
        typeof parameters.industry ===
        "string"
            ? parameters.industry
            : "";

    return (
        <>
            <Navbar
                homeHref={
                    purchaseType ===
                        "subscription_change"
                        ? "/portal"
                        : "/"
                }
            />

            <main className="min-h-screen bg-slate-50 px-5 py-16 sm:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                            Datara Lab
                        </p>

                        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            {purchaseType ===
                            "trial_conversion"
                                ? "Continúa trabajando con Datara CRM"
                                : purchaseType ===
                                    "subscription_change"
                                  ? "Actualiza tu plan de Datara CRM"
                                  : "Configura la solución ideal para tu empresa"}
                        </h1>

                        <p className="mt-5 text-lg leading-8 text-slate-600">
                            {purchaseType ===
                            "trial_conversion"
                                ? "Selecciona los módulos que conservará tu empresa y convierte el demo en una suscripción sin perder la información registrada."
                                : purchaseType ===
                                    "subscription_change"
                                  ? "Agrega o retira capacidades y revisa el importe o la fecha de aplicación antes de confirmar."
                                  : "Selecciona un producto, agrega las capacidades que necesita tu operación y consulta el precio antes de contratar."}
                        </p>
                    </div>

                    <div className="mt-12">
                        <CommercialConfigurator
                            purchaseType={
                                purchaseType
                            }
                            initialIndustry={
                                initialIndustry
                            }
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}