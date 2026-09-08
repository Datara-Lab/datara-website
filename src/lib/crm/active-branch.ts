import {cookies} from "next/headers";
import {getCRMBranchAccess,validateCRMBranchId} from "@/lib/crm/branch-access";
import {PetApiError} from "@/lib/crm/pet-api-context";
export function activeBranchCookie(tenantId:string,userId:string) {return `datara_branch_${tenantId}_${userId}`;}
export async function getActiveCRMBranch(tenantId:string,userId:string,expectedBranchId?:string|null) {
  const access=await getCRMBranchAccess(tenantId,userId,true);
  const selected=(await cookies()).get(activeBranchCookie(tenantId,userId))?.value;
  const branchId=await validateCRMBranchId(tenantId,access,selected || access.primaryBranchId);
  if(expectedBranchId !== undefined && expectedBranchId !== branchId) throw new PetApiError("La operación no pertenece a la sucursal activa. Cambia de sucursal para continuar.",409);
  return branchId;
}
