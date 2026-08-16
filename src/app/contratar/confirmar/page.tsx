import {
    eq,
} from "drizzle-orm";

import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import {
    getCRMIndustryTemplates,
} from "@/config/crm/industries";

import {
    DATARA_PRODUCTS,
    getDataraProduct,
    isDataraProductKey,
} from "@/config/datara-products";

import {
    db,
} from "@/db";

import {
    commercialPurchases,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

type ConfirmationPageProps = {
    searchParams:
        Promise<{
            session_id?:
                string;
        }>;
};

export default async function ConfirmationPage({
    searchParams,
}: ConfirmationPageProps) {
    const {
        session_id:
            checkoutSessionId,
    } = await searchParams;

    const hasValidSessionId =
        typeof checkoutSessionId ===
            "string" &&
        checkoutSessionId.startsWith(
            "cs_",
        );

    const [purchase] =
        hasValidSessionId
            ? await db
                  .select({
                      id:
                          commercialPurchases.id,

                      productKey:
                          commercialPurchases
                              .productKey,

                      industry:
                          commercialPurchases
                              .industry,

                      lineItems:
                          commercialPurchases
                              .lineItems,

                      purchaseType:
                          commercialPurchases
                              .purchaseType,

                      status:
                          commercialPurchases.status,

                      billingPeriod:
                          commercialPurchases
                              .billingPeriod,

                      totalAmount:
                          commercialPurchases
                              .totalAmount,

                      currency:
                          commercialPurchases
                              .currency,
                  })
                  .from(
                      commercialPurchases,
                  )
                  .where(
                      eq(
                          commercialPurchases
                              .stripeCheckoutSessionId,
                          checkoutSessionId,
                      ),
                  )
                  .limit(1)
            : [];

    const product =
        purchase &&
        isDataraProductKey(
            purchase.productKey,
        )
            ? getDataraProduct(
                  purchase.productKey,
              )
            : DATARA_PRODUCTS.crm;

    const industryName =
        purchase
            ? getCRMIndustryTemplates()
                  .find(
                      (template) =>
                          template.id ===
                          purchase.industry,
                  )
                  ?.name ??
              purchase.industry
            : "";

    const contractedItems =
        purchase
            ? purchase.lineItems
                  .map(
                      (lineItem) =>
                          lineItem.name,
                  )
                  .join(" + ")
            : product.name;

    const isTrialConversion =
        purchase?.purchaseType ===
        "trial_conversion";

    const trialConversionProvisioned =
        isTrialConversion &&
        purchase?.status ===
            "provisioned";

    const paymentConfirmed =
        purchase?.status ===
            "paid_pending_account" ||
        purchase?.status ===
            "account_linked" ||
        purchase?.status ===
            "organization_created" ||
        purchase?.status ===
            "provisioning" ||
        purchase?.status ===
            "provisioned";

    const completionPath =
        checkoutSessionId
            ? `/contratar/completar?session_id=${encodeURIComponent(
                  checkoutSessionId,
              )}`
            : "/contratar";

    const loginPath =
        `/login?redirect_url=${encodeURIComponent(
            completionPath,
        )}`;

    return (
        <>
            <Navbar />

            <main className="min-h-[calc(100vh-160px)] bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-5 py-16 sm:px-8">
                <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
                    <div
                        className="px-7 py-9 text-white sm:px-10"
                        style={{
                            background:
                                `linear-gradient(135deg, #020617 0%, ${product.accentColor} 180%)`,
                        }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-5">
                            <div className="rounded-2xl bg-white px-5 py-3 shadow-lg shadow-black/10">
                                <Image
                                    src={
                                        product.logoPath
                                    }
                                    alt={
                                        product.name
                                    }
                                    width={
                                        220
                                    }
                                    height={
                                        72
                                    }
                                    priority
                                    className="h-12 w-auto object-contain"
                                />
                            </div>

                            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
                                Suscripción
                            </span>
                        </div>

                        <h1 className="mt-8 text-3xl font-black tracking-tight sm:text-4xl">
                            {paymentConfirmed
                                ? "Pago confirmado"
                                : "Confirmando tu pago"}
                        </h1>

                        <p className="mt-4 max-w-xl leading-7 text-white/80">
                            {trialConversionProvisioned
                                ? `Tu demo fue convertido correctamente. ${product.name} ya tiene activos los módulos contratados.`
                                : isTrialConversion &&
                                    paymentConfirmed
                                  ? "El pago fue confirmado y estamos activando la suscripción de tu empresa."
                                  : paymentConfirmed
                                    ? `Tu contratación de ${product.name} fue recibida correctamente. Ahora vincula el pago con la cuenta que administrará la empresa.`
                                    : "Stripe está procesando la operación. Esta confirmación normalmente tarda solo unos segundos."}
                        </p>
                    </div>

                    <div className="p-7 sm:p-10">
                        {!hasValidSessionId && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold leading-6 text-red-700">
                                No encontramos una sesión de pago válida.
                            </div>
                        )}

                        {hasValidSessionId &&
                            !purchase && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-800">
                                    La sesión todavía no aparece en Datara. Espera unos segundos y actualiza esta página.
                                </div>
                            )}

                        {purchase && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex items-start justify-between gap-6">
                                    <span className="shrink-0 text-sm font-semibold text-slate-500">
                                        Contratación
                                    </span>

                                    <div className="text-right">
                                        <p className="text-sm font-black leading-6 text-slate-950">
                                            {contractedItems}
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Para {industryName}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                                    <span className="text-sm font-semibold text-slate-500">
                                        Periodicidad
                                    </span>

                                    <span className="text-sm font-bold text-slate-800">
                                        {purchase.billingPeriod ===
                                        "annual"
                                            ? "Anual"
                                            : "Mensual"}
                                    </span>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                                    <span className="text-sm font-semibold text-slate-500">
                                        Total contratado
                                    </span>

                                    <span className="text-xl font-black text-slate-950">
                                        {new Intl.NumberFormat(
                                            "es-MX",
                                            {
                                                style:
                                                    "currency",

                                                currency:
                                                    purchase.currency.toUpperCase(),
                                            },
                                        ).format(
                                            Number(
                                                purchase.totalAmount,
                                            ),
                                        )}{" "}
                                        <span className="text-sm font-bold text-slate-500">
                                            {purchase.currency.toUpperCase()}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {trialConversionProvisioned ? (
                            <>
                                <Link
                                    href="/crm"
                                    className="mt-7 flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-95"
                                    style={{
                                        backgroundColor:
                                            product.accentColor,
                                    }}
                                >
                                    Abrir {product.name}
                                </Link>

                                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                                    Tu empresa y la información registrada durante el demo fueron conservadas.
                                </p>
                            </>
                        ) : isTrialConversion &&
                          paymentConfirmed ? (
                            <>
                                <Link
                                    href={
                                        checkoutSessionId
                                            ? `/contratar/confirmar?session_id=${encodeURIComponent(
                                                  checkoutSessionId,
                                              )}`
                                            : "/contratar"
                                    }
                                    className="mt-7 flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-400"
                                >
                                    Actualizar activación
                                </Link>

                                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                                    La activación normalmente tarda solo unos segundos.
                                </p>
                            </>
                        ) : paymentConfirmed ? (
                            <>
                                <Link
                                    href={
                                        loginPath
                                    }
                                    className="mt-7 flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-95"
                                    style={{
                                        backgroundColor:
                                            product.accentColor,
                                    }}
                                >
                                    Continuar con {product.name}
                                </Link>

                                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                                    Inicia sesión o crea una cuenta con el mismo correo que utilizaste durante el pago.
                                </p>
                            </>
                        ) : (
                            <Link
                                href={
                                    checkoutSessionId
                                        ? `/contratar/confirmar?session_id=${encodeURIComponent(
                                              checkoutSessionId,
                                          )}`
                                        : "/contratar"
                                }
                                className="mt-7 flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-400"
                            >
                                Actualizar confirmación
                            </Link>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}