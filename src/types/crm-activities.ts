export type CRMActivityType =
  | "task"
  | "call"
  | "meeting";

export type CRMActivityView =
  | "list"
  | "kanban"
  | "calendar";

export type CRMCallMode =
  | "scheduled"
  | "logged";

export type CRMActivityParticipant = {
  id?: string;

  participantType: string;
  referenceId?: string | null;

  name: string;
  email?: string | null;
  phone?: string | null;

  responseStatus: string;

  reminderMinutesBefore?:
    | number
    | null;
};

export type CRMActivityRecord = {
  id: string;
  type: CRMActivityType;

  subject: string;
  description?: string | null;

  status: string;
  priority: string;

  ownerClerkUserId: string;

  owner: {
    id: string;
    name?: string | null;
    email?: string | null;
  };

  leadId?: string | null;
  customerId?: string | null;
  dealId?: string | null;

  relatedType?:
    | "lead"
    | "customer"
    | "deal"
    | null;

  relatedId?: string | null;
  relatedName?: string | null;

  startAt?: string | null;
  endAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;

  allDay: boolean;
  timezone: string;

  reminderEnabled: boolean;

  reminderMinutesBefore?:
    | number
    | null;

  recurrence: {
    frequency?: string;
    interval?: number;
    daysOfWeek?: number[];
    endsAt?: string | null;
    count?: number | null;
  };

  callMode?:
    | CRMCallMode
    | null;

  callDirection?: string | null;
  callPurpose?: string | null;
  callResult?: string | null;

  callDurationSeconds?:
    | number
    | null;

  recordingUrl?: string | null;

  meetingLocationType?:
    | string
    | null;

  location?: string | null;
  meetingUrl?: string | null;

  participants:
    CRMActivityParticipant[];

  createdTime: string;
  modifiedTime: string;
};

export type CRMActivityPayload = {
  id?: string;

  type: CRMActivityType;
  subject: string;

  description?: string;

  status: string;
  priority: string;

  ownerClerkUserId: string;

  leadId?: string;
  customerId?: string;
  dealId?: string;

  startAt?: string;
  endAt?: string;
  dueAt?: string;
  completedAt?: string;

  allDay: boolean;
  timezone: string;

  reminderEnabled: boolean;

  reminderMinutesBefore?:
    | number;

  recurrence:
    Record<string, unknown>;

  callMode?: CRMCallMode;
  callDirection?: string;
  callPurpose?: string;
  callResult?: string;

  callDurationSeconds?:
    | number;

  recordingUrl?: string;

  meetingLocationType?:
    | string;

  location?: string;
  meetingUrl?: string;

  participants:
    CRMActivityParticipant[];
};

export type CRMActivityOption = {
  value: string;
  label: string;

  type?: string;

  email?: string | null;
  phone?: string | null;
};

export type CRMRelatedOption = {
  id: string;

  type:
    | "lead"
    | "customer"
    | "deal";

  label: string;

  email?: string | null;
  phone?: string | null;
};
