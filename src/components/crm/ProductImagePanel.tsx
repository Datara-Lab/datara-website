"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import Button from "@/components/ui/Button";

type ProductImagePanelProps = {
  productId: string;
  productName: string;

  imageUrl?:
    | string
    | null;

  readOnly?: boolean;

  onUpdated?: (
    imageUrl:
      | string
      | null,
  ) => void;
};

type ImageResponse = {
  success: boolean;

  data?: {
    imageUrl?: string;
  };

  message?: string;
  error?: string;
};

export default function ProductImagePanel({
  productId,
  productName,
  imageUrl,
  readOnly = false,
  onUpdated,
}: ProductImagePanelProps) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    currentImageUrl,
    setCurrentImageUrl,
  ] = useState<
    string | null
  >(
    imageUrl ?? null,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function uploadImage(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    try {
      setIsSubmitting(true);
      setError(null);

      const response =
        await fetch(
          `/api/crm/products/${productId}/image`,
          {
            method: "POST",
            body: formData,
          },
        );

      const result =
        (await response.json()) as
          ImageResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible cargar la imagen.",
        );
      }

      const nextImageUrl =
        `${
          result.data
            ?.imageUrl ??
          `/api/crm/products/${productId}/image`
        }?v=${Date.now()}`;

      setCurrentImageUrl(
        nextImageUrl,
      );

      onUpdated?.(
        nextImageUrl,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "No fue posible cargar la imagen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeImage() {
    const confirmed =
      window.confirm(
        "¿Eliminar la imagen de este producto?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response =
        await fetch(
          `/api/crm/products/${productId}/image`,
          {
            method: "DELETE",
          },
        );

      const result =
        (await response.json()) as
          ImageResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible eliminar la imagen.",
        );
      }

      setCurrentImageUrl(
        null,
      );

      onUpdated?.(
        null,
      );
    } catch (removeError) {
      setError(
        removeError instanceof
          Error
          ? removeError.message
          : "No fue posible eliminar la imagen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <h3 className="font-bold text-slate-950">
          Imagen comercial
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Se utilizará en cotizaciones, inventario y documentos comerciales.
        </p>
      </header>

      <div className="p-5 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {currentImageUrl ? (
            <img
              src={
                currentImageUrl
              }
              alt={
                productName
              }
              className="h-64 w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-3xl">
                ◇
              </div>

              <p className="mt-4 font-semibold text-slate-700">
                Producto sin imagen
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Agrega una fotografía JPG, PNG o WEBP.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={
                uploadImage
              }
            />

            <Button
              type="button"
              disabled={
                isSubmitting
              }
              onClick={() =>
                inputRef.current
                  ?.click()
              }
            >
              {isSubmitting
                ? "Procesando..."
                : currentImageUrl
                  ? "Reemplazar imagen"
                  : "Cargar imagen"}
            </Button>

            {currentImageUrl && (
              <Button
                type="button"
                variant="danger"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  void removeImage()
                }
              >
                Eliminar imagen
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
