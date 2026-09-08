import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { AutomationValidationError, type AutomationRulePayload } from "@/lib/crm/automation-validation";
import { petAutomationEntities } from "@/lib/crm/pet-commercial-policy";

export async function validateAutomationIndustry(tenantId:string,payload:AutomationRulePayload){
  const [tenant]=await db.select({industry:tenants.industry}).from(tenants).where(eq(tenants.id,tenantId)).limit(1);
  if(tenant?.industry==="veterinary" && payload.enabled && !petAutomationEntities.includes(payload.entityType)){
    throw new AutomationValidationError("Pets permite automatizaciones sobre tutores, agenda y órdenes de venta. Puedes desactivar una regla heredada sin eliminarla.");
  }
}
