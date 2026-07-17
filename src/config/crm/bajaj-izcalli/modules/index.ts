import type { CRMModuleConfig } from "@/types/crm-config";

import { leadsModule } from "./leads";
import { promotionsModule } from "./promotions";

export const bajajIzcalliModules: CRMModuleConfig[] = [
  leadsModule,
  promotionsModule,
];