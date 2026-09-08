import {auth} from "@clerk/nextjs/server";
import {and,asc,eq,inArray} from "drizzle-orm";
import {NextResponse} from "next/server";
import {db} from "@/db";
import {tenants,tenantBranches} from "@/db/schema";
import {getCRMBranchAccess,validateCRMBranchId,CRMBranchAccessError} from "@/lib/crm/branch-access";
import {activeBranchCookie,getActiveCRMBranch} from "@/lib/crm/active-branch";
import {PetApiError} from "@/lib/crm/pet-api-context";
async function context() {
  const {userId,orgId}=await auth();if(!userId||!orgId)throw new PetApiError("Inicia sesión y selecciona una empresa.",401);
  const [tenant]=await db.select({id:tenants.id}).from(tenants).where(eq(tenants.clerkOrganizationId,orgId)).limit(1);
  if(!tenant)throw new PetApiError("La empresa no está disponible.",404);
  return {userId,tenantId:tenant.id,access:await getCRMBranchAccess(tenant.id,userId,true)};
}
function fail(error:unknown){if(error instanceof PetApiError||error instanceof CRMBranchAccessError)return NextResponse.json({success:false,error:error.message},{status:error.status});console.error("Sucursal activa:",error);return NextResponse.json({success:false,error:"No fue posible seleccionar la sucursal."},{status:500});}
export async function GET(request:Request){try{const ctx=await context();const selected=await getActiveCRMBranch(ctx.tenantId,ctx.userId);const only=new URL(request.url).searchParams.get("selectedOnly")==="1";const branches=await db.select({value:tenantBranches.id,label:tenantBranches.name}).from(tenantBranches).where(and(eq(tenantBranches.tenantId,ctx.tenantId),eq(tenantBranches.active,true),ctx.access.allBranches?undefined:inArray(tenantBranches.id,ctx.access.branchIds),only?eq(tenantBranches.id,selected):undefined)).orderBy(asc(tenantBranches.name));return NextResponse.json({success:true,data:branches,activeBranchId:selected});}catch(error){return fail(error);}}
export async function POST(request:Request){try{const ctx=await context();const payload=await request.json() as {branchId?:unknown};if(typeof payload.branchId!=="string"||!payload.branchId)throw new PetApiError("Selecciona una sucursal.",400);const branchId=await validateCRMBranchId(ctx.tenantId,ctx.access,payload.branchId);const response=NextResponse.json({success:true,data:{branchId}});response.cookies.set(activeBranchCookie(ctx.tenantId,ctx.userId),branchId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:86400*30});return response;}catch(error){return fail(error);}}
