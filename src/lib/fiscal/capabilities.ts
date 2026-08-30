export type FiscalCapability =
  | "invoice_control"
  | "cfdi_stamping";

export type TenantFiscalCapabilities = {
  invoiceControlEnabled: boolean;
  cfdiStampingEnabled: boolean;
  includedStamps: number;
  additionalStampBalance: number;
};

export const EMPTY_FISCAL_CAPABILITIES:
  TenantFiscalCapabilities = {
    invoiceControlEnabled: false,
    cfdiStampingEnabled: false,
    includedStamps: 0,
    additionalStampBalance: 0,
  };

export function hasFiscalCapability(
  capabilities: TenantFiscalCapabilities,
  capability: FiscalCapability,
) {
  return capability === "invoice_control"
    ? capabilities.invoiceControlEnabled
    : capabilities.cfdiStampingEnabled;
}
