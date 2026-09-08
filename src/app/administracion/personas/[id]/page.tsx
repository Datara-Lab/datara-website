"use client";

import Link from "next/link";
import {
    use,
    useEffect,
    useRef,
    useState,
} from "react";

import QRCode from "qrcode";
import {
    toPng,
} from "html-to-image";
import {
    PDFDocument,
} from "pdf-lib";

import Button from "@/components/ui/Button";
import ProfilePhotoCropper from "@/components/upload/ProfilePhotoCropper";

type Person = {
    id: string;
    memberId: string | null;
    personCode: string;
    employeeNumber: string | null;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    department: string | null;
    location: string | null;
    linkedInUrl: string | null;
    professionalBio: string | null;
    photoObjectKey: string | null;
    hiredAt: string | null;
    personType: string;
    status: string;
    publicVisibility: Record<
        string,
        boolean
    >;
    createdAt: string;
    updatedAt: string;
    hasSystemAccess: boolean;
};

type PersonResponse = {
    success: boolean;
    data?: Person;
    error?: string;
};

type PublicVisibility = {
    photo: boolean;
    personCode: boolean;
    jobTitle: boolean;
    department: boolean;
    email: boolean;
    phone: boolean;
    location: boolean;
    linkedIn: boolean;
    professionalBio: boolean;
    hiredAt: boolean;
};

type DigitalCredential = {
    id: string;
    tenantId: string;
    personId: string;
    publicToken: string;
    credentialType: string;
    status: string;
    issuedAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    revokedReason: string | null;
    metadata: Record<
        string,
        unknown
    >;
    createdAt: string;
    updatedAt: string;
    publicPath: string;
};

type CredentialResponse = {
    success: boolean;
    data?: DigitalCredential;
    created?: boolean;
    error?: string;
};

type PersonPageProps = {
    params: Promise<{
        id: string;
    }>;
};

const personTypeNames: Record<
    string,
    string
> = {
    employee: "Empleado",
    contractor: "Contratista",
    provider: "Proveedor",
    visitor: "Visitante",
    other: "Otro",
};

