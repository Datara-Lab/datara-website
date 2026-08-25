import Stripe from "stripe";

const stripeFetch:
  typeof fetch = (
    input,
    init,
  ) => {
    const headers =
      new Headers(
        init?.headers,
      );

    /*
     * Cloudflare calcula Content-Length.
     * stripe-node puede incluirlo en su
     * adaptador Fetch y provocar un fallo
     * de conexión dentro del Worker.
     */
    headers.delete(
      "content-length",
    );

    return fetch(
      input,
      {
        ...init,
        headers,
      },
    );
  };

export function createStripeClient(
  secretKey: string,
): Stripe {
  return new Stripe(
    secretKey,
    {
      httpClient:
        Stripe
          .createFetchHttpClient(
            stripeFetch,
          ),

      maxNetworkRetries:
        2,

      timeout:
        30_000,
    },
  );
}
