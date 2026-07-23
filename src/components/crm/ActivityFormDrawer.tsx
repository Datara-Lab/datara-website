"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CRMActivityOption,
  CRMActivityParticipant,
  CRMActivityPayload,
  CRMActivityRecord,
  CRMActivityType,
  CRMCallMode,
  CRMRelatedOption,
} from "@/types/crm-activities";

type ActivityFormDrawerProps = {
  isOpen: boolean;

  mode:
    | "create"
    | "edit"
    | "view";

  type: CRMActivityType;

  callMode?: CRMCallMode;

  record?:
    | CRMActivityRecord
    | null;

  members:
    CRMActivityOption[];

  relatedOptions:
    CRMRelatedOption[];

  onClose: () => void;

  onEdit?: () => void;

  onSaved: () =>
    void | Promise<void>;
};

const taskStatuses = [
  "No iniciada",
  "En curso",
  "Aplazada",
  "Completada",
  "Cancelada",
];

const callStatuses = [
  "Programada",
  "Completada",
  "No contestó",
  "Cancelada",
];

const meetingStatuses = [
  "Programada",
  "Realizada",
  "Cancelada",
  "No asistió",
];

const priorities = [
  "Baja",
  "Normal",
  "Alta",
  "Urgente",
];

function toLocalInput(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

function toIsoString(
  value: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? undefined
    : date.toISOString();
}

function getDefaultStatus(
  type: CRMActivityType,
  callMode?: CRMCallMode,
): string {
  if (type === "task") {
    return "No iniciada";
  }

  if (
    type === "call" &&
    callMode === "logged"
  ) {
    return "Completada";
  }

  return "Programada";
}

function getTypeLabel(
  type: CRMActivityType,
): string {
  if (type === "task") {
    return "tarea";
  }

  if (type === "call") {
    return "llamada";
  }

  return "reunión";
}

export default function ActivityFormDrawer({
  isOpen,
  mode,
  type,
  callMode,
  record,
  members,
  relatedOptions,
  onClose,
  onEdit,
  onSaved,
}: ActivityFormDrawerProps) {
  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState(
    getDefaultStatus(
      type,
      callMode,
    ),
  );

  const [
    priority,
    setPriority,
  ] = useState("Normal");

  const [
    ownerId,
    setOwnerId,
  ] = useState("");

  const [
    relatedValue,
    setRelatedValue,
  ] = useState("");

  const [
    startAt,
    setStartAt,
  ] = useState("");

  const [
    endAt,
    setEndAt,
  ] = useState("");

  const [
    dueAt,
    setDueAt,
  ] = useState("");

  const [
    allDay,
    setAllDay,
  ] = useState(false);

  const [
    reminderEnabled,
    setReminderEnabled,
  ] = useState(false);

  const [
    reminderMinutes,
    setReminderMinutes,
  ] = useState("15");

  const [
    repeatEnabled,
    setRepeatEnabled,
  ] = useState(false);

  const [
    recurrenceFrequency,
    setRecurrenceFrequency,
  ] = useState("weekly");

  const [
    callDirection,
    setCallDirection,
  ] = useState("Saliente");

  const [
    callPurpose,
    setCallPurpose,
  ] = useState("");

  const [
    callResult,
    setCallResult,
  ] = useState("");

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState("");

  const [
    recordingUrl,
    setRecordingUrl,
  ] = useState("");

  const [
    locationType,
    setLocationType,
  ] = useState(
    "Ubicación del cliente",
  );

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    meetingUrl,
    setMeetingUrl,
  ] = useState("");

  const [
    participants,
    setParticipants,
  ] = useState<
    CRMActivityParticipant[]
  >([]);

  const [
  participantSource,
  setParticipantSource,
  ] = useState("");

  const [
    participantError,
    setParticipantError,
  ] = useState<
    string | null
  >(null);

  const [
    participantName,
    setParticipantName,
  ] = useState("");

  const [
    participantEmail,
    setParticipantEmail,
  ] = useState("");

  const [
    formError,
    setFormError,
  ] = useState<
    string | null
  >(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const statusOptions =
    useMemo(() => {
      if (type === "task") {
        return taskStatuses;
      }

      if (type === "call") {
        return callStatuses;
      }

      return meetingStatuses;
    }, [type]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const now = new Date();

    const oneHourLater =
      new Date(
        now.getTime() +
          60 * 60 * 1000,
      );

    setSubject(
      record?.subject ?? "",
    );

    setDescription(
      record?.description ?? "",
    );

    setStatus(
      record?.status ??
        getDefaultStatus(
          type,
          callMode,
        ),
    );

    setPriority(
      record?.priority ??
        "Normal",
    );

    setOwnerId(
      record
        ?.ownerClerkUserId ??
        members[0]?.value ??
        "",
    );

    setRelatedValue(
      record?.relatedType &&
      record.relatedId
        ? `${record.relatedType}:${record.relatedId}`
        : "",
    );

    setStartAt(
      record
        ? toLocalInput(
            record.startAt,
          )
        : toLocalInput(
            now.toISOString(),
          ),
    );

    setEndAt(
      record
        ? toLocalInput(
            record.endAt,
          )
        : toLocalInput(
            oneHourLater.toISOString(),
          ),
    );

    setDueAt(
      record
        ? toLocalInput(
            record.dueAt,
          )
        : toLocalInput(
            oneHourLater.toISOString(),
          ),
    );

    setAllDay(
      record?.allDay ?? false,
    );

    setReminderEnabled(
      record
        ?.reminderEnabled ??
        false,
    );

    setReminderMinutes(
      String(
        record
          ?.reminderMinutesBefore ??
          15,
      ),
    );

    setRepeatEnabled(
      Boolean(
        record?.recurrence
          ?.frequency,
      ),
    );

    setRecurrenceFrequency(
      record?.recurrence
        ?.frequency ??
        "weekly",
    );

    setCallDirection(
      record?.callDirection ??
        "Saliente",
    );

    setCallPurpose(
      record?.callPurpose ?? "",
    );

    setCallResult(
      record?.callResult ?? "",
    );

    setDurationMinutes(
      record
        ?.callDurationSeconds
        ? String(
            Math.round(
              record
                .callDurationSeconds /
                60,
            ),
          )
        : "",
    );

    setRecordingUrl(
      record?.recordingUrl ?? "",
    );

    setLocationType(
      record
        ?.meetingLocationType ??
        "Ubicación del cliente",
    );

    setLocation(
      record?.location ?? "",
    );

    setMeetingUrl(
      record?.meetingUrl ?? "",
    );

    setParticipants(
      record?.participants ?? [],
    );

    setParticipantSource("");
    setParticipantError(null);
    setParticipantName("");
    setParticipantEmail("");
    setFormError(null);
  }, [
    callMode,
    isOpen,
    members,
    record,
    type,
  ]);

  if (!isOpen) {
    return null;
  }

  function addSelectedParticipant() {
    if (!participantSource) {
      return;
    }

    const [
      sourceType,
      sourceId,
    ] = participantSource.split(":");

    const member =
      sourceType === "member"
        ? members.find(
            (option) =>
              option.value ===
              sourceId,
          )
        : undefined;

    const related =
      sourceType !== "member"
        ? relatedOptions.find(
            (option) =>
              option.type ===
                sourceType &&
              option.id === sourceId,
          )
        : undefined;

    if (!member && !related) {
      setParticipantError(
        "No fue posible identificar al participante.",
      );
      return;
    }

    const email =
      member?.email ??
      related?.email ??
      null;

    const name = member
      ? member.label.replace(
          /\s*\([^()]*\)\s*$/,
          "",
        )
      : related?.label.replace(
          /^(Prospecto|Cliente)\s*·\s*/,
          "",
        ) ?? "Participante";

    const participantType =
      sourceType === "member"
        ? "user"
        : sourceType;

    const isDuplicate =
      participants.some(
        (participant) =>
          (
            email &&
            participant.email
              ?.trim()
              .toLowerCase() ===
              email.trim().toLowerCase()
          ) ||
          (
            participant.participantType ===
              participantType &&
            participant.referenceId ===
              sourceId
          ),
      );

    if (isDuplicate) {
      setParticipantError(
        "Este participante ya fue agregado.",
      );
      return;
    }

    setParticipants(
      (current) => [
        ...current,
        {
          participantType,
          referenceId:
            sourceId,
          name,
          email,
          phone:
            related?.phone ??
            member?.phone ??
            null,
          responseStatus:
            "Pendiente",
          reminderMinutesBefore:
            reminderEnabled
              ? Number(
                  reminderMinutes,
                )
              : null,
        },
      ],
    );

    setParticipantSource("");
    setParticipantError(null);
    setFormError(null);
  }

  function addParticipant() {
    const name =
      participantName.trim();

    if (!name) {
      setFormError(
        "Escribe el nombre del participante.",
      );
      return;
    }

    setParticipants(
      (current) => [
        ...current,
        {
          participantType:
            "external",
          name,
          email:
            participantEmail
              .trim() ||
            null,
          responseStatus:
            "Pendiente",
          reminderMinutesBefore:
            reminderEnabled
              ? Number(
                  reminderMinutes,
                )
              : null,
        },
      ],
    );

    setParticipantName("");
    setParticipantEmail("");
    setFormError(null);
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);

    if (!subject.trim()) {
      setFormError(
        "El asunto es obligatorio.",
      );
      return;
    }

    if (!ownerId) {
      setFormError(
        "Selecciona un responsable.",
      );
      return;
    }

    const [
      relatedType,
      relatedId,
    ] = relatedValue
      ? relatedValue.split(":")
      : ["", ""];

    const effectiveCallMode =
      type === "call"
        ? record?.callMode ??
          callMode ??
          "scheduled"
        : undefined;

    const pendingParticipantName =
      participantName.trim();

    const pendingParticipantEmail =
      participantEmail.trim();

    if (
      type === "meeting" &&
      pendingParticipantEmail &&
      !pendingParticipantName
    ) {
      setFormError(
        "Escribe el nombre del participante.",
      );
      return;
    }

    const submittedParticipants =
      type === "meeting" &&
      pendingParticipantName
        ? [
            ...participants,
            {
              participantType:
                "external",
              name:
                pendingParticipantName,
              email:
                pendingParticipantEmail ||
                null,
              responseStatus:
                "Pendiente",
              reminderMinutesBefore:
                reminderEnabled
                  ? Number(
                      reminderMinutes,
                    )
                  : null,
            },
          ]
        : participants;


    const payload:
      CRMActivityPayload = {
      id:
        mode === "edit"
          ? record?.id
          : undefined,

      type,
      subject:
        subject.trim(),

      description:
        description.trim() ||
        undefined,

      status,
      priority,

      ownerClerkUserId:
        ownerId,

      leadId:
        relatedType === "lead"
          ? relatedId
          : undefined,

      customerId:
        relatedType ===
        "customer"
          ? relatedId
          : undefined,

      dealId:
        relatedType === "deal"
          ? relatedId
          : undefined,

      startAt:
        type !== "task"
          ? toIsoString(startAt)
          : undefined,

      endAt:
        type === "meeting" ||
        (
          type === "call" &&
          effectiveCallMode ===
            "scheduled"
        )
          ? toIsoString(endAt)
          : undefined,

      dueAt:
        type === "task"
          ? toIsoString(dueAt)
          : undefined,

      allDay:
        type === "meeting"
          ? allDay
          : false,

      timezone:
        "America/Mexico_City",

      reminderEnabled,

      reminderMinutesBefore:
        reminderEnabled
          ? Number(
              reminderMinutes,
            )
          : undefined,

      recurrence:
        repeatEnabled
          ? {
              frequency:
                recurrenceFrequency,
              interval: 1,
            }
          : {},

      callMode:
        effectiveCallMode,

      callDirection:
        type === "call"
          ? callDirection
          : undefined,

      callPurpose:
        type === "call"
          ? callPurpose ||
            undefined
          : undefined,

      callResult:
        type === "call" &&
        effectiveCallMode ===
          "logged"
          ? callResult ||
            undefined
          : undefined,

      callDurationSeconds:
        type === "call" &&
        effectiveCallMode ===
          "logged" &&
        durationMinutes
          ? Number(
              durationMinutes,
            ) * 60
          : undefined,

      recordingUrl:
        type === "call"
          ? recordingUrl ||
            undefined
          : undefined,

      meetingLocationType:
        type === "meeting"
          ? locationType
          : undefined,

      location:
        type === "meeting"
          ? location ||
            undefined
          : undefined,

      meetingUrl:
        type === "meeting"
          ? meetingUrl ||
            undefined
          : undefined,

      participants:
        type === "meeting"
          ? submittedParticipants
          : [],
    };

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/crm/activities",
          {
            method:
              mode === "create"
                ? "POST"
                : "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "No fue posible guardar la actividad.",
        );
      }

      await onSaved();
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la actividad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeLabel =
    getTypeLabel(type);

  const effectiveCallMode =
    record?.callMode ??
    callMode;

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Cerrar panel"
        disabled={isSubmitting}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                {mode === "view"
                  ? `Detalle de ${typeLabel}`
                  : mode === "create"
                    ? `Nueva ${typeLabel}`
                    : `Editar ${typeLabel}`}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {subject ||
                  (
                    type === "call" &&
                    effectiveCallMode ===
                      "logged"
                      ? "Registrar llamada"
                      : mode === "view"
                        ? typeLabel
                        : `${mode === "create" ? "Nueva" : "Editar"} ${typeLabel}`
                  )}
              </h2>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {formError}
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Información general
                </h3>
              </header>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                  Asunto *

                  <input
                    value={subject}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-emerald-600"
                    onChange={(event) =>
                      setSubject(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Responsable *

                  <select
                    value={ownerId}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(event) =>
                      setOwnerId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona un responsable
                    </option>

                    {members.map(
                      (member) => (
                        <option
                          key={
                            member.value
                          }
                          value={
                            member.value
                          }
                        >
                          {member.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Relacionado con

                  <select
                    value={
                      relatedValue
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(event) =>
                      setRelatedValue(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Sin relación
                    </option>

                    {relatedOptions.map(
                      (option) => (
                        <option
                          key={`${option.type}:${option.id}`}
                          value={`${option.type}:${option.id}`}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Estado

                  <select
                    value={status}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(event) =>
                      setStatus(
                        event.target.value,
                      )
                    }
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Prioridad

                  <select
                    value={priority}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                    onChange={(event) =>
                      setPriority(
                        event.target.value,
                      )
                    }
                  >
                    {priorities.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Fecha y seguimiento
                </h3>
              </header>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                {type === "task" && (
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Fecha y hora de vencimiento *

                    <input
                      type="datetime-local"
                      value={dueAt}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setDueAt(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                )}

                {type !== "task" && (
                  <>
                    <label className="text-sm font-semibold text-slate-700">
                      Inicio *

                      <input
                        type="datetime-local"
                        value={startAt}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                        onChange={(event) =>
                          setStartAt(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    {(
                      type === "meeting" ||
                      effectiveCallMode ===
                        "scheduled"
                    ) && (
                      <label className="text-sm font-semibold text-slate-700">
                        Fin *

                        <input
                          type="datetime-local"
                          value={endAt}
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(event) =>
                            setEndAt(
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    )}
                  </>
                )}

                {type === "meeting" && (
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(event) =>
                        setAllDay(
                          event.target.checked,
                        )
                      }
                    />
                    Todo el día
                  </label>
                )}

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      reminderEnabled
                    }
                    onChange={(event) =>
                      setReminderEnabled(
                        event.target.checked,
                      )
                    }
                  />
                  Activar recordatorio
                </label>

                {reminderEnabled && (
                  <label className="text-sm font-semibold text-slate-700">
                    Avisar con anticipación

                    <select
                      value={
                        reminderMinutes
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      onChange={(event) =>
                        setReminderMinutes(
                          event.target.value,
                        )
                      }
                    >
                      <option value="5">
                        5 minutos antes
                      </option>
                      <option value="15">
                        15 minutos antes
                      </option>
                      <option value="30">
                        30 minutos antes
                      </option>
                      <option value="60">
                        1 hora antes
                      </option>
                      <option value="1440">
                        1 día antes
                      </option>
                    </select>
                  </label>
                )}

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      repeatEnabled
                    }
                    onChange={(event) =>
                      setRepeatEnabled(
                        event.target.checked,
                      )
                    }
                  />
                  Repetir actividad
                </label>

                {repeatEnabled && (
                  <label className="text-sm font-semibold text-slate-700">
                    Frecuencia

                    <select
                      value={
                        recurrenceFrequency
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      onChange={(event) =>
                        setRecurrenceFrequency(
                          event.target.value,
                        )
                      }
                    >
                      <option value="daily">
                        Diariamente
                      </option>
                      <option value="weekly">
                        Semanalmente
                      </option>
                      <option value="monthly">
                        Mensualmente
                      </option>
                      <option value="yearly">
                        Anualmente
                      </option>
                    </select>
                  </label>
                )}
              </div>
            </section>

            {type === "call" && (
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Información de llamada
                  </h3>
                </header>

                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Dirección

                    <select
                      value={
                        callDirection
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      onChange={(event) =>
                        setCallDirection(
                          event.target.value,
                        )
                      }
                    >
                      <option value="Saliente">
                        Saliente
                      </option>
                      <option value="Entrante">
                        Entrante
                      </option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Propósito

                    <input
                      value={
                        callPurpose
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setCallPurpose(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  {effectiveCallMode ===
                    "logged" && (
                    <>
                      <label className="text-sm font-semibold text-slate-700">
                        Duración en minutos

                        <input
                          type="number"
                          min="0"
                          value={
                            durationMinutes
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                          onChange={(event) =>
                            setDurationMinutes(
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Resultado

                        <select
                          value={
                            callResult
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                          onChange={(event) =>
                            setCallResult(
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            Sin resultado
                          </option>
                          <option value="Contactado">
                            Contactado
                          </option>
                          <option value="No contestó">
                            No contestó
                          </option>
                          <option value="Número incorrecto">
                            Número incorrecto
                          </option>
                          <option value="Reprogramar">
                            Reprogramar
                          </option>
                        </select>
                      </label>
                    </>
                  )}

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Enlace de grabación

                    <input
                      type="url"
                      value={
                        recordingUrl
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setRecordingUrl(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </section>
            )}

            {type === "meeting" && (
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Lugar y participantes
                  </h3>
                </header>

                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Tipo de ubicación

                    <select
                      value={
                        locationType
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      onChange={(event) =>
                        setLocationType(
                          event.target.value,
                        )
                      }
                    >
                      <option value="Ubicación del cliente">
                        Ubicación del cliente
                      </option>
                      <option value="Oficina">
                        Oficina
                      </option>
                      <option value="Videollamada">
                        Videollamada
                      </option>
                      <option value="Otro">
                        Otro
                      </option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Ubicación

                    <input
                      value={location}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setLocation(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    Enlace de videollamada

                    <input
                      type="url"
                      value={meetingUrl}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setMeetingUrl(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Seleccionar participante existente
                    </p>

                    <div className="mt-2 flex gap-3">
                      <select
                        value={participantSource}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-950"
                        onChange={(event) =>
                          setParticipantSource(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Buscar cliente, prospecto o usuario
                        </option>

                        {members.length > 0 && (
                          <optgroup label="Usuarios internos">
                            {members.map(
                              (member) => (
                                <option
                                  key={`member:${member.value}`}
                                  value={`member:${member.value}`}
                                >
                                  {member.label}
                                </option>
                              ),
                            )}
                          </optgroup>
                        )}

                        {relatedOptions.some(
                          (option) =>
                            option.type ===
                            "customer",
                        ) && (
                          <optgroup label="Clientes">
                            {relatedOptions
                              .filter(
                                (option) =>
                                  option.type ===
                                  "customer",
                              )
                              .map(
                                (option) => (
                                  <option
                                    key={`customer:${option.id}`}
                                    value={`customer:${option.id}`}
                                  >
                                    {option.label}
                                    {option.email
                                      ? ` (${option.email})`
                                      : ""}
                                  </option>
                                ),
                              )}
                          </optgroup>
                        )}

                        {relatedOptions.some(
                          (option) =>
                            option.type === "lead",
                        ) && (
                          <optgroup label="Prospectos">
                            {relatedOptions
                              .filter(
                                (option) =>
                                  option.type ===
                                  "lead",
                              )
                              .map(
                                (option) => (
                                  <option
                                    key={`lead:${option.id}`}
                                    value={`lead:${option.id}`}
                                  >
                                    {option.label}
                                    {option.email
                                      ? ` (${option.email})`
                                      : ""}
                                  </option>
                                ),
                              )}
                          </optgroup>
                        )}
                      </select>

                      <button
                        type="button"
                        disabled={
                          !participantSource
                        }
                        className="shrink-0 rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={
                          addSelectedParticipant
                        }
                      >
                        Agregar
                      </button>
                    </div>

                    {participantError && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {participantError}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      O agregar un invitado externo
                    </p>
                  </div>

                  <label className="text-sm font-semibold text-slate-700">
                    Nombre del participante

                    <input
                      value={
                        participantName
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setParticipantName(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Correo del participante

                    <input
                      type="email"
                      value={
                        participantEmail
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                      onChange={(event) =>
                        setParticipantEmail(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 sm:col-span-2"
                    onClick={
                      addParticipant
                    }
                  >
                    + Agregar participante
                  </button>

                  {participants.length >
                    0 && (
                    <div className="space-y-2 sm:col-span-2">
                      {participants.map(
                        (
                          participant,
                          index,
                        ) => (
                          <div
                            key={`${participant.email ?? participant.name}-${index}`}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {
                                  participant.name
                                }
                              </p>
                              <p className="text-slate-500">
                                {
                                  participant.email
                                }
                              </p>
                            </div>

                            <button
                              type="button"
                              className="font-semibold text-red-600"
                              onClick={() =>
                                setParticipants(
                                  (
                                    current,
                                  ) =>
                                    current.filter(
                                      (
                                        _,
                                        participantIndex,
                                      ) =>
                                        participantIndex !==
                                        index,
                                    ),
                                )
                              }
                            >
                              Quitar
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="font-bold text-slate-950">
                  Descripción
                </h3>
              </header>

              <div className="p-5">
                <textarea
                  rows={5}
                  value={description}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950"
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                />
              </div>
            </section>
          </div>

          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                onClick={onClose}
              >
                {mode === "view"
                  ? "Cerrar"
                  : "Cancelar"}
              </button>

              {mode === "view" ? (
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg"
                  onClick={onEdit}
                >
                  Editar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : mode === "create"
                      ? `Crear ${typeLabel}`
                      : "Guardar cambios"}
                </button>
              )}
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
