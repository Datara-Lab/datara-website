"use client";

import {
  useEffect,
  useState,
} from "react";

import ImageUploader from "@/components/upload/ImageUploader";

import Button from "@/components/ui/Button";
import { SAT_TAX_REGIMES } from "@/lib/fiscal/catalogs";

type UploadResponse = {
  success: boolean;
  error?: string;
  data?: {
    objectKey: string;
    contentUrl: string;
  };
};

type CompanyProfile = {
  name: string;
  legalName: string;
  taxId: string;
  fiscalTaxRegime: string;
  fiscalPostalCode: string;
  tagline: string;
  country: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoUrl?: string | null;
};

type CompanyProfileResponse = {
  success: boolean;
  data?: CompanyProfile;
  message?: string;
  error?: string;
};

export default function AdministracionEmpresaPage() {
  const [
    profile,
    setProfile,
  ] = useState<CompanyProfile>({
    name: "",
    legalName: "",
    taxId: "",
    fiscalTaxRegime: "",
    fiscalPostalCode: "",
    tagline: "",
    country: "MX",
    timezone:
      "America/Mexico_City",
    phone: "",
    email: "",
    website: "",
    address: "",
    logoUrl: null,
  });

  const [
    isLoadingProfile,
    setIsLoadingProfile,
  ] = useState(true);

  const [
    isSavingProfile,
    setIsSavingProfile,
  ] = useState(false);

  const [companyLogo, setCompanyLogo] =
    useState<File | null>(null);

  const [savedLogoUrl, setSavedLogoUrl] =
    useState<string | null>(
      "/api/settings/company-logo/content",
    );

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        setIsLoadingProfile(true);

        const response = await fetch(
          "/api/settings/company-profile",
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as
            CompanyProfileResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "No fue posible cargar la información de la empresa.",
          );
        }

        if (!isActive) {
          return;
        }

        setProfile(result.data);

        setSavedLogoUrl(
          result.data.logoUrl
            ? `${result.data.logoUrl}?v=${Date.now()}`
            : null,
        );
      } catch (error) {
        if (isActive) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No fue posible cargar la información de la empresa.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  function updateProfileField<
    Key extends keyof CompanyProfile,
  >(
    key: Key,
    value: CompanyProfile[Key],
  ) {
    setProfile(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  async function handleSaveProfile() {
    try {
      setIsSavingProfile(true);
      setMessage(null);

      const response = await fetch(
        "/api/settings/company-profile",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            profile,
          ),
        },
      );

      const result =
        (await response.json()) as
          CompanyProfileResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar la información de la empresa.",
        );
      }

      setProfile(result.data);

      setMessage(
        result.message ??
          "La información de la empresa se guardó correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la información de la empresa.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveLogo() {
    if (!companyLogo) {
      setMessage(
        "Selecciona una imagen antes de guardar.",
      );
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", companyLogo);

      const response = await fetch(
        "/api/settings/company-logo",
        {
          method: "POST",
          body: formData,
        },
      );

      const result =
        (await response.json()) as UploadResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible guardar el logo.",
        );
      }

      setSavedLogoUrl(
        `${
          result.data?.contentUrl ??
          "/api/settings/company-logo/content"
        }?v=${Date.now()}`,
      );

      setCompanyLogo(null);
      setMessage(
        "El logo se guardó correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el logo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLogo() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company-logo",
        {
          method: "DELETE",
        },
      );

      const result =
        (await response.json()) as UploadResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ??
            "No fue posible eliminar el logo.",
        );
      }

      setCompanyLogo(null);
      setSavedLogoUrl(null);
      setMessage(
        "El logo se eliminó correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el logo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Configuración
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Empresa
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Administra la información general y la identidad visual de tu empresa.
            </p>
        </div>

        <div className="mt-8 grid gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              Branding Empresarial
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Personaliza la identidad visual de toda tu empresa.
              Estos cambios se reflejarán en Workspace y en los
              productos Datara contratados.
            </p>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">
              Información general
            </h3>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Nombre comercial
                </label>

                <input
                  type="text"
                  required
                  value={profile.name}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. Bajaj Izcalli"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "name",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Eslogan
                </label>

                <input
                  type="text"
                  value={profile.tagline}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. Tu siguiente moto te espera."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "tagline",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
            <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/40 p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Datos fiscales del emisor</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">Configuración para CFDI 4.0</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Estos datos se utilizarán al generar y timbrar facturas. Deben coincidir exactamente con la constancia de situación fiscal.</p>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-bold text-slate-700">Régimen fiscal</span>
                  <select
                    value={profile.fiscalTaxRegime}
                    disabled={isLoadingProfile || isSavingProfile}
                    onChange={(event) => updateProfileField("fiscalTaxRegime", event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="">Selecciona un régimen</option>
                    {SAT_TAX_REGIMES.map((regime) => <option key={regime.value} value={regime.value}>{regime.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Código postal fiscal</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    value={profile.fiscalPostalCode}
                    disabled={isLoadingProfile || isSavingProfile}
                    onChange={(event) => updateProfileField("fiscalPostalCode", event.target.value.replace(/\D/g, ""))}
                    placeholder="Ej. 64000"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>
              </div>
            </section>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Razón social
                </label>

                <input
                  type="text"
                  value={profile.legalName}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Nombre legal de la empresa"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "legalName",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  RFC o identificación fiscal
                </label>

                <input
                  type="text"
                  value={profile.taxId}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. ABC123456XYZ"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "taxId",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Teléfono
                </label>

                <input
                  type="tel"
                  value={profile.phone}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. +52 55 1234 5678"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "phone",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  value={profile.email}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. ventas@empresa.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "email",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Sitio web
                </label>

                <input
                  type="url"
                  value={profile.website}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="https://www.empresa.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "website",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  País
                </label>

                <input
                  type="text"
                  value={profile.country}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. MX"
                  maxLength={2}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "country",
                      event.target.value
                        .toUpperCase(),
                    )
                  }
                />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Zona horaria
                </label>

                <input
                  type="text"
                  required
                  value={profile.timezone}
                  disabled={
                    isLoadingProfile ||
                    isSavingProfile
                  }
                  placeholder="Ej. America/Mexico_City"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  onChange={(event) =>
                    updateProfileField(
                      "timezone",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm font-bold text-slate-700">
                Dirección
              </label>

              <textarea
                rows={3}
                value={profile.address}
                disabled={
                  isLoadingProfile ||
                  isSavingProfile
                }
                placeholder="Calle, número, colonia, ciudad, estado y código postal"
                className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                onChange={(event) =>
                  updateProfileField(
                    "address",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {message ? (
                  <p className="text-sm font-semibold text-blue-700">
                    {message}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Los cambios se compartirán con todos los productos Datara.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
              <Button
                type="button"
                disabled={
                  isLoadingProfile ||
                  isSavingProfile ||
                  !profile.name.trim() ||
                  !profile.timezone.trim()
                }
                onClick={() =>
                  void handleSaveProfile()
                }
              >
                {isSavingProfile
                  ? "Guardando..."
                  : "Guardar cambios"}
              </Button>
              </div>
            </div>
          </section>
          <ImageUploader
            title="Logo de la empresa"
            description="Este logo aparecerá en Datara Workspace y en los productos contratados."
            recommendedSize="512 × 512 px"
            maxSizeMB={2}
            value={savedLogoUrl}
            onChange={setCompanyLogo}
          />
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Guardar identidad
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {companyLogo
                  ? `Imagen lista: ${companyLogo.name}`
                  : "Selecciona una nueva imagen para reemplazar el logo actual."}
              </p>

              {message ? (
                <p className="mt-3 text-sm font-semibold text-blue-700">
                  {message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDeleteLogo}
                disabled={isSaving}
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Eliminar logo
              </button>

              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={!companyLogo || isSaving}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Guardando..."
                  : "Guardar logo"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
