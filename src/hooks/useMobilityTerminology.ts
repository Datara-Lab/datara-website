"use client";

import { useCRMConfig } from "@/hooks/useCRMConfig";
import { resolveMobilityProfile } from "@/config/crm/industries/mobility-profiles";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function useMobilityTerminology() {
  const { industry, industryProfile } = useCRMConfig();
  const profile = resolveMobilityProfile(industryProfile);
  const isMobility = industry === "motorcycle_dealership";
  const vehicleSingular = isMobility ? profile.vehicleSingular : "unidad";
  const vehiclePlural = isMobility ? profile.vehiclePlural : "unidades";
  const itemSingular = profile.id === "motorcycle" ? "modelo" : vehicleSingular;
  const itemPlural = profile.id === "motorcycle" ? "modelos" : vehiclePlural;

  return {
    profile,
    vehicleSingular,
    vehiclePlural,
    vehicleSingularLabel: capitalize(vehicleSingular),
    vehiclePluralLabel: capitalize(vehiclePlural),
    itemSingular,
    itemPlural,
    itemSingularLabel: capitalize(itemSingular),
    itemPluralLabel: capitalize(itemPlural),
    operationLabel: `Operación de ${vehicleSingular}`,
    workshopDescription: `Administra las órdenes de taller y el seguimiento de ${vehiclePlural}.`,
    searchPlaceholder: `Buscar orden, cliente o ${vehicleSingular}...`,
    modelPlaceholder: `Escribe ${profile.id === "motorcycle" ? "el modelo de la motocicleta" : `la ${vehicleSingular}`}`,
    identifierLabel: profile.id === "motorcycle" ? "NIV" : "Número de serie",
    identifierPlaceholder: profile.id === "motorcycle"
      ? "Captura el NIV completo de la motocicleta"
      : `Captura el número de serie de la ${vehicleSingular}`,
  };
}
