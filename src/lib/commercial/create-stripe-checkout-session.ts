import type Stripe from "stripe";

function appendStripeValue(
    parameters: URLSearchParams,
    key: string,
    value: unknown,
): void {
    if (
        value === undefined ||
        value === null
    ) {
        return;
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        parameters.append(
            key,
            String(value),
        );

        return;
    }

    if (Array.isArray(value)) {
        value.forEach(
            (entry, index) => {
                appendStripeValue(
                    parameters,
                    `${key}[${index}]`,
                    entry,
                );
            },
        );

        return;
    }

    if (typeof value === "object") {
        Object.entries(value).forEach(
            ([childKey, childValue]) => {
                appendStripeValue(
                    parameters,
                    `${key}[${childKey}]`,
                    childValue,
                );
            },
        );
    }
}

export async function createStripeCheckoutSession({
    secretKey,
    payload,
}: {
    secretKey: string;
    payload:
        Stripe.Checkout.SessionCreateParams;
}): Promise<Stripe.Checkout.Session> {
    const parameters =
        new URLSearchParams();

    Object.entries(payload).forEach(
        ([key, value]) => {
            appendStripeValue(
                parameters,
                key,
                value,
            );
        },
    );

    const response =
        await fetch(
            "https://api.stripe.com/v1/checkout/sessions",
            {
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${secretKey}`,
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                body:
                    parameters.toString(),
            },
        );

    const result =
        (await response.json()) as
            | Stripe.Checkout.Session
            | {
                error?: {
                    message?: string;
                };
            };

    if (!response.ok) {
        const stripeError =
            "error" in result
                ? result.error
                : undefined;

        throw new Error(
            stripeError?.message ??
                "Stripe rechazó la creación de la sesión de pago.",
        );
    }

    return result as
        Stripe.Checkout.Session;
}
