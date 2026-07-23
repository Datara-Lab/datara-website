import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lt,
  ne,
  or,
} from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  crmActivities,
  crmActivityParticipants,
  crmCustomers,
  crmDeals,
  crmLeads,
  tenantMembers,
  tenants,
} from "@/db/schema";

export const dynamic = "force-dynamic";

type ActivityType =
  | "task"
  | "call"
  | "meeting";

type ParticipantPayload = {
  participantType?: unknown;
  referenceId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  responseStatus?: unknown;
  reminderMinutesBefore?: unknown;
};

type ActivityPayload = {
  id?: unknown;
  type?: unknown;
  subject?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;

  ownerClerkUserId?: unknown;

  leadId?: unknown;
  customerId?: unknown;
  dealId?: unknown;

  startAt?: unknown;
  endAt?: unknown;
  dueAt?: unknown;
  completedAt?: unknown;

  allDay?: unknown;
  timezone?: unknown;

  reminderEnabled?: unknown;
  reminderMinutesBefore?: unknown;

  recurrence?: unknown;

  callMode?: unknown;
  callDirection?: unknown;
  callPurpose?: unknown;
  callResult?: unknown;
  callDurationSeconds?: unknown;
  recordingUrl?: unknown;

  meetingLocationType?: unknown;
  location?: unknown;
  meetingUrl?: unknown;

  participants?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
  }
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

function getOptionalString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function getOptionalInteger(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue)
  ) {
    return undefined;
  }

  return numberValue;
}

function getBoolean(
  value: unknown,
  fallback = false,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function getOptionalDate(
  value: unknown,
): Date | null {
  const stringValue =
    getOptionalString(value);

  if (!stringValue) {
    return null;
  }

  const date = new Date(stringValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    throw new ApiError(
      `La fecha "${stringValue}" no es válida.`,
      400,
    );
  }

  return date;
}

function getActivityType(
  value: unknown,
): ActivityType {
  const type =
    getOptionalString(value);

  if (
    type !== "task" &&
    type !== "call" &&
    type !== "meeting"
  ) {
    throw new ApiError(
      "El tipo de actividad no es válido.",
      400,
    );
  }

  return type;
}

function getParticipants(
  value: unknown,
): ParticipantPayload[] {
  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.some(
      (participant) =>
        !isRecord(participant),
    )
  ) {
    throw new ApiError(
      "La lista de participantes no tiene un formato válido.",
      400,
    );
  }

  return value as ParticipantPayload[];
}

async function getTenantContext() {
  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    throw new ApiError(
      "No autenticado.",
      401,
    );
  }

  if (!orgId) {
    throw new ApiError(
      "No hay una organización activa.",
      400,
    );
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
    })
    .from(tenants)
    .where(
      eq(
        tenants.clerkOrganizationId,
        orgId,
      ),
    )
    .limit(1);

  if (!tenant) {
    throw new ApiError(
      "La empresa aún no está sincronizada.",
      404,
    );
  }

  return {
    tenantId: tenant.id,
    userId,
  };
}

