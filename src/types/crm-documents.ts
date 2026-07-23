export type CRMDocumentStatus =
  | "active"
  | "archived";

export type CRMDocumentRelation = {
  id: string;

  entityType: string;
  entityId: string;
  entityName?: string | null;
};

export type CRMDocumentRecord = {
  id: string;

  name: string;
  originalFileName: string;

  description?: string | null;
  category: string;

  mimeType: string;
  extension?: string | null;
  sizeBytes: number;

  status: CRMDocumentStatus;
  version: number;

  uploadedByClerkUserId: string;

  uploadedByName?: string | null;
  uploadedByEmail?: string | null;

  relations:
    CRMDocumentRelation[];

  createdTime: string;
  modifiedTime: string;
  archivedTime?: string | null;
};

export type CRMDocumentUploadResponse = {
  success: boolean;

  data?: CRMDocumentRecord;
  error?: string;
};

export type CRMDocumentListResponse = {
  success: boolean;

  data?: CRMDocumentRecord[];

  meta?: {
    count: number;
  };

  error?: string;
};

export type CRMDocumentRelationOption = {
  id: string;
  type: string;
  label: string;
};

export const CRM_DOCUMENT_CATEGORIES = [
  "Identificación",
  "Comprobante",
  "Contrato",
  "Cotización",
  "Factura",
  "Propuesta comercial",
  "Documento interno",
  "Imagen",
  "Otro",
] as const;
