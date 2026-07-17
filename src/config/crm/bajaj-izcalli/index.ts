import type { CRMTenantConfig } from "@/types/crm-config";

import {
  bajajIzcalliNavigation,
  bajajIzcalliNavigationSections,
} from "./navigation";

import { bajajIzcalliModules } from "./modules";

export const bajajIzcalliCRMConfig: CRMTenantConfig = {
  tenantId: "bajaj-izcalli",
  tenantName: "Bajaj Izcalli",

  /*
   * Se agregará cuando guardemos las conexiones
   * multiempresa de Zoho en el backend.
   */
  zohoOrganizationId: undefined,

  navigationSections:
    bajajIzcalliNavigationSections,

  navigation:
    bajajIzcalliNavigation,

  modules:
    bajajIzcalliModules,

  /*
   * Los pipelines volverán a conectarse cuando
   * creemos el archivo pipelines.ts definitivo.
   */
  pipelines: [],
};

export default bajajIzcalliCRMConfig;