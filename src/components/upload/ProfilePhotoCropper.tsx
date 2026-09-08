"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Cropper, {
    Area,
    Point,
} from "react-easy-crop";

import Button from "@/components/ui/Button";

type ProfilePhotoCropperProps = {
    file: File | null;
    open: boolean;
    onCancel: () => void;
    onConfirm: (
        file: File,
    ) => void;
};

const outputSize =
    1200;

const outputQuality =
    0.9;

function createImage(
    source: string,
) {
    return new Promise<HTMLImageElement>(
        (
            resolve,
            reject,
        ) => {
            const image =
                new Image();

            image.onload =
                () => {
                    resolve(
                        image,
                    );
                };

            image.onerror =
                reject;

            image.src =
                source;
        },
    );
}

async function createCroppedImage(
    imageUrl: string,
    cropArea: Area,
) {
    const image =
        await createImage(
            imageUrl,
        );

    const canvas =
        document.createElement(
            "canvas",
        );

    canvas.width =
        outputSize;

    canvas.height =
        outputSize;

    const context =
        canvas.getContext(
            "2d",
        );

    if (!context) {
        throw new Error(
            "No fue posible preparar la imagen.",
        );
    }

    context.imageSmoothingEnabled =
        true;

    context.imageSmoothingQuality =
        "high";

    context.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        outputSize,
        outputSize,
    );

    const blob =
        await new Promise<Blob>(
            (
                resolve,
                reject,
            ) => {
                canvas.toBlob(
                    (
                        value,
                    ) => {
                        if (!value) {
                            reject(
                                new Error(
                                    "No fue posible generar la foto.",
                                ),
                            );

                            return;
                        }

                        resolve(
                            value,
                        );
                    },
                    "image/webp",
                    outputQuality,
                );
            },
        );

    return new File(
        [
            blob,
        ],
        `perfil-${Date.now()}.webp`,
        {
            type:
                "image/webp",

            lastModified:
                Date.now(),
        },
    );
}

export default function ProfilePhotoCropper({
    file,
    open,
    onCancel,
    onConfirm,
}: ProfilePhotoCropperProps) {
    const [
        crop,
        setCrop,
    ] =
        useState<Point>({
            x: 0,
            y: 0,
        });

    const [
        zoom,
        setZoom,
    ] =
        useState(1);

    const [
        croppedAreaPixels,
        setCroppedAreaPixels,
    ] =
        useState<Area | null>(
            null,
        );

    const [
        isProcessing,
        setIsProcessing,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const imageUrl =
        useMemo(() => {
            if (!file) {
                return null;
            }

            return URL.createObjectURL(
                file,
            );
        }, [
            file,
        ]);

    useEffect(() => {
        return () => {
            if (
                imageUrl
            ) {
                URL.revokeObjectURL(
                    imageUrl,
                );
            }
        };
    }, [
        imageUrl,
    ]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setCrop({
            x: 0,
            y: 0,
        });

        setZoom(
            1,
        );

        setCroppedAreaPixels(
            null,
        );

        setError(
            null,
        );
    }, [
        file,
        open,
    ]);

    const handleCropComplete =
        useCallback(
            (
                _croppedArea: Area,
                croppedAreaPixelsValue: Area,
            ) => {
                setCroppedAreaPixels(
                    croppedAreaPixelsValue,
                );
            },
            [],
        );

    async function handleConfirm() {
        if (
            !imageUrl ||
            !croppedAreaPixels
        ) {
            return;
        }

        setIsProcessing(
            true,
        );

        setError(
            null,
        );

        try {
            const croppedFile =
                await createCroppedImage(
                    imageUrl,
                    croppedAreaPixels,
                );

            onConfirm(
                croppedFile,
            );
        } catch (cropError) {
            setError(
                cropError instanceof
                    Error
                    ? cropError.message
                    : "No fue posible preparar la foto.",
            );
        } finally {
            setIsProcessing(
                false,
            );
        }
    }

    if (
        !open ||
        !file ||
        !imageUrl
    ) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-6 py-5">
                    <h2 className="text-lg font-black text-slate-950">
                        Ajustar foto
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Arrastra la imagen para centrar el rostro y usa el zoom para ajustar el encuadre.
                    </p>
                </div>

                <div className="p-6">
                    <div className="relative h-[360px] overflow-hidden rounded-2xl bg-slate-950">
                        <Cropper
                            image={
                                imageUrl
                            }
                            crop={
                                crop
                            }
                            zoom={
                                zoom
                            }
                            aspect={
                                1
                            }
                            cropShape="round"
                            showGrid={
                                false
                            }
                            objectFit="contain"
                            onCropChange={
                                setCrop
                            }
                            onZoomChange={
                                setZoom
                            }
                            onCropComplete={
                                handleCropComplete
                            }
                        />
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                Zoom
                            </span>

                            <span className="text-xs font-bold text-slate-700">
                                {zoom.toFixed(
                                    1,
                                )}
                                ×
                            </span>
                        </div>

                        <input
                            type="range"
                            min={
                                1
                            }
                            max={
                                3
                            }
                            step={
                                0.05
                            }
                            value={
                                zoom
                            }
                            onChange={(
                                event,
                            ) => {
                                setZoom(
                                    Number(
                                        event.target.value,
                                    ),
                                );
                            }}
                            className="mt-3 w-full accent-blue-600"
                        />
                    </div>

                    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-sm font-semibold text-blue-900">
                            La foto final se guardará en formato WEBP, cuadrada y optimizada hasta 1200 × 1200 px.
                        </p>
                    </div>

                    {error ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            {
                                error
                            }
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={
                            onCancel
                        }
                        disabled={
                            isProcessing
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                            void handleConfirm();
                        }}
                        disabled={
                            isProcessing ||
                            !croppedAreaPixels
                        }
                    >
                        {isProcessing
                            ? "Preparando..."
                            : "Usar esta foto"}
                    </Button>
                </div>
            </div>
        </div>
    );
}