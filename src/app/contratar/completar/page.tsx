import {
    auth,
    currentUser,
} from "@clerk/nextjs/server";

import {
    eq,
} from "drizzle-orm";

import {
    redirect,
} from "next/navigation";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import {
    getDataraProduct,
    isDataraProductKey,
} from "@/config/datara-products";

import PurchaseCompletionForm from "@/components/commercial/PurchaseCompletionForm";

import {
    db,
} from "@/db";

import {
    commercialPurchases,
} from "@/db/schema";

export const dynamic =
    "force-dynamic";

type CompletionPageProps = {
    searchParams:
    Promise<{
        session_id?:
        string;
    }>;
};

function ErrorCard({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <>
            <Navbar />

            <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-5 py-16 sm:px-8">
                <section className="mx-auto max-w-xl rounded-[32px] border border-red-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">
                        Contratación
                    </p>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                        {title}
                    </h1>

                    <p className="mt-4 leading-7 text-slate-600">
                        {message}
                    </p>
                </section>
            </main>

            <Footer />
        </>
    );
}

export default async function CompletionPage({
    searchParams,
}: CompletionPageProps) {
    const {
        session_id:
        checkoutSessionId,
    } = await searchParams;

    if (
        !checkoutSessionId ||
        !checkoutSessionId.startsWith(
            "cs_",
        )
    ) {
        return (
            <ErrorCard
                title="La compra no es válida"
                message="No encontramos una sesión de pago válida para completar el registro."
            />
        );
    }

    const completionPath =
        `/contratar/completar?session_id=${encodeURIComponent(
            checkoutSessionId,
        )}`;

    const {
        userId,
    } = await auth();

    if (!userId) {
        redirect(
            `/login?redirect_url=${encodeURIComponent(
                completionPath,
            )}`,
        );
    }

    const user =
        await currentUser();

    if (!user) {
        return (
            <ErrorCard
                title="No encontramos tu cuenta"
                message="No fue posible consultar la cuenta autenticada. Cierra la sesión e inténtalo nuevamente."
            />
        );
    }

    const [purchase] =
        await db
            .select({
                id:
                    commercialPurchases.id,

                productKey:
                    commercialPurchases
                        .productKey,

                status:
                    commercialPurchases.status,

                ownerEmail:
                    commercialPurchases
                        .ownerEmail,

                industry:
                    commercialPurchases
                        .industry,

                billingPeriod:
                    commercialPurchases
                        .billingPeriod,

                totalAmount:
                    commercialPurchases
                        .totalAmount,

                currency:
                    commercialPurchases
                        .currency,

                clerkUserId:
                    commercialPurchases
                        .clerkUserId,
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
            .limit(1);

    if (!purchase) {
        return (
            <ErrorCard
                title="No encontramos la compra"
                message="El pago todavía no está disponible en Datara. Espera unos segundos y vuelve a intentarlo."
            />
        );
    }

    if (
        !isDataraProductKey(
            purchase.productKey,
        )
    ) {
        return (
            <ErrorCard
                title="El producto no es válido"
                message="La contratación está asociada con un producto que no está disponible."
            />
        );
    }

    const product =
        getDataraProduct(
            purchase.productKey,
        );

    if (
        purchase.status ===
        "provisioned" &&
        purchase.clerkUserId ===
        userId
    ) {
        redirect(
            product.applicationPath,
        );
    }

    if (
        purchase.status !==
        "paid_pending_account" &&
        purchase.status !==
        "account_linked"
    ) {
        return (
            <ErrorCard
                title="La compra no puede completarse"
                message="Esta contratación no está pendiente de registro o ya fue procesada."
            />
        );
    }

    if (
        purchase.clerkUserId &&
        purchase.clerkUserId !==
        userId
    ) {
        return (
            <ErrorCard
                title="La compra pertenece a otra cuenta"
                message="Esta contratación ya fue vinculada con un usuario diferente."
            />
        );
    }

    const verifiedEmails =
        user.emailAddresses
            .filter(
                (emailAddress) =>
                    emailAddress
                        .verification
                        ?.status ===
                    "verified",
            )
            .map(
                (emailAddress) =>
                    emailAddress
                        .emailAddress
                        .trim()
                        .toLowerCase(),
            );

    const ownerEmail =
        purchase.ownerEmail
            ?.trim()
            .toLowerCase();

    if (
        !ownerEmail ||
        !verifiedEmails.includes(
            ownerEmail,
        )
    ) {
        return (
            <ErrorCard
                title="El correo no coincide"
                message="Inicia sesión o crea una cuenta con el mismo correo que utilizaste durante el pago."
            />
        );
    }

    return (
        <>
            <Navbar />

            <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-5 py-12 sm:px-8">
                <PurchaseCompletionForm
                    productKey={
                        purchase.productKey
                    }
                    checkoutSessionId={
                        checkoutSessionId
                    }
                    ownerEmail={
                        ownerEmail
                    }
                    industry={
                        purchase.industry
                    }
                    billingPeriod={
                        purchase.billingPeriod
                    }
                    totalAmount={
                        purchase.totalAmount
                    }
                    currency={
                        purchase.currency
                    }
                />
            </main>

            <Footer />
        </>
    );
}