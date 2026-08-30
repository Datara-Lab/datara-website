import { finkokFiscalProvider } from "@/lib/fiscal/providers/finkok";

import type {
  FiscalProvider,
  FiscalProviderKey,
} from "@/lib/fiscal/types";

const providers = new Map<FiscalProviderKey, FiscalProvider>([
  [finkokFiscalProvider.key, finkokFiscalProvider],
]);

export function getFiscalProvider(key: FiscalProviderKey): FiscalProvider {
  const provider = providers.get(key);

  if (!provider) {
    throw new Error(`El proveedor fiscal ${key} no está implementado.`);
  }

  return provider;
}

export function getFiscalProviders(): FiscalProvider[] {
  return Array.from(providers.values());
}
