"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type RegionRecord = {
  id: string;
  name: string;
  code: string;
  description:
    | string
    | null;
  active: boolean;
};

type BranchAddress = {
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  reference?: string;
};

type BranchRecord = {
  id: string;

  regionId:
    | string
    | null;

  regionName:
    | string
    | null;

  name: string;
  code: string;

  folioPrefix:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  timezone:
    | string
    | null;

  address:
    BranchAddress;

  active: boolean;
};

type StructureResponse = {
  success: boolean;
  error?: string;
  message?: string;

  data?: {
    regions:
      RegionRecord[];
    branches:
      BranchRecord[];

    branchUsage: {
      used: number;
      limit: number;
      available: number | null;
      atLimit: boolean;
    };
  };
};

type PostalPlace = {
  city: string;
  state: string;
  stateCode: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

type PostalLookupResponse = {
  success: boolean;
  error?: string;

  data?: {
    postalCode: string;
    country: string;
    countryCode: string;
    places: PostalPlace[];
  };
};

type BranchForm = {
  name: string;
  code: string;
  regionId: string;
  folioPrefix: string;
  phone: string;
  email: string;
  timezone: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  neighborhood: string;
  reference: string;
  active: boolean;
};

const emptyBranchForm:
  BranchForm = {
    name: "",
    code: "",
    regionId: "",
    folioPrefix: "",
    phone: "",
    email: "",
    timezone:
      "America/Mexico_City",
    country: "MX",
    state: "",
    city: "",
    postalCode: "",
    street: "",
    exteriorNumber: "",
    interiorNumber: "",
    neighborhood: "",
    reference: "",
    active: true,
  };

export default function StructurePage() {
  const [
    data,
    setData,
  ] = useState<
    StructureResponse["data"]
  >();

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    isEditorOpen,
    setIsEditorOpen,
  ] = useState(false);

  const [
    editingRegion,
    setEditingRegion,
  ] = useState<
    RegionRecord | null
  >(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    active,
    setActive,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

    const [
    isBranchEditorOpen,
    setIsBranchEditorOpen,
  ] = useState(false);

  const [
    editingBranch,
    setEditingBranch,
  ] = useState<
    BranchRecord | null
  >(null);

  const [
    branchForm,
    setBranchForm,
  ] = useState<
    BranchForm
  >({
    ...emptyBranchForm,
  });

  const [
    postalPlaces,
    setPostalPlaces,
  ] = useState<
    PostalPlace[]
  >([]);

  const [
    isPostalLookupLoading,
    setIsPostalLookupLoading,
  ] = useState(false);

  const [
    postalLookupError,
    setPostalLookupError,
  ] = useState<
    string | null
  >(null);

    const [
        deletingId,
        setDeletingId,
    ] = useState<
        string | null
    >(null);

  const loadStructure =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/administracion/estructura",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              StructureResponse;

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.error ??
                "No fue posible cargar la estructura organizacional.",
            );
          }

          setData(
            result.data,
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No fue posible cargar la estructura organizacional.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStructure();
  }, [loadStructure]);

  function openCreateRegion() {
    setEditingRegion(null);
    setName("");
    setCode("");
    setDescription("");
    setActive(true);
    setError(null);
    setMessage(null);
    setIsEditorOpen(true);
  }

  function openEditRegion(
    region: RegionRecord,
  ) {
    setEditingRegion(
      region,
    );
    setName(region.name);
    setCode(region.code);
    setDescription(
      region.description ?? "",
    );
    setActive(
      region.active,
    );
    setError(null);
    setMessage(null);
    setIsEditorOpen(true);
  }

  async function saveRegion() {
    if (
      !name.trim() ||
      !code.trim()
    ) {
      setError(
        "El nombre y el código son obligatorios.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/administracion/estructura",
          {
            method:
              editingRegion
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  editingRegion
                    ?.id,

                type:
                  "region",

                name:
                  name.trim(),

                code:
                  code.trim(),

                description:
                  description
                    .trim(),

                active,
              }),
          },
        );

      const result =
        (await response.json()) as
          StructureResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar la región.",
        );
      }

      setMessage(
        result.message ??
          "La región fue guardada correctamente.",
      );

      setIsEditorOpen(
        false,
      );

      setEditingRegion(
        null,
      );

      await loadStructure();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "No fue posible guardar la región.",
      );
        } finally {
            setIsSaving(false);
            }
        }

        function updateBranchField<
            K extends keyof BranchForm,
        >(
            key: K,
            value: BranchForm[K],
        ) {
            setBranchForm(
            (current) => ({
                ...current,
                [key]: value,
            }),
            );
        }

        async function lookupPostalCode() {
          const country =
            branchForm.country
              .trim()
              .toUpperCase();

          const postalCode =
            branchForm.postalCode
              .trim();

          if (!country) {
            setPostalLookupError(
              "Selecciona el país.",
            );
            return;
          }

          if (!postalCode) {
            setPostalLookupError(
              "Escribe el código postal.",
            );
            return;
          }

          setIsPostalLookupLoading(
            true,
          );

          setPostalLookupError(
            null,
          );

          setPostalPlaces([]);

          try {
            const response =
              await fetch(
                `/api/location/postal-code?country=${encodeURIComponent(
                  country,
                )}&postalCode=${encodeURIComponent(
                  postalCode,
                )}`,
                {
                  cache:
                    "no-store",
                },
              );

            const result =
              (await response.json()) as
                PostalLookupResponse;

            if (
              !response.ok ||
              !result.success ||
              !result.data
            ) {
              throw new Error(
                result.error ??
                  "No fue posible consultar el código postal.",
              );
            }

            const places =
              result.data.places;

            const firstPlace =
              places[0];

            setPostalPlaces(
              places,
            );

            setBranchForm(
              (current) => ({
                ...current,

                country:
                  result.data
                    ?.countryCode ??
                  current.country,

                postalCode:
                  result.data
                    ?.postalCode ??
                  current.postalCode,

                state:
                  firstPlace
                    ?.state ??
                  current.state,

                city:
                  firstPlace
                    ?.city ??
                  current.city,

                timezone:
                  firstPlace
                    ?.timezone ||
                  current.timezone,
              }),
            );
          } catch (
            lookupError
          ) {
            setPostalLookupError(
              lookupError instanceof
                Error
                ? lookupError.message
                : "No fue posible consultar el código postal.",
            );
          } finally {
            setIsPostalLookupLoading(
              false,
            );
          }
        }

        function openCreateBranch() {
            if (data?.branchUsage.atLimit) {
            setError(
                "Tu plan alcanzó el límite de sucursales. Contrata una expansión para registrar otra.",
            );
            return;
            }
            setEditingBranch(null);

            setBranchForm({
            ...emptyBranchForm,

            regionId:
                data?.regions[0]
                ?.id ?? "",
            });

            setError(null);
            setMessage(null);

            setIsBranchEditorOpen(
            true,
            );
        }

        function openEditBranch(
            branch: BranchRecord,
        ) {
            setEditingBranch(
            branch,
            );

            setBranchForm({
            name: branch.name,
            code: branch.code,

            regionId:
                branch.regionId ?? "",

            folioPrefix:
                branch.folioPrefix ?? "",

            phone:
                branch.phone ?? "",

            email:
                branch.email ?? "",

            timezone:
                branch.timezone ??
                "America/Mexico_City",

            country:
                branch.address
                .country ?? "MX",

            state:
                branch.address
                .state ?? "",

            city:
                branch.address
                .city ?? "",

            postalCode:
                branch.address
                .postalCode ?? "",

            street:
                branch.address
                .street ?? "",

            exteriorNumber:
                branch.address
                .exteriorNumber ?? "",

            interiorNumber:
                branch.address
                .interiorNumber ?? "",

            neighborhood:
                branch.address
                .neighborhood ?? "",

            reference:
                branch.address
                .reference ?? "",

            active:
                branch.active,
            });

            setError(null);
            setMessage(null);

            setIsBranchEditorOpen(
            true,
            );
        }

        async function saveBranch() {
            if (
            !branchForm.name.trim() ||
            !branchForm.code.trim()
            ) {
            setError(
                "El nombre y el código de la sucursal son obligatorios.",
            );
            return;
            }

            setIsSaving(true);
            setError(null);
            setMessage(null);

            try {
            const response =
                await fetch(
                "/api/administracion/estructura",
                {
                    method:
                    editingBranch
                        ? "PATCH"
                        : "POST",

                    headers: {
                    "Content-Type":
                        "application/json",
                    },

                    body:
                    JSON.stringify({
                        id:
                        editingBranch
                            ?.id,

                        type:
                        "branch",

                        name:
                        branchForm
                            .name
                            .trim(),

                        code:
                        branchForm
                            .code
                            .trim(),

                        regionId:
                        branchForm
                            .regionId ||
                        null,

                        folioPrefix:
                        branchForm
                            .folioPrefix
                            .trim(),

                        phone:
                        branchForm
                            .phone
                            .trim(),

                        email:
                        branchForm
                            .email
                            .trim(),

                        timezone:
                        branchForm
                            .timezone
                            .trim(),

                        active:
                        branchForm
                            .active,

                        address: {
                        country:
                            branchForm
                            .country
                            .trim(),

                        state:
                            branchForm
                            .state
                            .trim(),

                        city:
                            branchForm
                            .city
                            .trim(),

                        postalCode:
                            branchForm
                            .postalCode
                            .trim(),

                        street:
                            branchForm
                            .street
                            .trim(),

                        exteriorNumber:
                            branchForm
                            .exteriorNumber
                            .trim(),

                        interiorNumber:
                            branchForm
                            .interiorNumber
                            .trim(),

                        neighborhood:
                            branchForm
                            .neighborhood
                            .trim(),

                        reference:
                            branchForm
                            .reference
                            .trim(),
                        },
                    }),
                },
                );

            const result =
                (await response.json()) as
                StructureResponse;

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                result.error ??
                    "No fue posible guardar la sucursal.",
                );
            }

            setMessage(
                result.message ??
                "La sucursal fue guardada correctamente.",
            );

            setIsBranchEditorOpen(
                false,
            );

            setEditingBranch(
                null,
            );

            await loadStructure();
            } catch (
            saveError
            ) {
            setError(
                saveError instanceof
                Error
                ? saveError.message
                : "No fue posible guardar la sucursal.",
            );
                } finally {
                    setIsSaving(false);
                    }
                }

                async function deleteStructureRecord(
                    type:
                    | "region"
                    | "branch",
                    id: string,
                    recordName: string,
                ) {
                    const label =
                    type === "region"
                        ? "región"
                        : "sucursal";

                    const confirmed =
                    window.confirm(
                        `¿Eliminar la ${label} "${recordName}"? Esta acción no se puede deshacer.`,
                    );

                    if (!confirmed) {
                    return;
                    }

                    setDeletingId(id);
                    setError(null);
                    setMessage(null);

                    try {
                    const response =
                        await fetch(
                        "/api/administracion/estructura",
                        {
                            method:
                            "DELETE",

                            headers: {
                            "Content-Type":
                                "application/json",
                            },

                            body:
                            JSON.stringify({
                                type,
                                id,
                            }),
                        },
                        );

                    const result =
                        (await response.json()) as
                        StructureResponse;

                    if (
                        !response.ok ||
                        !result.success
                    ) {
                        throw new Error(
                        result.error ??
                            `No fue posible eliminar la ${label}.`,
                        );
                    }

                    setMessage(
                        result.message ??
                        `La ${label} fue eliminada correctamente.`,
                    );

                    await loadStructure();
                    } catch (
                    deleteError
                    ) {
                    setError(
                        deleteError instanceof
                        Error
                        ? deleteError.message
                        : `No fue posible eliminar la ${label}.`,
                    );
                    } finally {
                    setDeletingId(null);
                    }
                }

                return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/administracion"
          className="text-sm font-bold text-blue-700 hover:text-blue-800"
        >
          ← Administración
        </Link>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Datara Workspace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Regiones y sucursales
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Organiza la operación territorial de la empresa y controla el alcance de cada usuario.
            </p>
          </div>

          <Button
            onClick={
              openCreateRegion
            }
          >
            Nueva región
          </Button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error &&
          !isEditorOpen && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

        {isLoading && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Cargando estructura...
          </div>
        )}

        {!isLoading &&
          data && (
            <>
              <section className="mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Regiones
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Agrupa sucursales por zona geográfica o comercial.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                    {
                      data.regions
                        .length
                    }{" "}
                    región
                    {data.regions
                      .length ===
                    1
                      ? ""
                      : "es"}
                  </span>
                </div>

                {data.regions
                  .length ===
                0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="font-bold text-slate-950">
                      No hay regiones registradas
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Crea la primera región para comenzar a organizar las sucursales.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    {data.regions.map(
                      (
                        region,
                      ) => {
                        const branchCount =
                          data.branches.filter(
                            (
                              branch,
                            ) =>
                              branch.regionId ===
                              region.id,
                          ).length;

                        return (
                          <article
                            key={
                              region.id
                            }
                            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-black text-slate-950">
                                    {
                                      region.name
                                    }
                                  </h3>

                                  <span
                                    className={[
                                      "rounded-full px-3 py-1 text-xs font-bold",
                                      region.active
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-600",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {region.active
                                      ? "Activa"
                                      : "Inactiva"}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm font-bold text-blue-700">
                                  Código:{" "}
                                  {
                                    region.code
                                  }
                                </p>
                              </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    openEditRegion(
                                      region,
                                    )
                                  }
                                >
                                  Editar
                                </Button>

                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={
                                    deletingId ===
                                    region.id
                                  }
                                  onClick={() =>
                                    void deleteStructureRecord(
                                      "region",
                                      region.id,
                                      region.name,
                                    )
                                  }
                                >
                                  {deletingId ===
                                  region.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </Button>
                              </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-500">
                              {region.description ??
                                "Sin descripción."}
                            </p>

                            <p className="mt-5 border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                              {
                                branchCount
                              }{" "}
                              sucursal
                              {branchCount ===
                              1
                                ? ""
                                : "es"}
                            </p>
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </section>

              <section className="mt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Sucursales
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Datos operativos, contacto, ubicación y prefijo de folios.
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                      <p className="font-black text-blue-950">
                        {data.branchUsage.limit > 0
                          ? <>
                              {data.branchUsage.used} de {data.branchUsage.limit} sucursales utilizadas
                            </>
                          : <>
                              {data.branchUsage.used} sucursales registradas
                            </>}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        {data.branchUsage.available !== null
                          ? <>
                              {data.branchUsage.available} disponibles
                            </>
                          : "Sin límite configurado"}
                      </p>
                    </div>

                    <Button
                      disabled={
                        data.branchUsage.atLimit
                      }
                      onClick={
                        openCreateBranch
                      }
                    >
                      {data.branchUsage.atLimit
                        ? "Límite alcanzado"
                        : "Nueva sucursal"}
                    </Button>
                  </div>
                </div>

                {data.branches
                  .length ===
                0 ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="font-bold text-slate-950">
                      No hay sucursales registradas
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Registra la primera sucursal de la empresa.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    {data.branches.map(
                      (
                        branch,
                      ) => (
                        <article
                          key={
                            branch.id
                          }
                          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-950">
                                  {
                                    branch.name
                                  }
                                </h3>

                                <span
                                  className={[
                                    "rounded-full px-3 py-1 text-xs font-bold",
                                    branch.active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {branch.active
                                    ? "Activa"
                                    : "Inactiva"}
                                </span>
                              </div>

                              <p className="mt-2 text-sm font-bold text-blue-700">
                                {
                                  branch.code
                                }
                                {branch.folioPrefix
                                  ? ` · Folio ${branch.folioPrefix}`
                                  : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  openEditBranch(
                                    branch,
                                  )
                                }
                              >
                                Editar
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                disabled={
                                  deletingId ===
                                  branch.id
                                }
                                onClick={() =>
                                  void deleteStructureRecord(
                                    "branch",
                                    branch.id,
                                    branch.name,
                                  )
                                }
                              >
                                {deletingId ===
                                branch.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                                </Button>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Región
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {branch.regionName ??
                                  "Sin región"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Ubicación
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {[
                                  branch
                                    .address
                                    .city,

                                  branch
                                    .address
                                    .state,
                                ]
                                  .filter(
                                    Boolean,
                                  )
                                  .join(
                                    ", ",
                                  ) ||
                                  "Sin ubicación"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Teléfono
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {branch.phone ??
                                  "Sin teléfono"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                Correo
                              </p>

                              <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                                {branch.email ??
                                  "Sin correo"}
                              </p>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>
            </>
          )}
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/45">
          <aside className="flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    {editingRegion
                      ? "Editar región"
                      : "Nueva región"}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Información regional
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsEditorOpen(
                      false,
                    )
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-2xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Nombre
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ej. Región Centro"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Código
                </label>

                <input
                  type="text"
                  value={code}
                  onChange={(
                    event,
                  ) =>
                    setCode(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ej. CENTRO"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Descripción
                </label>

                <textarea
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  rows={4}
                  placeholder="Estados, ciudades o alcance comercial de la región."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(
                    event,
                  ) =>
                    setActive(
                      event.target
                        .checked,
                    )
                  }
                  className="h-5 w-5 rounded border-slate-300 text-blue-600"
                />

                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Región activa
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Las regiones inactivas no estarán disponibles para nuevas asignaciones.
                  </span>
                </span>
              </label>
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsEditorOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    void saveRegion()
                  }
                >
                  {isSaving
                    ? "Guardando..."
                    : "Guardar región"}
                </Button>
              </div>
            </footer>
          </aside>
        </div>
            )}

      {isBranchEditorOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/45">
          <aside className="flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    {editingBranch
                      ? "Editar sucursal"
                      : "Nueva sucursal"}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Información de la sucursal
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsBranchEditorOpen(
                      false,
                    )
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-2xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  Información general
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Nombre
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "name",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ej. CFMOTO Izcalli"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Código
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.code
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "code",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ej. IZCALLI"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Región
                    </label>

                    <select
                      value={
                        branchForm.regionId
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "regionId",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    >
                      <option value="">
                        Sin región
                      </option>

                      {data?.regions
                        .filter(
                          (
                            region,
                          ) =>
                            region.active ||
                            region.id ===
                              branchForm.regionId,
                        )
                        .map(
                          (
                            region,
                          ) => (
                            <option
                              key={
                                region.id
                              }
                              value={
                                region.id
                              }
                            >
                              {
                                region.name
                              }
                            </option>
                          ),
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Prefijo de folios
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.folioPrefix
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "folioPrefix",
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ej. IZC"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  Contacto y zona horaria
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Teléfono
                    </label>

                    <input
                      type="tel"
                      value={
                        branchForm.phone
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "phone",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Correo
                    </label>

                    <input
                      type="email"
                      value={
                        branchForm.email
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "email",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Zona horaria
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.timezone
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "timezone",
                          event.target
                            .value,
                        )
                      }
                      placeholder="America/Mexico_City"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  Dirección
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Calle
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.street
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "street",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Número exterior
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.exteriorNumber
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "exteriorNumber",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Número interior
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.interiorNumber
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "interiorNumber",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Colonia
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.neighborhood
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "neighborhood",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Ciudad
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.city
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "city",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Estado
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.state
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "state",
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>

                <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Código postal
                    </label>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={
                          branchForm.postalCode
                        }
                        onChange={(
                          event,
                        ) => {
                          updateBranchField(
                            "postalCode",
                            event.target
                              .value,
                          );

                          setPostalPlaces(
                            [],
                          );

                          setPostalLookupError(
                            null,
                          );
                        }}
                        placeholder="Ej. 54700"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm"
                      />

                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          isPostalLookupLoading
                        }
                        onClick={() =>
                          void lookupPostalCode()
                        }
                      >
                        {isPostalLookupLoading
                          ? "Consultando..."
                          : "Buscar ubicación"}
                      </Button>
                    </div>

                    {postalLookupError && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        {
                          postalLookupError
                        }
                      </p>
                    )}

                    {postalPlaces.length >
                      1 && (
                      <div className="mt-4">
                        <label className="text-sm font-bold text-slate-700">
                          Ciudad o localidad
                        </label>

                        <select
                          value={
                            branchForm.city
                          }
                          onChange={(
                            event,
                          ) => {
                            const place =
                              postalPlaces.find(
                                (
                                  option,
                                ) =>
                                  option.city ===
                                  event.target
                                    .value,
                              );

                            if (!place) {
                              return;
                            }

                            setBranchForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                city:
                                  place.city,
                                state:
                                  place.state,

                                timezone:
                                  place.timezone ||
                                  current.timezone,
                              }),
                            );
                          }}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        >
                          {postalPlaces.map(
                            (
                              place,
                              index,
                            ) => (
                              <option
                                key={`${place.city}-${place.state}-${index}`}
                                value={
                                  place.city
                                }
                              >
                                {
                                  place.city
                                }
                                {place.state
                                  ? `, ${place.state}`
                                  : ""}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      País
                    </label>

                    <input
                      type="text"
                      value={
                        branchForm.country
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "country",
                          event.target
                            .value,
                        )
                      }
                      placeholder="MX"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">
                      Referencias
                    </label>

                    <textarea
                      value={
                        branchForm.reference
                      }
                      onChange={(
                        event,
                      ) =>
                        updateBranchField(
                          "reference",
                          event.target
                            .value,
                        )
                      }
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={
                    branchForm.active
                  }
                  onChange={(
                    event,
                  ) =>
                    updateBranchField(
                      "active",
                      event.target
                        .checked,
                    )
                  }
                  className="h-5 w-5 rounded border-slate-300 text-blue-600"
                />

                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Sucursal activa
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Estará disponible para usuarios y nuevas operaciones.
                  </span>
                </span>
              </label>
            </div>

            <footer className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsBranchEditorOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    void saveBranch()
                  }
                >
                  {isSaving
                    ? "Guardando..."
                    : "Guardar sucursal"}
                </Button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}