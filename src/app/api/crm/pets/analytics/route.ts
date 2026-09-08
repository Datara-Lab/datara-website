import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenantBranches } from "@/db/schema";
import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { getPetApiContext, PetApiError, createPetApiErrorResponse } from "@/lib/crm/pet-api-context";
import { CRMPermissionError, requireCRMModulePermission } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";
type Event={day:string;kind:string;petId:string;customerId:string;hours:number|null};
export async function GET(request:Request){
 try {
  const {tenantId,userId}=await getPetApiContext("crm-analytics","view");
  const branchId=await getActiveCRMBranch(tenantId,userId);
  const [branch]=await db.select({name:tenantBranches.name,timezone:tenantBranches.timezone}).from(tenantBranches)
    .where(and(eq(tenantBranches.id,branchId),eq(tenantBranches.tenantId,tenantId))).limit(1);
  const timezone=branch.timezone||"America/Mexico_City";
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const params=new URL(request.url).searchParams;
  const to=params.get("to")||today,from=params.get("from")||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10);
  for(const date of [from,to])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new PetApiError("Selecciona fechas válidas.",400);
  const days=(Date.parse(to)-Date.parse(from))/86400000+1;
  if(days<1||days>366||to>today)throw new PetApiError("El periodo debe tener entre 1 y 366 días y no incluir fechas futuras.",400);
  const start=sql`(${from}::date::timestamp AT TIME ZONE ${timezone})`,end=sql`((${to}::date+1)::timestamp AT TIME ZONE ${timezone})`;
  async function allowed(module:string){try{await requireCRMModulePermission(tenantId,userId,module,"view");return true;}catch(error){if(error instanceof CRMPermissionError&&error.status===403)return false;throw error;}}
  const [stays,grooming,services,veterinary,sales]=await Promise.all(["pet-stays","pet-grooming","services","pet-veterinary","sales-orders"].map(allowed));
  const enabled=[...(stays?["daycare","boarding"]:[]),...(grooming&&services?["grooming"]:[]),...(veterinary?["veterinary"]:[])];
  const events:Event[]=[];
  if(stays){const result=await db.execute<Event>(sql`SELECT to_char(r.checked_out_at AT TIME ZONE ${timezone},'YYYY-MM-DD') AS day,r.service_type AS kind,r.pet_id AS "petId",r.customer_id AS "customerId",
    (EXTRACT(EPOCH FROM (r.checked_out_at-COALESCE(r.checked_in_at,r.starts_at)))/3600)::float AS hours
    FROM pet_reservations r WHERE r.tenant_id=${tenantId} AND r.branch_id=${branchId} AND r.status='checked_out' AND r.service_type IN ('daycare','boarding')
    AND r.checked_out_at>=${start} AND r.checked_out_at<${end}`);events.push(...result.rows);}
  if(grooming&&services){const result=await db.execute<Event>(sql`SELECT to_char(COALESCE(s.work_completed_at,s.completed_at) AT TIME ZONE ${timezone},'YYYY-MM-DD') AS day,'grooming' AS kind,p.id AS "petId",s.customer_id AS "customerId",NULL::float AS hours
    FROM crm_service_orders s JOIN crm_pets p ON p.id::text=s.unit_identifier AND p.tenant_id=s.tenant_id
    WHERE s.tenant_id=${tenantId} AND s.branch_id=${branchId} AND s.status IN ('Pendiente de cierre','Completada')
    AND COALESCE(s.work_completed_at,s.completed_at)>=${start} AND COALESCE(s.work_completed_at,s.completed_at)<${end}`);events.push(...result.rows);}
  if(veterinary){const result=await db.execute<Event>(sql`SELECT to_char(v.created_at AT TIME ZONE ${timezone},'YYYY-MM-DD') AS day,'veterinary' AS kind,v.pet_id AS "petId",v.customer_id AS "customerId",NULL::float AS hours
    FROM pet_clinical_visits v WHERE v.tenant_id=${tenantId} AND v.branch_id=${branchId} AND v.created_at>=${start} AND v.created_at<${end}`);events.push(...result.rows);}
  const counts=Object.fromEntries(enabled.map(kind=>[kind,events.filter(event=>event.kind===kind).length]));
  const daily=Array.from({length:days},(_,index)=>{const day=new Date(Date.parse(from)+index*86400000).toISOString().slice(0,10);return{day,count:events.filter(event=>event.day===day).length};});
  const customers=new Map<string,number>();for(const event of events)if(event.customerId)customers.set(event.customerId,(customers.get(event.customerId)||0)+1);
  const duration=events.filter(event=>event.kind==='daycare'&&event.hours!==null&&event.hours>=0);
  let payments:Array<{currency:string;total:string;count:number;method:string}>=[];
  if(sales){const result=await db.execute<{currency:string;total:string;count:number;method:string}>(sql`SELECT upper(p.currency) AS currency,SUM(p.amount)::text AS total,COUNT(*)::int AS count,COALESCE(p.payment_method,'Sin especificar') AS method
    FROM commercial_payments p WHERE p.tenant_id=${tenantId} AND p.branch_id=${branchId} AND p.status='received' AND p.received_at>=${start} AND p.received_at<${end}
    GROUP BY upper(p.currency),COALESCE(p.payment_method,'Sin especificar') ORDER BY upper(p.currency),method`);payments=result.rows;}
  let packages:Array<{unit:string;consumed:number}>=[];
  if(stays){const result=await db.execute<{unit:string;consumed:number}>(sql`SELECT a.unit_type AS unit,SUM(e.consumed_delta)::int AS consumed
    FROM pet_package_ledger_entries e JOIN pet_package_accounts a ON a.id=e.package_account_id AND a.tenant_id=e.tenant_id
    JOIN pet_reservations r ON r.id=e.reservation_id AND r.tenant_id=e.tenant_id
    WHERE e.tenant_id=${tenantId} AND r.branch_id=${branchId} AND e.created_at>=${start} AND e.created_at<${end}
    GROUP BY a.unit_type ORDER BY a.unit_type`);packages=result.rows;}
  return NextResponse.json({success:true,data:{branch:branch.name,timezone,from,to,counts,daily,total:events.length,pets:new Set(events.map(event=>event.petId)).size,
    returningTutors:[...customers.values()].filter(count=>count>=2).length,tutors:customers.size,averageDaycareHours:duration.length?duration.reduce((sum,event)=>sum+Number(event.hours),0)/duration.length:null,
    payments:sales?payments:null,packages:stays?packages:null,updatedAt:new Date().toISOString()}},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return createPetApiErrorResponse(error,"No fue posible consultar Analytics Pets.");}
}