export default function PersonPage({
    params,
}: PersonPageProps) {
    const {
        id,
    } = use(params);

    const [
        person,
        setPerson,
    ] = useState<Person | null>(
        null,
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    const [
        firstName,
        setFirstName,
    ] = useState("");

    const [
        lastName,
        setLastName,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        phone,
        setPhone,
    ] = useState("");

    const [
        jobTitle,
        setJobTitle,
    ] = useState("");

    const [
        department,
        setDepartment,
    ] = useState("");

    const [
        location,
        setLocation,
    ] = useState("");

    const [
        hiredAt,
        setHiredAt,
    ] = useState("");

    const [
        personType,
        setPersonType,
    ] = useState("employee");

    const [
        publicVisibility,
        setPublicVisibility,
    ] = useState<PublicVisibility>({
        photo: true,
        personCode: true,
        jobTitle: true,
        department: true,
        email: true,
        phone: false,
        location: false,
        linkedIn: false,
        professionalBio: false,
        hiredAt: false,
    });

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        saveError,
        setSaveError,
    ] = useState<string | null>(
        null,
    );

    const [
        saveMessage,
        setSaveMessage,
    ] = useState<string | null>(
        null,
    );

    const [
        isUploadingPhoto,
        setIsUploadingPhoto,
    ] = useState(false);

    const [
        photoError,
        setPhotoError,
    ] = useState<string | null>(
        null,
    );

    const [
        selectedPhotoFile,
        setSelectedPhotoFile,
    ] = useState<File | null>(
        null,
    );

    const [
        isPhotoCropperOpen,
        setIsPhotoCropperOpen,
    ] = useState(false);

    const [
        activeTab,
        setActiveTab,
    ] = useState<
        | "information"
        | "organization"
        | "credential"
        | "privacy"
        | "activity"
    >(
        "information",
    );

    const [
        credential,
        setCredential,
    ] =
        useState<DigitalCredential | null>(
            null,
        );

    const [
        credentialLoading,
        setCredentialLoading,
    ] = useState(false);

    const [
        credentialError,
        setCredentialError,
    ] = useState<string | null>(
        null,
    );

    const [
        credentialQr,
        setCredentialQr,
    ] = useState<string | null>(
        null,
    );

    const credentialFrontRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const credentialBackRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    useEffect(() => {
        let active = true;

        async function loadPerson() {
            try {
                setLoading(true);
                setError(null);

                const response =
                    await fetch(
                        `/api/administracion/personas/${id}`,
                        {
                            cache:
                                "no-store",
                        },
                    );

                const data =
                    (await response.json()) as PersonResponse;

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            "No fue posible cargar la persona.",
                    );
                }

                if (!active) {
                    return;
                }

                const loadedPerson =
                    data.data ?? null;

                setPerson(
                    loadedPerson,
                );

                if (loadedPerson) {
                    setFirstName(
                        loadedPerson.firstName,
                    );

                    setLastName(
                        loadedPerson.lastName ??
                            "",
                    );

                    setEmail(
                        loadedPerson.email ??
                            "",
                    );

                    setPhone(
                        loadedPerson.phone ??
                            "",
                    );

                    setJobTitle(
                        loadedPerson.jobTitle ??
                            "",
                    );

                    setDepartment(
                        loadedPerson.department ??
                            "",
                    );

                    setLocation(
                        loadedPerson.location ??
                            "",
                    );

                    setHiredAt(
                        loadedPerson.hiredAt ??
                            "",
                    );

                    setPersonType(
                        loadedPerson.personType,
                    );

                    setPublicVisibility({
                        photo:
                            loadedPerson.publicVisibility.photo ??
                            true,

                        personCode:
                            loadedPerson.publicVisibility.personCode ??
                            true,

                        jobTitle:
                            loadedPerson.publicVisibility.jobTitle ??
                            true,

                        department:
                            loadedPerson.publicVisibility.department ??
                            true,

                        email:
                            loadedPerson.publicVisibility.email ??
                            true,

                        phone:
                            loadedPerson.publicVisibility.phone ??
                            false,

                        location:
                            loadedPerson.publicVisibility.location ??
                            false,

                        linkedIn:
                            loadedPerson.publicVisibility.linkedIn ??
                            false,

                        professionalBio:
                            loadedPerson.publicVisibility.professionalBio ??
                            false,

                        hiredAt:
                            loadedPerson.publicVisibility.hiredAt ??
                            false,
                    });
                }
            } catch (loadError) {
                if (!active) {
                    return;
                }

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "No fue posible cargar la persona.",
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadPerson();

        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            activeTab !==
                "credential" ||
            credential
        ) {
            return;
        }

        let isCancelled =
            false;

        async function loadCredential() {
            setCredentialLoading(
                true,
            );

            setCredentialError(
                null,
            );

            try {
                const response =
                    await fetch(
                        `/api/administracion/personas/${id}/credencial`,
                        {
                            cache:
                                "no-store",
                        },
                    );

                const data =
                    (await response.json()) as CredentialResponse;

                if (
                    !response.ok ||
                    !data.success ||
                    !data.data
                ) {
                    throw new Error(
                        data.error ??
                            "No fue posible cargar la credencial digital.",
                    );
                }

                if (
                    !isCancelled
                ) {
                    setCredential(
                        data.data,
                    );
                }
            } catch (
                credentialRequestError
            ) {
                if (
                    !isCancelled
                ) {
                    setCredentialError(
                        credentialRequestError instanceof
                            Error
                            ? credentialRequestError.message
                            : "No fue posible cargar la credencial digital.",
                    );
                }
            } finally {
                if (
                    !isCancelled
                ) {
                    setCredentialLoading(
                        false,
                    );
                }
            }
        }

        void loadCredential();

        return () => {
            isCancelled =
                true;
        };
    }, [
        activeTab,
        credential,
        id,
    ]);

    useEffect(() => {
        if (
            !credential ||
            typeof window ===
                "undefined"
        ) {
            return;
        }

        const currentCredential =
            credential;

        let isCancelled =
            false;

        async function generateCredentialQr() {
            try {
                const publicUrl =
                    `${window.location.origin}${currentCredential.publicPath}`;

                const qrDataUrl =
                    await QRCode.toDataURL(
                        publicUrl,
                        {
                            width:
                                512,

                            margin:
                                1,

                            errorCorrectionLevel:
                                "H",
                        },
                    );

                if (
                    !isCancelled
                ) {
                    setCredentialQr(
                        qrDataUrl,
                    );
                }
            } catch (
                qrError
            ) {
                console.error(
                    "No fue posible generar el QR de la credencial:",
                    qrError,
                );

                if (
                    !isCancelled
                ) {
                    setCredentialQr(
                        null,
                    );
                }
            }
        }

        void generateCredentialQr();

        return () => {
            isCancelled =
                true;
        };
    }, [
        credential,
    ]);

    async function handleSaveInformation() {
        if (!person) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSaveMessage(null);

        try {
            const response =
                await fetch(
                    `/api/administracion/personas/${id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                firstName,
                                lastName,
                                email,
                                phone,

                                jobTitle:
                                    person.jobTitle,

                                department:
                                    person.department,

                                location:
                                    person.location,

                                linkedInUrl:
                                    person.linkedInUrl,

                                professionalBio:
                                    person.professionalBio,

                                hiredAt:
                                    person.hiredAt,

                                personType:
                                    person.personType,

                                status:
                                    person.status,
                            }),
                    },
                );

            const data =
                (await response.json()) as PersonResponse & {
                    message?: string;
                };

            if (
                !response.ok ||
                !data.success ||
                !data.data
            ) {
                throw new Error(
                    data.error ??
                        "No fue posible guardar la información.",
                );
            }

            setPerson(
                data.data,
            );

            setSaveMessage(
                data.message ??
                    "La información fue actualizada correctamente.",
            );
        } catch (saveRequestError) {
            setSaveError(
                saveRequestError instanceof Error
                    ? saveRequestError.message
                    : "No fue posible guardar la información.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleCroppedPhotoConfirm(
        file: File,
    ) {
        if (!person) {
            return;
        }

        setIsUploadingPhoto(
            true,
        );

        setPhotoError(
            null,
        );

        try {
            const formData =
                new FormData();

            formData.append(
                "file",
                file,
            );

            const response =
                await fetch(
                    `/api/administracion/personas/${person.id}/foto`,
                    {
                        method:
                            "POST",

                        body:
                            formData,
                    },
                );

            const data =
                (await response.json()) as {
                    success: boolean;
                    error?: string;
                };

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.error ??
                        "No fue posible subir la foto.",
                );
            }

            setPerson(
                (
                    currentPerson,
                ) =>
                    currentPerson
                        ? {
                              ...currentPerson,

                              photoObjectKey:
                                  `${Date.now()}`,
                          }
                        : currentPerson,
            );

            setIsPhotoCropperOpen(
                false,
            );

            setSelectedPhotoFile(
                null,
            );
        } catch (uploadError) {
            setPhotoError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "No fue posible subir la foto.",
            );
        } finally {
            setIsUploadingPhoto(
                false,
            );
        }
    }

    function handlePhotoUpload(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0];

        event.target.value =
            "";

        if (!file) {
            return;
        }

        setPhotoError(
            null,
        );

        if (
            ![
                "image/jpeg",
                "image/png",
                "image/webp",
            ].includes(
                file.type,
            )
        ) {
            setPhotoError(
                "Usa una imagen JPG, PNG o WEBP.",
            );

            return;
        }

        if (
            file.size >
            5 * 1024 * 1024
        ) {
            setPhotoError(
                "La imagen no puede superar 5 MB.",
            );

            return;
        }

        setSelectedPhotoFile(
            file,
        );

        setIsPhotoCropperOpen(
            true,
        );
    }

    async function handleSaveOrganization() {
        if (!person) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSaveMessage(null);

        try {
            const response =
                await fetch(
                    `/api/administracion/personas/${id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                firstName:
                                    person.firstName,

                                lastName:
                                    person.lastName ??
                                    "",

                                email:
                                    person.email ??
                                    "",

                                phone:
                                    person.phone ??
                                    "",

                                jobTitle,

                                department,

                                location,

                                linkedInUrl:
                                    person.linkedInUrl,

                                professionalBio:
                                    person.professionalBio,

                                hiredAt,

                                personType,

                                status:
                                    person.status,
                            }),
                    },
                );

            const data =
                (await response.json()) as PersonResponse & {
                    message?: string;
                };

            if (
                !response.ok ||
                !data.success ||
                !data.data
            ) {
                throw new Error(
                    data.error ??
                        "No fue posible guardar la organización.",
                );
            }

            setPerson(
                data.data,
            );

            setSaveMessage(
                data.message ??
                    "La organización fue actualizada correctamente.",
            );
        } catch (saveRequestError) {
            setSaveError(
                saveRequestError instanceof Error
                    ? saveRequestError.message
                    : "No fue posible guardar la organización.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSavePrivacy() {
        if (!person) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSaveMessage(null);

        try {
            const response =
                await fetch(
                    `/api/administracion/personas/${id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                publicVisibility,
                            }),
                    },
                );

            const data =
                (await response.json()) as PersonResponse & {
                    message?: string;
                };

            if (
                !response.ok ||
                !data.success ||
                !data.data
            ) {
                throw new Error(
                    data.error ??
                        "No fue posible guardar la configuración de privacidad.",
                );
            }

            setPerson(
                data.data,
            );

            setPublicVisibility({
                photo:
                    data.data.publicVisibility.photo ??
                    true,

                personCode:
                    data.data.publicVisibility.personCode ??
                    true,

                jobTitle:
                    data.data.publicVisibility.jobTitle ??
                    true,

                department:
                    data.data.publicVisibility.department ??
                    true,

                email:
                    data.data.publicVisibility.email ??
                    true,

                phone:
                    data.data.publicVisibility.phone ??
                    false,

                location:
                    data.data.publicVisibility.location ??
                    false,

                linkedIn:
                    data.data.publicVisibility.linkedIn ??
                    false,

                professionalBio:
                    data.data.publicVisibility.professionalBio ??
                    false,

                hiredAt:
                    data.data.publicVisibility.hiredAt ??
                    false,
            });

            setSaveMessage(
                "La configuración de privacidad fue actualizada correctamente.",
            );
        } catch (saveRequestError) {
            setSaveError(
                saveRequestError instanceof Error
                    ? saveRequestError.message
                    : "No fue posible guardar la configuración de privacidad.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDownloadCredentialPdf() {
        if (
            !person ||
            !credentialFrontRef.current ||
            !credentialBackRef.current
        ) {
            return;
        }

        try {
            const [
                frontPng,
                backPng,
            ] = await Promise.all([
                toPng(
                    credentialFrontRef.current,
                    {
                        pixelRatio:
                            2,
                        cacheBust:
                            true,
                    },
                ),
                toPng(
                    credentialBackRef.current,
                    {
                        pixelRatio:
                            2,
                        cacheBust:
                            true,
                    },
                ),
            ]);

            const pdfDocument =
                await PDFDocument.create();

            const millimetersToPoints =
                72 / 25.4;

            const cardWidth =
                53.98 *
                millimetersToPoints;

            const cardHeight =
                85.6 *
                millimetersToPoints;

            const frontImage =
                await pdfDocument.embedPng(
                    frontPng,
                );

            const backImage =
                await pdfDocument.embedPng(
                    backPng,
                );

            const frontPage =
                pdfDocument.addPage([
                    cardWidth,
                    cardHeight,
                ]);

            frontPage.drawImage(
                frontImage,
                {
                    x: 0,
                    y: 0,
                    width:
                        cardWidth,
                    height:
                        cardHeight,
                },
            );

            const backPage =
                pdfDocument.addPage([
                    cardWidth,
                    cardHeight,
                ]);

            backPage.drawImage(
                backImage,
                {
                    x: 0,
                    y: 0,
                    width:
                        cardWidth,
                    height:
                        cardHeight,
                },
            );

            const pdfBytes =
                await pdfDocument.save();

            const pdfBlob =
                new Blob(
                    [
                        new Uint8Array(
                            pdfBytes,
                        ),
                    ],
                    {
                        type:
                            "application/pdf",
                    },
                );

            const downloadUrl =
                URL.createObjectURL(
                    pdfBlob,
                );

            const downloadLink =
                document.createElement(
                    "a",
                );

            const employeeNumber =
                person.employeeNumber ??
                person.personCode;

            downloadLink.href =
                downloadUrl;

            downloadLink.download =
                `credencial-${employeeNumber}.pdf`;

            document.body.appendChild(
                downloadLink,
            );

            downloadLink.click();

            downloadLink.remove();

            URL.revokeObjectURL(
                downloadUrl,
            );
        } catch (
            pdfError
        ) {
            console.error(
                "No fue posible generar el PDF de la credencial:",
                pdfError,
            );
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/administracion/personas"
                    className="text-sm font-bold text-blue-700 hover:text-blue-800"
                >
                    ← Personas
                </Link>

                {loading ? (
                    <div className="mt-10 rounded-3xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
                        <p className="text-sm font-semibold text-slate-500">
                            Cargando información de la persona...
                        </p>
                    </div>
                ) : null}

                {!loading &&
                    error ? (
                        <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 px-8 py-10">
                            <p className="font-bold text-red-700">
                                {
                                    error
                                }
                            </p>
                        </div>
                    ) : null}

                {!loading &&
                    !error &&
                    person ? (
                        <>
                            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                                        Organización
                                    </p>

                                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                                        {
                                            person.firstName
                                        }{" "}
                                        {
                                            person.lastName ??
                                            ""
                                        }
                                    </h1>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                            {
                                                person.personCode
                                            }
                                        </span>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            {
                                                personTypeNames[
                                                    person.personType
                                                ] ??
                                                person.personType
                                            }
                                        </span>

                                        {person.status ===
                                        "active" ? (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                                Activa
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                                Inactiva
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {person.hasSystemAccess ? (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                                            Acceso a Datara
                                        </p>

                                        <p className="mt-1 text-sm font-black text-slate-950">
                                            Con acceso
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                            Acceso a Datara
                                        </p>

                                        <p className="mt-1 text-sm font-black text-slate-950">
                                            Sin acceso
                                        </p>
                                    </div>
                                )}
                            </div>

                            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 px-6 pt-6">
                                    <nav className="flex gap-6 overflow-x-auto">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(
                                                    "information",
                                                );
                                            }}
                                            className={
                                                activeTab ===
                                                "information"
                                                    ? "border-b-2 border-blue-600 pb-4 text-sm font-bold text-blue-700"
                                                    : "border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                            }
                                        >
                                            Información
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(
                                                    "organization",
                                                );
                                            }}
                                            className={
                                                activeTab ===
                                                "organization"
                                                    ? "border-b-2 border-blue-600 pb-4 text-sm font-bold text-blue-700"
                                                    : "border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                            }
                                        >
                                            Organización
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(
                                                    "credential",
                                                );
                                            }}
                                            className={
                                                activeTab ===
                                                "credential"
                                                    ? "border-b-2 border-blue-600 pb-4 text-sm font-bold text-blue-700"
                                                    : "border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                            }
                                        >
                                            Credencial digital
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(
                                                    "privacy",
                                                );
                                            }}
                                            className={
                                                activeTab ===
                                                "privacy"
                                                    ? "border-b-2 border-blue-600 pb-4 text-sm font-bold text-blue-700"
                                                    : "border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                            }
                                        >
                                            Privacidad
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(
                                                    "activity",
                                                );
                                            }}
                                            className={
                                                activeTab ===
                                                "activity"
                                                    ? "border-b-2 border-blue-600 pb-4 text-sm font-bold text-blue-700"
                                                    : "border-b-2 border-transparent pb-4 text-sm font-bold text-slate-500 transition hover:text-slate-800"
                                            }
                                        >
                                            Actividad
                                        </button>
                                    </nav>
                                </div>

                                {activeTab ===
                                "information" ? (
                                    <div className="p-6 sm:p-8">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h2 className="text-base font-black text-slate-950">
                                                        Datos personales
                                                    </h2>

                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        Actualiza la información básica de esta persona.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-black text-white shadow-sm"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #0052FF, #00C2FF)",
                                                        }}
                                                    >
                                                        {person.photoObjectKey ? (
                                                            <img
                                                                src={`/api/administracion/personas/${person.id}/foto?v=${encodeURIComponent(
                                                                    person.photoObjectKey,
                                                                )}`}
                                                                alt={`${person.firstName} ${person.lastName ?? ""}`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <>
                                                                {person.firstName
                                                                    .slice(
                                                                        0,
                                                                        1,
                                                                    )
                                                                    .toUpperCase()}

                                                                {person.lastName
                                                                    ? person.lastName
                                                                        .slice(
                                                                            0,
                                                                            1,
                                                                        )
                                                                        .toUpperCase()
                                                                    : ""}
                                                            </>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-black text-slate-950">
                                                            Foto de perfil
                                                        </p>

                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                            Se utilizará en la credencial digital y en el perfil público.
                                                        </p>
                                                    </div>
                                                </div>

                                                <label>
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        disabled={
                                                            isUploadingPhoto
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            void handlePhotoUpload(
                                                                event,
                                                            );
                                                        }}
                                                    />

                                                    <span
                                                        className={[
                                                            "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-slate-800 transition duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
                                                            isUploadingPhoto
                                                                ? "pointer-events-none opacity-50"
                                                                : "cursor-pointer",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        {isUploadingPhoto
                                                            ? "Subiendo..."
                                                            : person.photoObjectKey
                                                              ? "Cambiar foto"
                                                              : "Subir foto"}
                                                    </span>
                                                </label>
                                            </div>

                                            {photoError ? (
                                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                    {
                                                        photoError
                                                    }
                                                </div>
                                            ) : null}

                                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                                <label className="block">
                                                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Nombre
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            firstName
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setFirstName(
                                                                event.target.value,
                                                            );

                                                            setSaveMessage(
                                                                null,
                                                            );

                                                            setSaveError(
                                                                null,
                                                            );
                                                        }}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        placeholder="Nombre"
                                                    />
                                                </label>

                                                <label className="block">
                                                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Apellido
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            lastName
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setLastName(
                                                                event.target.value,
                                                            );

                                                            setSaveMessage(
                                                                null,
                                                            );

                                                            setSaveError(
                                                                null,
                                                            );
                                                        }}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        placeholder="Apellido"
                                                    />
                                                </label>

                                                <label className="block sm:col-span-2">
                                                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Correo electrónico
                                                    </span>

                                                    <input
                                                        type="email"
                                                        value={
                                                            email
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setEmail(
                                                                event.target.value,
                                                            );

                                                            setSaveMessage(
                                                                null,
                                                            );

                                                            setSaveError(
                                                                null,
                                                            );
                                                        }}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        placeholder="correo@empresa.com"
                                                    />
                                                </label>

                                                <label className="block sm:col-span-2">
                                                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Teléfono
                                                    </span>

                                                    <input
                                                        type="tel"
                                                        value={
                                                            phone
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setPhone(
                                                                event.target.value,
                                                            );

                                                            setSaveMessage(
                                                                null,
                                                            );

                                                            setSaveError(
                                                                null,
                                                            );
                                                        }}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        placeholder="55 0000 0000"
                                                    />
                                                </label>
                                            </div>

                                            {saveError ? (
                                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                    {
                                                        saveError
                                                    }
                                                </div>
                                            ) : null}

                                            {saveMessage ? (
                                                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                                    {
                                                        saveMessage
                                                    }
                                                </div>
                                            ) : null}

                                            <div className="mt-5 flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        void handleSaveInformation();
                                                    }}
                                                    disabled={
                                                        isSaving ||
                                                        !firstName.trim()
                                                    }
                                                >
                                                    {isSaving
                                                        ? "Guardando..."
                                                        : "Guardar cambios"}
                                                </Button>
                                            </div>
                                        </section>

                                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                            <h2 className="text-base font-black text-slate-950">
                                                Datos laborales
                                            </h2>

                                            <dl className="mt-5 space-y-4">
                                                <div>
                                                    <dt className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Puesto
                                                    </dt>

                                                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                                                        {
                                                            person.jobTitle ??
                                                            "Sin puesto"
                                                        }
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Área
                                                    </dt>

                                                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                                                        {
                                                            person.department ??
                                                            "Sin área"
                                                        }
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Ubicación
                                                    </dt>

                                                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                                                        {
                                                            person.location ??
                                                            "Sin ubicación"
                                                        }
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                        Fecha de ingreso
                                                    </dt>

                                                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                                                        {
                                                            person.hiredAt ??
                                                            "Sin fecha"
                                                        }
                                                    </dd>
                                                </div>
                                            </dl>
                                        </section>
                                    </div>
                                </div>
                                ) : null}

                                {activeTab ===
                                "organization" ? (
                                    <div className="p-6 sm:p-8">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                                <div>
                                                    <h2 className="text-base font-black text-slate-950">
                                                        Información laboral
                                                    </h2>

                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        Define el puesto, área y ubicación de esta persona.
                                                    </p>
                                                </div>

                                                <div className="mt-5 space-y-4">
                                                    <label className="block">
                                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Puesto
                                                        </span>

                                                        <input
                                                            type="text"
                                                            value={
                                                                jobTitle
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setJobTitle(
                                                                    event.target.value,
                                                                );

                                                                setSaveMessage(
                                                                    null,
                                                                );

                                                                setSaveError(
                                                                    null,
                                                                );
                                                            }}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                            placeholder="Puesto o cargo"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Área
                                                        </span>

                                                        <input
                                                            type="text"
                                                            value={
                                                                department
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setDepartment(
                                                                    event.target.value,
                                                                );

                                                                setSaveMessage(
                                                                    null,
                                                                );

                                                                setSaveError(
                                                                    null,
                                                                );
                                                            }}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                            placeholder="Área o departamento"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Ubicación
                                                        </span>

                                                        <input
                                                            type="text"
                                                            value={
                                                                location
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setLocation(
                                                                    event.target.value,
                                                                );

                                                                setSaveMessage(
                                                                    null,
                                                                );

                                                                setSaveError(
                                                                    null,
                                                                );
                                                            }}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                            placeholder="Sucursal, oficina o ciudad"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Fecha de ingreso
                                                        </span>

                                                        <input
                                                            type="date"
                                                            value={
                                                                hiredAt
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setHiredAt(
                                                                    event.target.value,
                                                                );

                                                                setSaveMessage(
                                                                    null,
                                                                );

                                                                setSaveError(
                                                                    null,
                                                                );
                                                            }}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        />
                                                    </label>
                                                </div>
                                            </section>

                                            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                                <div>
                                                    <h2 className="text-base font-black text-slate-950">
                                                        Relación con la organización
                                                    </h2>

                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        Define el tipo de relación y consulta su acceso a Datara.
                                                    </p>
                                                </div>

                                                <div className="mt-5 space-y-5">
                                                    <label className="block">
                                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Tipo de persona
                                                        </span>

                                                        <select
                                                            value={
                                                                personType
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setPersonType(
                                                                    event.target.value,
                                                                );

                                                                setSaveMessage(
                                                                    null,
                                                                );

                                                                setSaveError(
                                                                    null,
                                                                );
                                                            }}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                                        >
                                                            <option value="employee">
                                                                Empleado
                                                            </option>

                                                            <option value="contractor">
                                                                Contratista
                                                            </option>

                                                            <option value="provider">
                                                                Proveedor
                                                            </option>

                                                            <option value="visitor">
                                                                Visitante
                                                            </option>

                                                            <option value="other">
                                                                Otro
                                                            </option>
                                                        </select>
                                                    </label>

                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Acceso a Datara
                                                        </p>

                                                        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-950">
                                                                    {person.hasSystemAccess
                                                                        ? "Con acceso"
                                                                        : "Sin acceso"}
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {person.hasSystemAccess
                                                                        ? "Esta persona cuenta con acceso al sistema."
                                                                        : "Esta persona está registrada sin acceso al sistema."}
                                                                </p>
                                                            </div>

                                                            <span
                                                                className={
                                                                    person.hasSystemAccess
                                                                        ? "inline-flex shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                                                                        : "inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                                                                }
                                                            >
                                                                {person.hasSystemAccess
                                                                    ? "Usuario"
                                                                    : "Sin usuario"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                                            Estado
                                                        </p>

                                                        <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                            <span
                                                                className={
                                                                    person.status ===
                                                                    "active"
                                                                        ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                                                        : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                                                                }
                                                            >
                                                                {person.status ===
                                                                "active"
                                                                    ? "Activa"
                                                                    : "Inactiva"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {saveError ? (
                                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                {
                                                    saveError
                                                }
                                            </div>
                                        ) : null}

                                        {saveMessage ? (
                                            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                                {
                                                    saveMessage
                                                }
                                            </div>
                                        ) : null}

                                        <div className="mt-6 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="sm"
                                                onClick={() => {
                                                    void handleSaveOrganization();
                                                }}
                                                disabled={
                                                    isSaving
                                                }
                                            >
                                                {isSaving
                                                    ? "Guardando..."
                                                    : "Guardar cambios"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}

                                {activeTab ===
                                "credential" ? (
                                    <div className="p-6 sm:p-8">
                                        {credentialLoading ? (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                                <p className="text-sm font-semibold text-slate-600">
                                                    Cargando credencial digital...
                                                </p>
                                            </div>
                                        ) : credentialError ? (
                                            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                                                {
                                                    credentialError
                                                }
                                            </div>
                                        ) : credential ? (
                                            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                                Credencial digital
                                                            </p>

                                                            <h2 className="mt-2 text-xl font-black text-slate-950">
                                                                {person.firstName}{" "}
                                                                {
                                                                    person.lastName
                                                                }
                                                            </h2>

                                                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                                                {person.jobTitle ??
                                                                    "Sin puesto"}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={
                                                                credential.status ===
                                                                "active"
                                                                    ? "inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                                                    : credential.status ===
                                                                        "suspended"
                                                                      ? "inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                                                                      : "inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                                                            }
                                                        >
                                                            {credential.status ===
                                                            "active"
                                                                ? "Activa"
                                                                : credential.status ===
                                                                    "suspended"
                                                                  ? "Suspendida"
                                                                  : credential.status ===
                                                                      "revoked"
                                                                    ? "Revocada"
                                                                    : "Vencida"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-6 overflow-x-auto">
                                                        <div className="flex min-w-[900px] gap-6">
                                                            <div
                                                                ref={
                                                                    credentialFrontRef
                                                                }
                                                                className="relative h-[625px] w-[419px] shrink-0 overflow-hidden rounded-[18px] shadow-[0_10px_26px_rgba(0,0,0,0.12)]"
                                                                style={{
                                                                    backgroundImage:
                                                                        "url('/identity/datara-lab-credential-template-v2.png')",
                                                                    backgroundRepeat:
                                                                        "no-repeat",
                                                                    backgroundSize:
                                                                        "957px 640px",
                                                                    backgroundPosition:
                                                                        "-42px -8px",
                                                                }}
                                                            >
                                                                <div
                                                                    className="absolute z-10 overflow-hidden rounded-full p-[3px]"
                                                                    style={{
                                                                        left:
                                                                            "110px",
                                                                        top:
                                                                            "166px",
                                                                        width:
                                                                            "191px",
                                                                        height:
                                                                            "191px",
                                                                        background:
                                                                            "linear-gradient(135deg, #0b57ff 0%, #03d5e7 100%)",
                                                                    }}
                                                                >
                                                                    <div className="h-full w-full overflow-hidden rounded-full bg-white">
                                                                        {person.photoObjectKey ? (
                                                                            <img
                                                                                src={`/api/administracion/personas/${person.id}/foto?v=${encodeURIComponent(
                                                                                    person.photoObjectKey,
                                                                                )}`}
                                                                                alt={`${person.firstName} ${person.lastName ?? ""}`}
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="flex h-full w-full items-center justify-center text-5xl font-black text-slate-300">
                                                                                {person.firstName
                                                                                    .slice(
                                                                                        0,
                                                                                        1,
                                                                                    )
                                                                                    .toUpperCase()}

                                                                                {person.lastName
                                                                                    ?.slice(
                                                                                        0,
                                                                                        1,
                                                                                    )
                                                                                    .toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div
                                                                    className="absolute z-10 overflow-hidden text-center text-[36px] font-extrabold leading-[45px] tracking-[-1px] text-slate-950"
                                                                    style={{
                                                                        left:
                                                                            "61px",
                                                                        top:
                                                                            "366px",
                                                                        width:
                                                                            "300px",
                                                                        height:
                                                                            "45px",
                                                                    }}
                                                                >
                                                                    {person.firstName}{" "}
                                                                    {
                                                                        person.lastName
                                                                    }
                                                                </div>

                                                                <div
                                                                    className="absolute z-10 overflow-hidden text-center text-[15px] font-bold leading-[28px] tracking-[3px] text-[#6f778b]"
                                                                    style={{
                                                                        left:
                                                                            "119px",
                                                                        top:
                                                                            "416px",
                                                                        width:
                                                                            "180px",
                                                                        height:
                                                                            "28px",
                                                                    }}
                                                                >
                                                                    {(
                                                                        person.jobTitle ??
                                                                        "SIN PUESTO"
                                                                    ).toUpperCase()}
                                                                </div>

                                                                <div
                                                                    className="absolute z-10 overflow-hidden text-[16px] font-extrabold leading-[25px] text-[#0755ff]"
                                                                    style={{
                                                                        left:
                                                                            "91px",
                                                                        top:
                                                                            "495px",
                                                                        width:
                                                                            "145px",
                                                                        height:
                                                                            "25px",
                                                                    }}
                                                                >
                                                                    {
                                                                        person.employeeNumber ??
                                                                        "—"
                                                                    }
                                                                </div>

                                                                <div
                                                                    className="absolute z-10 overflow-hidden whitespace-nowrap text-[14px] leading-[25px] text-[#0755ff]"
                                                                    style={{
                                                                        left:
                                                                            "264px",
                                                                        top:
                                                                            "495px",
                                                                        width:
                                                                            "135px",
                                                                        height:
                                                                            "25px",
                                                                    }}
                                                                >
                                                                    {person.department ??
                                                                        "Sin área"}
                                                                </div>
                                                            </div>

                                                            <div
                                                                ref={
                                                                    credentialBackRef
                                                                }
                                                                className="relative h-[625px] w-[419px] shrink-0 overflow-hidden rounded-[18px] shadow-[0_10px_26px_rgba(0,0,0,0.12)]"
                                                                style={{
                                                                    backgroundImage:
                                                                        "url('/identity/datara-lab-credential-template-v2.png')",
                                                                    backgroundRepeat:
                                                                        "no-repeat",
                                                                    backgroundSize:
                                                                        "957px 640px",
                                                                    backgroundPosition:
                                                                        "-496px -8px",
                                                                }}
                                                            >
                                                                <div
                                                                    className="absolute z-10 rounded-[6px] border border-[#1b73ff] bg-white p-[5px]"
                                                                    style={{
                                                                        left:
                                                                            "31px",
                                                                        top:
                                                                            "249px",
                                                                        width:
                                                                            "112px",
                                                                        height:
                                                                            "114px",
                                                                    }}
                                                                >
                                                                    {credentialQr ? (
                                                                        <img
                                                                            src={
                                                                                credentialQr
                                                                            }
                                                                            alt="Código QR de la credencial digital"
                                                                            className="h-full w-full object-contain"
                                                                        />
                                                                    ) : (
                                                                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                                                                            QR
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                                ID de persona
                                                            </p>

                                                            <p className="mt-2 text-sm font-black text-slate-900">
                                                                {
                                                                    person.personCode
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                                Tipo
                                                            </p>

                                                            <p className="mt-2 text-sm font-black text-slate-900">
                                                                {
                                                                    personTypeNames[
                                                                        person.personType
                                                                    ]
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                                Emitida
                                                            </p>

                                                            <p className="mt-2 text-sm font-black text-slate-900">
                                                                {new Date(
                                                                    credential.issuedAt,
                                                                ).toLocaleDateString(
                                                                    "es-MX",
                                                                    {
                                                                        day:
                                                                            "2-digit",
                                                                        month:
                                                                            "long",
                                                                        year:
                                                                            "numeric",
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-slate-50 p-4">
                                                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                                Vigencia
                                                            </p>

                                                            <p className="mt-2 text-sm font-black text-slate-900">
                                                                {credential.expiresAt
                                                                    ? new Date(
                                                                          credential.expiresAt,
                                                                      ).toLocaleDateString(
                                                                          "es-MX",
                                                                          {
                                                                              day:
                                                                                  "2-digit",
                                                                              month:
                                                                                  "long",
                                                                              year:
                                                                                  "numeric",
                                                                          },
                                                                      )
                                                                    : "Sin vencimiento"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </section>

                                                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                                                        Perfil público
                                                    </p>

                                                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                                                        Esta credencial tiene un perfil público verificable mediante QR.
                                                    </p>

                                                    <div className="mt-5 flex justify-center">
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                            {credentialQr ? (
                                                                <img
                                                                    src={
                                                                        credentialQr
                                                                    }
                                                                    alt="Código QR de la credencial digital"
                                                                    className="h-48 w-48"
                                                                />
                                                            ) : (
                                                                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-slate-50">
                                                                    <p className="text-center text-xs font-semibold text-slate-400">
                                                                        Generando QR...
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                            Ruta pública
                                                        </p>

                                                        <p className="mt-2 break-all text-sm font-semibold text-blue-700">
                                                            {
                                                                credential.publicPath
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                void handleDownloadCredentialPdf();
                                                            }}
                                                        >
                                                            Descargar PDF
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                const publicUrl =
                                                                    `${window.location.origin}${credential.publicPath}`;

                                                                void navigator.clipboard.writeText(
                                                                    publicUrl,
                                                                );
                                                            }}
                                                        >
                                                            Copiar enlace
                                                        </Button>

                                                        <Button
                                                            href={
                                                                credential.publicPath
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            variant="primary"
                                                            size="sm"
                                                        >
                                                            Ver perfil público
                                                        </Button>
                                                    </div>
                                                </section>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                                <p className="text-sm font-semibold text-slate-500">
                                                    No hay una credencial digital disponible.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {activeTab ===
                                "privacy" ? (
                                    <div className="p-6 sm:p-8">
                                        <div className="max-w-3xl">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">
                                                    Privacidad del perfil público
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                                    Selecciona qué información puede mostrarse cuando alguien escanee la credencial digital de esta persona.
                                                </p>
                                            </div>

                                            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4">
                                                <p className="text-sm font-semibold text-blue-900">
                                                    Nombre de la persona
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                                    El nombre y apellido siempre se muestran mientras la credencial esté activa, ya que forman parte de la identidad verificada.
                                                </p>
                                            </div>

                                            <div className="mt-8 space-y-8">
                                                <section>
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                            Identidad
                                                        </p>
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                        {[
                                                            {
                                                                key:
                                                                    "photo" as const,
                                                                title:
                                                                    "Fotografía",
                                                                description:
                                                                    "Mostrar la fotografía de la persona en su perfil público.",
                                                            },
                                                            {
                                                                key:
                                                                    "personCode" as const,
                                                                title:
                                                                    "ID de persona",
                                                                description:
                                                                    "Mostrar el identificador interno asignado por la organización.",
                                                            },
                                                        ].map(
                                                            (
                                                                item,
                                                                index,
                                                            ) => (
                                                                <label
                                                                    key={
                                                                        item.key
                                                                    }
                                                                    className={`flex cursor-pointer items-center justify-between gap-6 px-5 py-4 ${
                                                                        index >
                                                                        0
                                                                            ? "border-t border-slate-100"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-900">
                                                                            {
                                                                                item.title
                                                                            }
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                            {
                                                                                item.description
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            publicVisibility[
                                                                                item
                                                                                    .key
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) => {
                                                                            setPublicVisibility(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,

                                                                                    [item.key]:
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                }),
                                                                            );
                                                                        }}
                                                                        className="h-5 w-5 shrink-0 accent-blue-600"
                                                                    />
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </section>

                                                <section>
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                            Información profesional
                                                        </p>
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                        {[
                                                            {
                                                                key:
                                                                    "jobTitle" as const,
                                                                title:
                                                                    "Puesto",
                                                                description:
                                                                    "Mostrar el puesto o cargo de la persona.",
                                                            },
                                                            {
                                                                key:
                                                                    "department" as const,
                                                                title:
                                                                    "Área",
                                                                description:
                                                                    "Mostrar el área o departamento al que pertenece.",
                                                            },
                                                            {
                                                                key:
                                                                    "location" as const,
                                                                title:
                                                                    "Ubicación",
                                                                description:
                                                                    "Mostrar la ubicación, oficina o sucursal asignada.",
                                                            },
                                                            {
                                                                key:
                                                                    "professionalBio" as const,
                                                                title:
                                                                    "Perfil profesional",
                                                                description:
                                                                    "Mostrar la descripción profesional de la persona.",
                                                            },
                                                            {
                                                                key:
                                                                    "hiredAt" as const,
                                                                title:
                                                                    "Fecha de ingreso",
                                                                description:
                                                                    "Mostrar la fecha de incorporación a la organización.",
                                                            },
                                                        ].map(
                                                            (
                                                                item,
                                                                index,
                                                            ) => (
                                                                <label
                                                                    key={
                                                                        item.key
                                                                    }
                                                                    className={`flex cursor-pointer items-center justify-between gap-6 px-5 py-4 ${
                                                                        index >
                                                                        0
                                                                            ? "border-t border-slate-100"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-900">
                                                                            {
                                                                                item.title
                                                                            }
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                            {
                                                                                item.description
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            publicVisibility[
                                                                                item
                                                                                    .key
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) => {
                                                                            setPublicVisibility(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,

                                                                                    [item.key]:
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                }),
                                                                            );
                                                                        }}
                                                                        className="h-5 w-5 shrink-0 accent-blue-600"
                                                                    />
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </section>

                                                <section>
                                                    <div className="mb-4">
                                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                                            Contacto
                                                        </p>
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                        {[
                                                            {
                                                                key:
                                                                    "email" as const,
                                                                title:
                                                                    "Correo electrónico",
                                                                description:
                                                                    "Mostrar el correo electrónico en el perfil público.",
                                                            },
                                                            {
                                                                key:
                                                                    "phone" as const,
                                                                title:
                                                                    "Teléfono",
                                                                description:
                                                                    "Mostrar el número telefónico de contacto.",
                                                            },
                                                            {
                                                                key:
                                                                    "linkedIn" as const,
                                                                title:
                                                                    "LinkedIn",
                                                                description:
                                                                    "Mostrar el enlace al perfil profesional de LinkedIn.",
                                                            },
                                                        ].map(
                                                            (
                                                                item,
                                                                index,
                                                            ) => (
                                                                <label
                                                                    key={
                                                                        item.key
                                                                    }
                                                                    className={`flex cursor-pointer items-center justify-between gap-6 px-5 py-4 ${
                                                                        index >
                                                                        0
                                                                            ? "border-t border-slate-100"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-900">
                                                                            {
                                                                                item.title
                                                                            }
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                            {
                                                                                item.description
                                                                            }
                                                                        </p>
                                                                    </div>

                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            publicVisibility[
                                                                                item
                                                                                    .key
                                                                            ]
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) => {
                                                                            setPublicVisibility(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,

                                                                                    [item.key]:
                                                                                        event
                                                                                            .target
                                                                                            .checked,
                                                                                }),
                                                                            );
                                                                        }}
                                                                        className="h-5 w-5 shrink-0 accent-blue-600"
                                                                    />
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </section>
                                            </div>

                                            {saveError ? (
                                                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                    {
                                                        saveError
                                                    }
                                                </div>
                                            ) : null}

                                            {saveMessage ? (
                                                <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                                    {
                                                        saveMessage
                                                    }
                                                </div>
                                            ) : null}

                                            <div className="mt-8 flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        void handleSavePrivacy();
                                                    }}
                                                    disabled={
                                                        isSaving
                                                    }
                                                >
                                                    {isSaving
                                                        ? "Guardando..."
                                                        : "Guardar privacidad"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {activeTab ===
                                "activity" ? (
                                    <div className="px-6 py-16 text-center sm:px-8">
                                        <p className="text-sm font-semibold text-slate-500">
                                            Actividad de la persona
                                        </p>

                                        <p className="mt-2 text-xs text-slate-400">
                                            Esta sección se configurará a continuación.
                                        </p>
                                    </div>
                                ) : null}
                            </section>
                        </>
                    ) : null}
            </div>

            <ProfilePhotoCropper
                file={
                    selectedPhotoFile
                }
                open={
                    isPhotoCropperOpen
                }
                onCancel={() => {
                    setIsPhotoCropperOpen(
                        false,
                    );

                    setSelectedPhotoFile(
                        null,
                    );
                }}
                onConfirm={(
                    file,
                ) => {
                    void handleCroppedPhotoConfirm(
                        file,
                    );
                }}
            />
        </main>
    );
}