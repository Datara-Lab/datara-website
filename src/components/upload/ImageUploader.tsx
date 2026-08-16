"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";

type ImageUploaderProps = {
    title: string;
    description?: string;
    recommendedSize?: string;
    maxSizeMB?: number;
    value?: string | null;
    onChange?: (file: File | null) => void;
};

export default function ImageUploader({
    title,
    description,
    recommendedSize = "512 × 512 px",
    maxSizeMB = 2,
    value = null,
    onChange,
}: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(value);

    useEffect(() => {
        setPreview(value);
    }, [value]);

    function handleChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            alert("Selecciona una imagen PNG, JPG o WEBP.");
            return;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`La imagen no puede superar ${maxSizeMB} MB.`);
            return;
        }

        const url = URL.createObjectURL(file);

        setPreview((old) => {
            if (old?.startsWith("blob:")) {
                URL.revokeObjectURL(old);
            }
            return url;
        });

        onChange?.(file);
    }

    function removeImage() {
        if (preview?.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
        }

        setPreview(null);
        onChange?.(null);
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-black text-slate-900">
                    {title}
                </h2>

                {description && (
                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                )}
            </div>

            <div className="grid gap-8 p-6 md:grid-cols-[240px_1fr]">
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                    {preview ? (
                        <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <Image
                                src={preview}
                                alt="Vista previa"
                                width={140}
                                height={140}
                                unoptimized
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="font-bold text-slate-700">
                                Sin imagen
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                PNG · JPG · WEBP
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm font-semibold text-slate-700">
                        Tamaño recomendado
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {recommendedSize}
                    </p>

                    <p className="mt-5 text-sm font-semibold text-slate-700">
                        Tamaño máximo
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {maxSizeMB} MB
                    </p>

                    <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                        Seleccionar imagen

                        <input
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleChange}
                        />
                    </label>

                    {preview && (
                        <button
                            type="button"
                            onClick={removeImage}
                            className="ml-3 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Eliminar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}