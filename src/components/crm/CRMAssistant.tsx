"use client";

import {
    Bot,
    LoaderCircle,
    MessageCircle,
    RotateCcw,
    Send,
    X,
} from "lucide-react";

import {
    type FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";

type ChatMessage = {
    id: string;
    role:
    | "user"
    | "assistant";
    content: string;
};

type AssistantResponse = {
    success: boolean;

    data?: {
        message: string;
    };

    error?: string;
};

type AISettingsResponse = {
    success: boolean;

    data?: {
        assistantName: string;

        internalAssistantEnabled:
            boolean;
    };
};

type AISettingsUpdatedDetail = {
    assistantName?: string;

    internalAssistantEnabled:
        boolean;
};

type CRMAssistantProps = {
    companyName: string;
};

function createMessage(
    role:
        | "user"
        | "assistant",
    content: string,
): ChatMessage {
    return {
        id:
            crypto.randomUUID(),
        role,
        content,
    };
}

export default function CRMAssistant({
    companyName,
}: CRMAssistantProps) {
    const normalizedCompanyName =
        companyName.trim() ||
        "tu empresa";

    const [
        isEnabled,
        setIsEnabled,
    ] = useState<
        boolean | null
    >(null);

    const [
        assistantName,
        setAssistantName,
    ] = useState("Dara");

    const welcomeMessage =
        `Hola, soy ${assistantName}, el asistente de ${normalizedCompanyName}. Puedo orientarte sobre el uso de prospectos, oportunidades, cotizaciones, inventarios, automatizaciones y otros módulos.`;

    const [
        isOpen,
        setIsOpen,
    ] = useState(false);

    const [
        messages,
        setMessages,
    ] = useState<
        ChatMessage[]
    >([]);

    const [
        input,
        setInput,
    ] = useState("");

    const [
        isSending,
        setIsSending,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(null);

    const messagesEndRef =
        useRef<HTMLDivElement>(
            null,
        );

    useEffect(() => {
        let isActive = true;

        async function loadSettings() {
            try {
                const response =
                    await fetch(
                        "/api/ai/settings/crm",
                        {
                            cache:
                                "no-store",
                        },
                    );

                const result =
                    (await response.json()) as
                        AISettingsResponse;

                if (
                    !isActive
                ) {
                    return;
                }

                setIsEnabled(
                    response.ok &&
                    result.success &&
                    result.data
                        ?.internalAssistantEnabled ===
                        true,
                );

                setAssistantName(
                    result.data
                        ?.assistantName
                        ?.trim() ||
                        "Dara",
                );
            } catch {
                if (isActive) {
                    setIsEnabled(
                        false,
                    );
                }
            }
        }

        function handleSettingsUpdated(
            event: Event,
        ) {
            const detail =
                (
                    event as
                        CustomEvent<
                            AISettingsUpdatedDetail
                        >
                ).detail;

            if (
                typeof detail
                    ?.internalAssistantEnabled ===
                "boolean"
            ) {
                setIsEnabled(
                    detail
                        .internalAssistantEnabled,
                );
            }

            if (
                typeof detail
                    ?.assistantName ===
                "string" &&
                detail.assistantName
                    .trim()
            ) {
                setAssistantName(
                    detail.assistantName
                        .trim(),
                );
            }
        }

        const timeoutId =
            window.setTimeout(
                () => {
                    void loadSettings();
                },
                0,
            );

        window.addEventListener(
            "datara-ai-settings-updated",
            handleSettingsUpdated,
        );

        return () => {
            isActive = false;

            window.clearTimeout(
                timeoutId,
            );

            window.removeEventListener(
                "datara-ai-settings-updated",
                handleSettingsUpdated,
            );
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current
            ?.scrollIntoView({
                behavior:
                    "smooth",
            });
    }, [
        messages,
        isSending,
    ]);

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const question =
            input.trim();

        if (
            !question ||
            isSending
        ) {
            return;
        }

        const userMessage =
            createMessage(
                "user",
                question,
            );

        const nextMessages = [
            ...messages,
            userMessage,
        ];

        setMessages(
            nextMessages,
        );

        setInput("");
        setError(null);
        setIsSending(true);

        try {
            const response =
                await fetch(
                    "/api/crm/assistant",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                messages:
                                    nextMessages
                                        .slice(-12)
                                        .map(
                                            (
                                                message,
                                            ) => ({
                                                role:
                                                    message.role,

                                                content:
                                                    message.content,
                                            }),
                                        ),
                            }),
                    },
                );

            const result =
                (await response.json()) as
                AssistantResponse;

            if (
                !response.ok ||
                !result.success ||
                !result.data
                    ?.message
            ) {
                throw new Error(
                    result.error ??
                    "No fue posible obtener una respuesta.",
                );
            }

            setMessages(
                (
                    current,
                ) => [
                        ...current,

                        createMessage(
                            "assistant",
                            result.data!
                                .message,
                        ),
                    ],
            );
        } catch (
        requestError
        ) {
            setError(
                requestError instanceof
                    Error
                    ? requestError.message
                    : "No fue posible obtener una respuesta.",
            );
        } finally {
            setIsSending(
                false,
            );
        }
    }

    function clearConversation() {
        setMessages([]);
        setError(null);
        setInput("");
    }

    if (
        isEnabled !== true
    ) {
        return null;
    }

    return (
        <>
            {isOpen ? (
                <section
                    aria-label={`${assistantName}, asistente de Datara CRM`}
                    className="fixed inset-x-2 bottom-20 top-2 z-[70] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:max-h-[calc(100dvh-8rem)] sm:min-h-[32rem] sm:w-[25rem] sm:rounded-3xl"
                >
                    <header className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-5 py-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                                <Bot
                                    aria-hidden="true"
                                    size={22}
                                />
                            </div>

                            <div>
                                <h2 className="font-black">
                                    {assistantName}
                                </h2>

                                <p className="text-xs text-slate-300">
                                    Asistente de {normalizedCompanyName}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                title="Nueva conversación"
                                aria-label="Iniciar una conversación nueva"
                                onClick={
                                    clearConversation
                                }
                                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                            >
                                <RotateCcw
                                    aria-hidden="true"
                                    size={18}
                                />
                            </button>

                            <button
                                type="button"
                                aria-label="Cerrar asistente"
                                onClick={() =>
                                    setIsOpen(
                                        false,
                                    )
                                }
                                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                            >
                                <X
                                    aria-hidden="true"
                                    size={20}
                                />
                            </button>
                        </div>
                    </header>

                    <div
                        aria-live="polite"
                        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
                    >
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                <Bot
                                    aria-hidden="true"
                                    size={17}
                                />
                            </div>

                            <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                                {welcomeMessage}
                            </div>
                        </div>

                        {messages.map(
                            (
                                message,
                            ) => (
                                <div
                                    key={
                                        message.id
                                    }
                                    className={[
                                        "flex gap-3",
                                        message.role ===
                                            "user"
                                            ? "justify-end"
                                            : "justify-start",
                                    ].join(
                                        " ",
                                    )}
                                >
                                    {message.role ===
                                        "assistant" ? (
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                            <Bot
                                                aria-hidden="true"
                                                size={17}
                                            />
                                        </div>
                                    ) : null}

                                    <div
                                        className={[
                                            "max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
                                            message.role ===
                                                "user"
                                                ? "rounded-tr-md bg-blue-700 text-white"
                                                : "rounded-tl-md border border-slate-200 bg-white text-slate-700 shadow-sm",
                                        ].join(
                                            " ",
                                        )}
                                    >
                                        {
                                            message.content
                                        }
                                    </div>
                                </div>
                            ),
                        )}

                        {isSending ? (
                            <div className="flex gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                    <Bot
                                        aria-hidden="true"
                                        size={17}
                                    />
                                </div>

                                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                    <LoaderCircle
                                        aria-hidden="true"
                                        size={16}
                                        className="animate-spin"
                                    />

                                    Pensando...
                                </div>
                            </div>
                        ) : null}

                        {error ? (
                            <div
                                role="alert"
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                            >
                                {error}
                            </div>
                        ) : null}

                        <div
                            ref={
                                messagesEndRef
                            }
                        />
                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="border-t border-slate-200 bg-white p-4"
                    >
                        <label
                            htmlFor="crm-assistant-message"
                            className="sr-only"
                        >
                            Escribe tu pregunta
                        </label>

                        <div className="flex items-end gap-2">
                            <textarea
                                id="crm-assistant-message"
                                value={input}
                                onChange={(
                                    event,
                                ) =>
                                    setInput(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                onKeyDown={(
                                    event,
                                ) => {
                                    if (
                                        event.key ===
                                        "Enter" &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();

                                        event.currentTarget
                                            .form
                                            ?.requestSubmit();
                                    }
                                }}
                                maxLength={2000}
                                rows={2}
                                disabled={
                                    isSending
                                }
                                placeholder="Pregunta cómo realizar una tarea..."
                                className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                            />

                            <button
                                type="submit"
                                disabled={
                                    isSending ||
                                    !input.trim()
                                }
                                aria-label="Enviar pregunta"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                <Send
                                    aria-hidden="true"
                                    size={19}
                                />
                            </button>
                        </div>

                        <p className="mt-2 text-center text-[11px] leading-4 text-slate-400">
                            El asistente puede cometer errores. Verifica la información importante.
                        </p>
                    </form>
                </section>
            ) : null}

            <button
                type="button"
                aria-label={
                    isOpen
                        ? `Cerrar ${assistantName}`
                        : `Abrir ${assistantName}`
                }
                aria-expanded={
                    isOpen
                }
                onClick={() =>
                    setIsOpen(
                        (
                            current,
                        ) =>
                            !current,
                    )
                }
                className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[80] flex h-14 items-center gap-3 rounded-full bg-gradient-to-r from-blue-700 to-cyan-500 px-4 font-bold text-white shadow-xl shadow-blue-950/25 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 sm:bottom-6 sm:right-6 sm:px-5"
            >
                {isOpen ? (
                    <X
                        aria-hidden="true"
                        size={21}
                    />
                ) : (
                    <MessageCircle
                        aria-hidden="true"
                        size={21}
                    />
                )}

                <span className="hidden sm:inline">
                    {isOpen
                        ? "Cerrar"
                        : `Pregúntale a ${assistantName}`}
                </span>
            </button>
        </>
    );
}