import "server-only";

type ZohoTokenResponse = {
  access_token?: string;
  api_domain?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

type ZohoApiError = {
  code?: string;
  message?: string;
  status?: string;
  details?: Record<string, unknown>;
};

type ZohoErrorResponse = {
  data?: ZohoApiError[];
  code?: string;
  message?: string;
  status?: string;
};

type CachedAccessToken = {
  value: string;
  expiresAt: number;
  apiDomain: string;
};

type ZohoRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<
    string,
    string | number | boolean | undefined
  >;
};

let cachedAccessToken: CachedAccessToken | null = null;

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Agrégala en .env.local.`,
    );
  }

  return value;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isZohoApiError(
  value: unknown,
): value is ZohoApiError {
  return isRecord(value);
}

function isZohoErrorResponse(
  value: unknown,
): value is ZohoErrorResponse {
  return isRecord(value);
}

function getZohoErrorMessage(
  payload: unknown,
): string {
  if (!isZohoErrorResponse(payload)) {
    return "Zoho devolvió un error inesperado.";
  }

  const firstError = Array.isArray(payload.data)
    ? payload.data[0]
    : undefined;

  if (isZohoApiError(firstError)) {
    if (
      typeof firstError.message === "string" &&
      firstError.message
    ) {
      return firstError.message;
    }

    if (
      typeof firstError.code === "string" &&
      firstError.code
    ) {
      return firstError.code;
    }
  }

  if (
    typeof payload.message === "string" &&
    payload.message
  ) {
    return payload.message;
  }

  if (
    typeof payload.code === "string" &&
    payload.code
  ) {
    return payload.code;
  }

  return "Zoho devolvió un error inesperado.";
}

async function getZohoAccessToken(): Promise<{
  accessToken: string;
  apiDomain: string;
}> {
  const now = Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAt > now + 60_000
  ) {
    return {
      accessToken: cachedAccessToken.value,
      apiDomain: cachedAccessToken.apiDomain,
    };
  }

  const accountsUrl = requireEnvironmentVariable(
    "ZOHO_ACCOUNTS_URL",
  );

  const clientId = requireEnvironmentVariable(
    "ZOHO_CLIENT_ID",
  );

  const clientSecret = requireEnvironmentVariable(
    "ZOHO_CLIENT_SECRET",
  );

  const refreshToken = requireEnvironmentVariable(
    "ZOHO_REFRESH_TOKEN",
  );

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(
    `${accountsUrl}/oauth/v2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const payload =
    (await response.json()) as ZohoTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error ??
        "No fue posible obtener el access token de Zoho.",
    );
  }

  const apiDomain =
    payload.api_domain ??
    process.env.ZOHO_API_DOMAIN ??
    "https://www.zohoapis.com";

  const expiresInSeconds =
    payload.expires_in ?? 3600;

  cachedAccessToken = {
    value: payload.access_token,
    apiDomain,
    expiresAt:
      now + expiresInSeconds * 1000,
  };

  return {
    accessToken: payload.access_token,
    apiDomain,
  };
}

export async function zohoRequest<T>(
  path: string,
  options: ZohoRequestOptions = {},
): Promise<T> {
  const { accessToken, apiDomain } =
    await getZohoAccessToken();

  const normalizedPath = path.replace(/^\/+/, "");

  const url = new URL(
    `${apiDomain}/crm/v8/${normalizedPath}`,
  );

  Object.entries(options.query ?? {}).forEach(
    ([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    },
  );

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getZohoErrorMessage(payload));
  }

  return payload as T;
}