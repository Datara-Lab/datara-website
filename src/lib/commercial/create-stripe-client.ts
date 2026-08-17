import Stripe from "stripe";

export function createStripeClient(
    secretKey: string,
): Stripe {
    return new Stripe(
        secretKey,
        {
            httpClient:
                Stripe
                    .createFetchHttpClient(),

            maxNetworkRetries:
                2,

            timeout:
                30_000,
        },
    );
}