async function getOwner(
  tenantId: string,
  currentUserId: string,
  requestedOwnerId: unknown,
) {
  const ownerId =
    getOptionalString(
      requestedOwnerId,
    ) ?? currentUserId;

  const [member] = await db
    .select({
      clerkUserId:
        tenantMembers.clerkUserId,
      firstName:
        tenantMembers.firstName,
      lastName:
        tenantMembers.lastName,
      email:
        tenantMembers.email,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(
          tenantMembers.tenantId,
          tenantId,
        ),
        eq(
          tenantMembers.clerkUserId,
          ownerId,
        ),
        eq(
          tenantMembers.status,
          "active",
        ),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ApiError(
      "El responsable seleccionado no es un miembro activo de la empresa.",
      400,
    );
  }

  const name = [
    member.firstName,
    member.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: member.clerkUserId,
    name: name || member.email,
    email: member.email,
  };
}

async function validateRelationship(
  tenantId: string,
  values: ActivityPayload,
) {
  const leadId =
    getOptionalString(values.leadId);

  const customerId =
    getOptionalString(
      values.customerId,
    );

  const dealId =
    getOptionalString(values.dealId);

  const selectedRelations = [
    leadId,
    customerId,
    dealId,
  ].filter(Boolean);

  if (
    selectedRelations.length > 1
  ) {
    throw new ApiError(
      "La actividad solo puede relacionarse con un prospecto, cliente u oportunidad.",
      400,
    );
  }

  if (leadId) {
    const [lead] = await db
      .select({
        id: crmLeads.id,
      })
      .from(crmLeads)
      .where(
        and(
          eq(
            crmLeads.id,
            leadId,
          ),
          eq(
            crmLeads.tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

    if (!lead) {
      throw new ApiError(
        "El prospecto seleccionado no pertenece a la empresa.",
        400,
      );
    }
  }

  if (customerId) {
    const [customer] = await db
      .select({
        id: crmCustomers.id,
      })
      .from(crmCustomers)
      .where(
        and(
          eq(
            crmCustomers.id,
            customerId,
          ),
          eq(
            crmCustomers.tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new ApiError(
        "El cliente seleccionado no pertenece a la empresa.",
        400,
      );
    }
  }

  if (dealId) {
    const [deal] = await db
      .select({
        id: crmDeals.id,
      })
      .from(crmDeals)
      .where(
        and(
          eq(
            crmDeals.id,
            dealId,
          ),
          eq(
            crmDeals.tenantId,
            tenantId,
          ),
        ),
      )
      .limit(1);

    if (!deal) {
      throw new ApiError(
        "La oportunidad seleccionada no pertenece a la empresa.",
        400,
      );
    }
  }

  return {
    leadId: leadId ?? null,
    customerId:
      customerId ?? null,
    dealId: dealId ?? null,
  };
}

function getActivityDates(
  type: ActivityType,
  values: ActivityPayload,
) {
  const startAt =
    getOptionalDate(values.startAt);

  let endAt =
    getOptionalDate(values.endAt);

  const dueAt =
    getOptionalDate(values.dueAt);

  const completedAt =
    getOptionalDate(
      values.completedAt,
    );

  const callMode =
    getOptionalString(
      values.callMode,
    );

  if (
    type === "task" &&
    !dueAt
  ) {
    throw new ApiError(
      "La fecha de vencimiento de la tarea es obligatoria.",
      400,
    );
  }

  if (
    type === "call" &&
    !startAt
  ) {
    throw new ApiError(
      "La fecha y hora de la llamada son obligatorias.",
      400,
    );
  }

  if (
    type === "meeting" &&
    (!startAt || !endAt)
  ) {
    throw new ApiError(
      "La fecha de inicio y fin de la reunión son obligatorias.",
      400,
    );
  }

  if (
    type === "call" &&
    callMode === "scheduled" &&
    startAt &&
    !endAt
  ) {
    endAt = new Date(
      startAt.getTime() +
        30 * 60 * 1000,
    );
  }

  if (
    startAt &&
    endAt &&
    endAt.getTime() <=
      startAt.getTime()
  ) {
    throw new ApiError(
      "La fecha de finalización debe ser posterior a la fecha de inicio.",
      400,
    );
  }

  return {
    startAt,
    endAt,
    dueAt,
    completedAt,
  };
}

async function validateScheduleConflict(
  tenantId: string,
  ownerId: string,
  type: ActivityType,
  startAt: Date | null,
  endAt: Date | null,
  activityId?: string,
) {
  if (
    type === "task" ||
    !startAt ||
    !endAt
  ) {
    return;
  }

  const conditions = [
    eq(
      crmActivities.tenantId,
      tenantId,
    ),
    eq(
      crmActivities
        .ownerClerkUserId,
      ownerId,
    ),
    inArray(
      crmActivities.type,
      ["call", "meeting"],
    ),
    lt(
      crmActivities.startAt,
      endAt,
    ),
    gt(
      crmActivities.endAt,
      startAt,
    ),
    ne(
      crmActivities.status,
      "Cancelada",
    ),
  ];

  if (activityId) {
    conditions.push(
      ne(
        crmActivities.id,
        activityId,
      ),
    );
  }

  const [conflict] = await db
    .select({
      id: crmActivities.id,
      subject:
        crmActivities.subject,
      startAt:
        crmActivities.startAt,
      endAt:
        crmActivities.endAt,
    })
    .from(crmActivities)
    .where(and(...conditions))
    .limit(1);

  if (conflict) {
    throw new ApiError(
      `El responsable ya tiene la actividad "${conflict.subject}" en ese horario.`,
      409,
    );
  }
}

function validateActivity(
  type: ActivityType,
  values: ActivityPayload,
) {
  const subject =
    getOptionalString(
      values.subject,
    );

  if (!subject) {
    throw new ApiError(
      "El asunto de la actividad es obligatorio.",
      400,
    );
  }

  const callMode =
    getOptionalString(
      values.callMode,
    );

  if (
    type === "call" &&
    callMode !== "scheduled" &&
    callMode !== "logged"
  ) {
    throw new ApiError(
      "Indica si la llamada se programará o se registrará como realizada.",
      400,
    );
  }

  const durationSeconds =
    getOptionalInteger(
      values.callDurationSeconds,
    );

  if (
    durationSeconds !== undefined &&
    durationSeconds < 0
  ) {
    throw new ApiError(
      "La duración de la llamada no puede ser negativa.",
      400,
    );
  }

  const reminderMinutesBefore =
    getOptionalInteger(
      values.reminderMinutesBefore,
    );

  if (
    reminderMinutesBefore !==
      undefined &&
    reminderMinutesBefore < 0
  ) {
    throw new ApiError(
      "El recordatorio no puede ser negativo.",
      400,
    );
  }

  if (
    values.recurrence !==
      undefined &&
    !isRecord(values.recurrence)
  ) {
    throw new ApiError(
      "La configuración de repetición no es válida.",
      400,
    );
  }

  return {
    subject,
    durationSeconds,
    reminderMinutesBefore,
  };
}

function getParticipantRows(
  tenantId: string,
  activityId: string,
  participants:
    ParticipantPayload[],
) {
  return participants.map(
    (participant) => {
      const name =
        getOptionalString(
          participant.name,
        );

      if (!name) {
        throw new ApiError(
          "El nombre de cada participante es obligatorio.",
          400,
        );
      }

      const reminderMinutesBefore =
        getOptionalInteger(
          participant
            .reminderMinutesBefore,
        );

      if (
        reminderMinutesBefore !==
          undefined &&
        reminderMinutesBefore < 0
      ) {
        throw new ApiError(
          "El recordatorio del participante no puede ser negativo.",
          400,
        );
      }

      return {
        tenantId,
        activityId,

        participantType:
          getOptionalString(
            participant
              .participantType,
          ) ?? "external",

        referenceId:
          getOptionalString(
            participant.referenceId,
          ) ?? null,

        name,

        email:
          getOptionalString(
            participant.email,
          ) ?? null,

        phone:
          getOptionalString(
            participant.phone,
          ) ?? null,

        responseStatus:
          getOptionalString(
            participant
              .responseStatus,
          ) ?? "Pendiente",

        reminderMinutesBefore:
          reminderMinutesBefore ??
          null,
      };
    },
  );
}

function createErrorResponse(
  error: unknown,
  fallback: string,
) {
  if (error instanceof ApiError) {
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

  console.error(fallback, error);

  return NextResponse.json(
    {
      success: false,
      error: fallback,
    },
    {
      status: 500,
    },
  );
}

function serializeActivity(
  activity:
    typeof crmActivities.$inferSelect,
  participants:
    Array<
      typeof crmActivityParticipants.$inferSelect
    >,
  relations: {
    leadName?: string | null;
    customerName?: string | null;
    dealName?: string | null;
  } = {},
) {
  const relatedType =
    activity.leadId
      ? "lead"
      : activity.customerId
        ? "customer"
        : activity.dealId
          ? "deal"
          : null;

  const relatedId =
    activity.leadId ??
    activity.customerId ??
    activity.dealId;

  const relatedName =
    relations.leadName ??
    relations.customerName ??
    relations.dealName ??
    null;

  return {
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    description:
      activity.description,
    status: activity.status,
    priority: activity.priority,

    ownerClerkUserId:
      activity.ownerClerkUserId,

    owner: {
      id:
        activity.ownerClerkUserId,
      name:
        activity.ownerName,
      email:
        activity.ownerEmail,
    },

    leadId: activity.leadId,
    customerId:
      activity.customerId,
    dealId: activity.dealId,

    relatedType,
    relatedId,
    relatedName,

    startAt:
      activity.startAt
        ?.toISOString() ?? null,

    endAt:
      activity.endAt
        ?.toISOString() ?? null,

    dueAt:
      activity.dueAt
        ?.toISOString() ?? null,

    completedAt:
      activity.completedAt
        ?.toISOString() ?? null,

    allDay: activity.allDay,
    timezone:
      activity.timezone,

    reminderEnabled:
      activity.reminderEnabled,

    reminderMinutesBefore:
      activity
        .reminderMinutesBefore,

    recurrence:
      activity.recurrence,

    callMode:
      activity.callMode,

    callDirection:
      activity.callDirection,

    callPurpose:
      activity.callPurpose,

    callResult:
      activity.callResult,

    callDurationSeconds:
      activity
        .callDurationSeconds,

    recordingUrl:
      activity.recordingUrl,

    meetingLocationType:
      activity
        .meetingLocationType,

    location:
      activity.location,

    meetingUrl:
      activity.meetingUrl,

    participants:
      participants.map(
        (participant) => ({
          id: participant.id,
          participantType:
            participant
              .participantType,
          referenceId:
            participant.referenceId,
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          responseStatus:
            participant
              .responseStatus,
          reminderMinutesBefore:
            participant
              .reminderMinutesBefore,
        }),
      ),

    createdTime:
      activity.createdAt
        .toISOString(),

    modifiedTime:
      activity.updatedAt
        .toISOString(),
  };
}

export async function GET(
  request: Request,
) {
  try {
    const {
      tenantId,
    } = await getTenantContext();

    const url = new URL(
      request.url,
    );

    const requestedType =
      getOptionalString(
        url.searchParams.get(
          "type",
        ),
      );

    if (
      requestedType &&
      requestedType !== "task" &&
      requestedType !== "call" &&
      requestedType !== "meeting"
    ) {
      throw new ApiError(
        "El filtro de tipo de actividad no es válido.",
        400,
      );
    }

    const whereClause =
      requestedType
        ? and(
            eq(
              crmActivities.tenantId,
              tenantId,
            ),
            eq(
              crmActivities.type,
              requestedType,
            ),
          )
        : eq(
            crmActivities.tenantId,
            tenantId,
          );

    const records = await db
      .select({
        activity: crmActivities,

        leadFirstName:
          crmLeads.firstName,
        leadLastName:
          crmLeads.lastName,
        leadEmail:
          crmLeads.email,

        customerType:
          crmCustomers.customerType,
        customerName:
          crmCustomers.name,
        customerLastName:
          crmCustomers.lastName,
        customerCompanyName:
          crmCustomers.companyName,

        dealName:
          crmDeals.name,
      })
      .from(crmActivities)
      .leftJoin(
        crmLeads,
        and(
          eq(
            crmActivities.leadId,
            crmLeads.id,
          ),
          eq(
            crmLeads.tenantId,
            tenantId,
          ),
        ),
      )
      .leftJoin(
        crmCustomers,
        and(
          eq(
            crmActivities.customerId,
            crmCustomers.id,
          ),
          eq(
            crmCustomers.tenantId,
            tenantId,
          ),
        ),
      )
      .leftJoin(
        crmDeals,
        and(
          eq(
            crmActivities.dealId,
            crmDeals.id,
          ),
          eq(
            crmDeals.tenantId,
            tenantId,
          ),
        ),
      )
      .where(whereClause)
      .orderBy(
        asc(crmActivities.startAt),
        asc(crmActivities.dueAt),
        desc(
          crmActivities.createdAt,
        ),
      );

    const activityIds =
      records.map(
        (record) =>
          record.activity.id,
      );

    const participantRecords =
      activityIds.length > 0
        ? await db
            .select()
            .from(
              crmActivityParticipants,
            )
            .where(
              and(
                eq(
                  crmActivityParticipants
                    .tenantId,
                  tenantId,
                ),
                inArray(
                  crmActivityParticipants
                    .activityId,
                  activityIds,
                ),
              ),
            )
            .orderBy(
              asc(
                crmActivityParticipants
                  .name,
              ),
            )
        : [];

    const participantsByActivity =
      new Map<
        string,
        typeof participantRecords
      >();

    for (
      const participant of
      participantRecords
    ) {
      const participants =
        participantsByActivity.get(
          participant.activityId,
        ) ?? [];

      participants.push(
        participant,
      );

      participantsByActivity.set(
        participant.activityId,
        participants,
      );
    }

    const data = records.map(
      (record) => {
        const leadName = [
          record.leadFirstName,
          record.leadLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        const personName = [
          record.customerName,
          record.customerLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        const customerName =
          record.customerType ===
          "Empresa"
            ? record
                .customerCompanyName ??
              personName
            : personName;

        return serializeActivity(
          record.activity,

          participantsByActivity.get(
            record.activity.id,
          ) ?? [],

          {
            leadName:
              leadName ||
              record.leadEmail,

            customerName:
              customerName ||
              null,

            dealName:
              record.dealName,
          },
        );
      },
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        count: data.length,
      },
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible cargar las actividades.",
    );
  }
}

type ActivityInsert =
  typeof crmActivities.$inferInsert;

function getInsertValues(
  tenantId: string,
  type: ActivityType,
  values: ActivityPayload,
  owner: {
    id: string;
    name: string;
    email: string;
  },
  relationship: {
    leadId: string | null;
    customerId: string | null;
    dealId: string | null;
  },
  dates: {
    startAt: Date | null;
    endAt: Date | null;
    dueAt: Date | null;
    completedAt: Date | null;
  },
  validation: {
    subject: string;
    durationSeconds:
      | number
      | undefined;
    reminderMinutesBefore:
      | number
      | undefined;
  },
): ActivityInsert {
  const callMode =
    getOptionalString(
      values.callMode,
    );

  const requestedStatus =
    getOptionalString(
      values.status,
    );

  const defaultStatus =
    type === "call" &&
    callMode === "logged"
      ? "Completada"
      : type === "call" ||
          type === "meeting"
        ? "Programada"
        : "No iniciada";

  const completedAt =
    dates.completedAt ??
    (
      requestedStatus ===
        "Completada" ||
      (
        type === "call" &&
        callMode === "logged"
      )
        ? new Date()
        : null
    );

  return {
    tenantId,
    type,

    subject:
      validation.subject,

    description:
      getOptionalString(
        values.description,
      ) ?? null,

    status:
      requestedStatus ??
      defaultStatus,

    priority:
      getOptionalString(
        values.priority,
      ) ?? "Normal",

    ownerClerkUserId:
      owner.id,

    ownerName:
      owner.name,

    ownerEmail:
      owner.email,

    leadId:
      relationship.leadId,

    customerId:
      relationship.customerId,

    dealId:
      relationship.dealId,

    startAt:
      dates.startAt,

    endAt:
      dates.endAt,

    dueAt:
      dates.dueAt,

    completedAt,

    allDay:
      getBoolean(
        values.allDay,
      ),

    timezone:
      getOptionalString(
        values.timezone,
      ) ??
      "America/Mexico_City",

    reminderEnabled:
      getBoolean(
        values.reminderEnabled,
      ),

    reminderMinutesBefore:
      validation
        .reminderMinutesBefore ??
      null,

    recurrence:
      (
        isRecord(
          values.recurrence,
        )
          ? values.recurrence
          : {}
      ) as ActivityInsert[
        "recurrence"
      ],

    callMode:
      type === "call"
        ? callMode ?? null
        : null,

    callDirection:
      type === "call"
        ? getOptionalString(
            values.callDirection,
          ) ?? null
        : null,

    callPurpose:
      type === "call"
        ? getOptionalString(
            values.callPurpose,
          ) ?? null
        : null,

    callResult:
      type === "call"
        ? getOptionalString(
            values.callResult,
          ) ?? null
        : null,

    callDurationSeconds:
      type === "call"
        ? validation
            .durationSeconds ??
          null
        : null,

    recordingUrl:
      type === "call"
        ? getOptionalString(
            values.recordingUrl,
          ) ?? null
        : null,

    meetingLocationType:
      type === "meeting"
        ? getOptionalString(
            values
              .meetingLocationType,
          ) ?? null
        : null,

    location:
      type === "meeting"
        ? getOptionalString(
            values.location,
          ) ?? null
        : null,

    meetingUrl:
      type === "meeting"
        ? getOptionalString(
            values.meetingUrl,
          ) ?? null
        : null,

    updatedAt: new Date(),
  };
}

export async function POST(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
    } = await getTenantContext();

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as ActivityPayload;

    const type =
      getActivityType(
        values.type,
      );

    const validation =
      validateActivity(
        type,
        values,
      );

    const owner =
      await getOwner(
        tenantId,
        userId,
        values.ownerClerkUserId,
      );

    const relationship =
      await validateRelationship(
        tenantId,
        values,
      );

    const dates =
      getActivityDates(
        type,
        values,
      );

    await validateScheduleConflict(
      tenantId,
      owner.id,
      type,
      dates.startAt,
      dates.endAt,
    );

    const participants =
      getParticipants(
        values.participants,
      );

    const activityId =
      crypto.randomUUID();

    const participantRows =
      getParticipantRows(
        tenantId,
        activityId,
        participants,
      );

    const [activity] = await db
      .insert(crmActivities)
      .values({
        id: activityId,

        ...getInsertValues(
          tenantId,
          type,
          values,
          owner,
          relationship,
          dates,
          validation,
        ),
      })
      .returning();

    if (
      participantRows.length > 0
    ) {
      await db
        .insert(
          crmActivityParticipants,
        )
        .values(participantRows);
    }

    return NextResponse.json(
      {
        success: true,

        message:
          type === "task"
            ? "La tarea fue creada correctamente."
            : type === "call"
              ? "La llamada fue guardada correctamente."
              : "La reunión fue creada correctamente.",

        data:
          serializeActivity(
            activity,
            [],
          ),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible crear la actividad.",
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const {
      tenantId,
      userId,
    } = await getTenantContext();

    const requestBody: unknown =
      await request.json();

    if (!isRecord(requestBody)) {
      throw new ApiError(
        "La información enviada no tiene un formato válido.",
        400,
      );
    }

    const values =
      requestBody as ActivityPayload;

    const activityId =
      getOptionalString(values.id);

    if (!activityId) {
      throw new ApiError(
        "No fue posible identificar la actividad.",
        400,
      );
    }

    const [currentActivity] =
      await db
        .select()
        .from(crmActivities)
        .where(
          and(
            eq(
              crmActivities.id,
              activityId,
            ),
            eq(
              crmActivities.tenantId,
              tenantId,
            ),
          ),
        )
        .limit(1);

    if (!currentActivity) {
      throw new ApiError(
        "La actividad no existe o no pertenece a la empresa.",
        404,
      );
    }

    const type =
      getActivityType(
        values.type ??
          currentActivity.type,
      );

    const validation =
      validateActivity(
        type,
        values,
      );

    const owner =
      await getOwner(
        tenantId,
        userId,
        values.ownerClerkUserId ??
          currentActivity
            .ownerClerkUserId,
      );

    const relationship =
      await validateRelationship(
        tenantId,
        values,
      );

    const dates =
      getActivityDates(
        type,
        values,
      );

    await validateScheduleConflict(
      tenantId,
      owner.id,
      type,
      dates.startAt,
      dates.endAt,
      activityId,
    );

    const participants =
      getParticipants(
        values.participants,
      );

    const participantRows =
      getParticipantRows(
        tenantId,
        activityId,
        participants,
      );

    const [activity] = await db
      .update(crmActivities)
      .set(
        getInsertValues(
          tenantId,
          type,
          values,
          owner,
          relationship,
          dates,
          validation,
        ),
      )
      .where(
        and(
          eq(
            crmActivities.id,
            activityId,
          ),
          eq(
            crmActivities.tenantId,
            tenantId,
          ),
        ),
      )
      .returning();

    await db
      .delete(
        crmActivityParticipants,
      )
      .where(
        and(
          eq(
            crmActivityParticipants
              .activityId,
            activityId,
          ),
          eq(
            crmActivityParticipants
              .tenantId,
            tenantId,
          ),
        ),
      );

    if (
      participantRows.length > 0
    ) {
      await db
        .insert(
          crmActivityParticipants,
        )
        .values(participantRows);
    }

    return NextResponse.json({
      success: true,
      message:
        "La actividad fue actualizada correctamente.",
      data:
        serializeActivity(
          activity,
          [],
        ),
    });
  } catch (error) {
    return createErrorResponse(
      error,
      "No fue posible actualizar la actividad.",
    );
  }
}
