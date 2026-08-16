import { NextResponse } from "next/server";
import tzLookup from "tz-lookup";

import {
  AdministrationAuthError,
  requireAdminContext,
} from "@/lib/administration/require-admin-context";

export const dynamic = "force-dynamic";

type PostalPlace = {
  "place name"?: unknown;
  state?: unknown;
  "state abbreviation"?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type PostalProviderResponse = {
  "post code"?: unknown;
  country?: unknown;
  "country abbreviation"?: unknown;
  places?: unknown;
};

function getString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
    AdministrationAuthError
  ) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error(
    "No fue posible consultar el código postal:",
    error,
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "No fue posible consultar el código postal.",
    },
    {
      status: 500,
    },
  );
}

export async function GET(
  request: Request,
) {
  try {
    await requireAdminContext();

    const {
      searchParams,
    } = new URL(request.url);

    const country =
      searchParams
        .get("country")
        ?.trim()
        .toUpperCase() ?? "";

    const postalCode =
      searchParams
        .get("postalCode")
        ?.trim() ?? "";

    if (
      !/^[A-Z]{2}$/.test(
        country,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Selecciona un país válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      postalCode.length < 3 ||
      postalCode.length > 12
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Escribe un código postal válido.",
        },
        {
          status: 400,
        },
      );
    }

    const providerResponse =
      await fetch(
        `https://api.zippopotam.us/${encodeURIComponent(
          country,
        )}/${encodeURIComponent(
          postalCode,
        )}`,
        {
          headers: {
            Accept:
              "application/json",
          },
          cache: "no-store",
        },
      );

    if (
      providerResponse.status ===
      404
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No encontramos ese código postal en el país seleccionado.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !providerResponse.ok
    ) {
      throw new Error(
        `El proveedor postal respondió con estado ${providerResponse.status}.`,
      );
    }

    const providerData =
      (await providerResponse.json()) as
        PostalProviderResponse;

    const rawPlaces =
      Array.isArray(
        providerData.places,
      )
        ? providerData.places
        : [];

    const places = rawPlaces
      .map((rawPlace) => {
        const place =
          rawPlace as PostalPlace;

        const latitude =
          Number(
            getString(
              place.latitude,
            ),
          );

        const longitude =
          Number(
            getString(
              place.longitude,
            ),
          );

        const timezone =
          Number.isFinite(
            latitude,
          ) &&
          Number.isFinite(
            longitude,
          )
            ? tzLookup(
                latitude,
                longitude,
              )
            : "";

        return {
          city: getString(
            place["place name"],
          ),

          state: getString(
            place.state,
          ),

          stateCode:
            getString(
              place[
                "state abbreviation"
              ],
            ),

          latitude:
            Number.isFinite(
              latitude,
            )
              ? String(latitude)
              : "",

          longitude:
            Number.isFinite(
              longitude,
            )
              ? String(longitude)
              : "",

          timezone,
        };
      })
      .filter(
        (place) =>
          place.city ||
          place.state,
      );

    if (
      places.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El código postal no contiene información de ubicación.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      data: {
        postalCode:
          getString(
            providerData[
              "post code"
            ],
          ) || postalCode,

        country:
          getString(
            providerData.country,
          ),

        countryCode:
          getString(
            providerData[
              "country abbreviation"
            ],
          ) || country,

        places,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
    );
  }
}