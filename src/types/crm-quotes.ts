export type CRMQuoteStatus =
  | "Borrador"
  | "Enviada"
  | "Aceptada"
  | "Rechazada"
  | "Vencida"
  | "Convertida"
  | "Cancelada";

export type CRMQuoteAddress = {
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  reference?: string;
};

export type CRMQuotePromotion = {
  id: string;

  promotionId?:
    | string
    | null;

  quoteItemId?:
    | string
    | null;

  scope: string;

  promotionName: string;

  promotionGroup?:
    | string
    | null;

  benefitType?:
    | string
    | null;

  paymentMethod?:
    | string
    | null;

  requiresSelection: boolean;

  promotionValue?:
    | number
    | null;

  calculatedBenefit: number;

  snapshot:
    Record<string, unknown>;
};

export type CRMQuoteItem = {
  id: string;

  productId?:
    | string
    | null;

  name: string;

  description?:
    | string
    | null;

  quantity: number;
  unitPrice: number;

  baseAmount: number;
  discountAmount: number;

  taxRate: number;
  taxAmount: number;

  totalAmount: number;

  paymentMethod?:
    | string
    | null;

  minimumDownPayment?:
    | number
    | null;

  customerDownPayment: number;

  financedAmount?:
    | number
    | null;

  financingMonths?:
    | number
    | null;

  estimatedPayment?:
    | number
    | null;

  technicalSpecifications:
    Record<string, unknown>;

  position: number;

  promotions:
    CRMQuotePromotion[];
};

export type CRMQuoteRecord = {
  id: string;

  quoteNumber: string;
  subject: string;

  branchId:
    | string
    | null;

  branchName?:
    | string
    | null;

  status: CRMQuoteStatus;

  customerId?:
    | string
    | null;

  sourceLeadId?:
    | string
    | null;

  dealId?:
    | string
    | null;

  customerName?:
    | string
    | null;

  leadName?:
    | string
    | null;

  dealName?:
    | string
    | null;

  relatedName?:
    | string
    | null;

  relatedEmail?:
    | string
    | null;

  ownerClerkUserId: string;

  owner: {
    id: string;

    name?:
      | string
      | null;

    email?:
      | string
      | null;
  };

  currency: string;

  validUntil?:
    | string
    | null;

  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  adjustmentAmount: number;
  totalAmount: number;

  paymentMethod?:
    | string
    | null;

  minimumDownPayment?:
    | number
    | null;

  customerDownPayment?:
    | number
    | null;

  financedAmount?:
    | number
    | null;

  financingMonths?:
    | number
    | null;

  estimatedPayment?:
    | number
    | null;

  billingAddress:
    CRMQuoteAddress;

  shippingAddress:
    CRMQuoteAddress;

  commercialSummary?:
    | string
    | null;

  termsAndConditions?:
    | string
    | null;

  description?:
    | string
    | null;

  items:
    CRMQuoteItem[];

  promotions:
    CRMQuotePromotion[];

  sentAt?:
    | string
    | null;

  acceptedAt?:
    | string
    | null;

  rejectedAt?:
    | string
    | null;

  convertedAt?:
    | string
    | null;

  createdTime: string;
  modifiedTime: string;
};

export type CRMQuoteItemPayload = {
  id?: string;

  productId: string;

  quantity: number;
  unitPrice?: number;

  paymentMethod?: string;

  taxRate: number;

  customerDownPayment: number;

  financingMonths?:
  | number
  | null;

  promotionIds: string[];
};

export type CRMQuotePayload = {
  id?: string;

  subject: string;

  branchId: string;

  status: CRMQuoteStatus;

  customerId?: string;
  sourceLeadId?: string;
  dealId?: string;

  ownerClerkUserId: string;

  validUntil?: string;

  adjustmentAmount: number;

  billingAddress:
    CRMQuoteAddress;

  shippingAddress:
    CRMQuoteAddress;

  commercialSummary?: string;

  termsAndConditions?: string;

  description?: string;

  items:
    CRMQuoteItemPayload[];

  generalPromotionIds:
    string[];
};

export type CRMQuoteOption = {
  id: string;
  label: string;

  email?: string | null;
  phone?: string | null;
};

export type CRMQuoteApiResponse<
  T,
> = {
  success: boolean;

  data?: T;

  error?: string;

  message?: string;

  meta?: {
    count?: number;
  };
};
