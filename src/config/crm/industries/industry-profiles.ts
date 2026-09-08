import {
  isMobilityProfileId,
  type MobilityProfileId,
} from "@/config/crm/industries/mobility-profiles";

import {
  isProfessionalServiceProfileId,
  type ProfessionalServiceProfileId,
} from "@/config/crm/industries/professional-service-profiles";

export type CRMIndustryProfileId =
  | MobilityProfileId
  | ProfessionalServiceProfileId;

export function resolveCRMIndustryProfile(
  industry: string,
  value: unknown,
): CRMIndustryProfileId | null {
  if (industry === "motorcycle_dealership") {
    return isMobilityProfileId(value) ? value : "motorcycle";
  }

  if (industry === "professional_services") {
    return isProfessionalServiceProfileId(value) ? value : "general";
  }

  return null;
}
