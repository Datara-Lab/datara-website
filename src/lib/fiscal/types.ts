export type FiscalEnvironment =
  | "test"
  | "live";

export type FiscalProviderKey = string;

export type FiscalCredentialsReference = {
  provider: FiscalProviderKey;
  environment: FiscalEnvironment;
  secretReference: string;
};

export type FiscalIssuer = {
  taxId: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
};

export type FiscalReceiver = {
  taxId: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  cfdiUse: string;
  email?: string;
};

export type FiscalConceptTax = {
  tax: string;
  factorType: string;
  rateOrFee: number;
};

export type FiscalConcept = {
  internalId: string;
  productServiceCode: string;
  unitCode: string;
  quantity: number;
  description: string;
  unitAmount: number;
  discountAmount?: number;
  taxObject: string;
  transferredTaxes?: FiscalConceptTax[];
};

export type FiscalDocumentRequest = {
  idempotencyKey: string;
  series?: string;
  folio?: string;
  issuedAt: string;
  expeditionPostalCode: string;
  currency: string;
  exchangeRate?: number;
  paymentMethod: string;
  paymentForm: string;
  issuer: FiscalIssuer;
  receiver: FiscalReceiver;
  concepts: FiscalConcept[];
  relatedDocuments?: Array<{
    relationType: string;
    uuid: string;
  }>;
  metadata: Record<string, unknown>;
};

export type FiscalStampedDocument = {
  provider: FiscalProviderKey;
  providerDocumentId: string;
  uuid: string;
  status: "stamped";
  stampedAt: string;
  originalChain?: string;
  satCertificateNumber?: string;
  issuerCertificateNumber?: string;
  xml: string;
  pdf?: string;
  metadata: Record<string, unknown>;
};

export type FiscalCancellationRequest = {
  uuid: string;
  reasonCode: string;
  replacementUuid?: string;
  idempotencyKey: string;
};

export type FiscalCancellationResult = {
  provider: FiscalProviderKey;
  uuid: string;
  status:
    | "requested"
    | "cancelled"
    | "rejected"
    | "pending_acceptance";
  requestedAt: string;
  completedAt?: string;
  acknowledgment?: string;
  providerMessage?: string;
  metadata: Record<string, unknown>;
};

export type FiscalDocumentStatus = {
  provider: FiscalProviderKey;
  uuid: string;
  status:
    | "stamped"
    | "cancellation_requested"
    | "cancelled"
    | "unknown";
  providerMessage?: string;
  checkedAt: string;
  metadata: Record<string, unknown>;
};

export type FiscalCredentialValidation = {
  valid: boolean;
  issuerTaxId?: string;
  certificateExpiresAt?: string;
  message?: string;
};

export interface FiscalProvider {
  readonly key: FiscalProviderKey;
  readonly displayName: string;

  validateCredentials(
    credentials: FiscalCredentialsReference,
  ): Promise<FiscalCredentialValidation>;

  stamp(
    credentials: FiscalCredentialsReference,
    request: FiscalDocumentRequest,
  ): Promise<FiscalStampedDocument>;

  cancel(
    credentials: FiscalCredentialsReference,
    request: FiscalCancellationRequest,
  ): Promise<FiscalCancellationResult>;

  getStatus(
    credentials: FiscalCredentialsReference,
    uuid: string,
  ): Promise<FiscalDocumentStatus>;

  getXml(
    credentials: FiscalCredentialsReference,
    uuid: string,
  ): Promise<string>;

  getPdf(
    credentials: FiscalCredentialsReference,
    uuid: string,
  ): Promise<string | null>;
}
