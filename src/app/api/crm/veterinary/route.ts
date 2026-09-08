import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  crmPets,
  crmCustomers,
  crmProducts,
  tenantBranches,
} from "@/db/schema";
import { getActiveCRMBranch } from "@/lib/crm/active-branch";
import { getPetApiContext, PetApiError, createPetApiErrorResponse } from "@/lib/crm/pet-api-context";
import { requireCRMModulePermission, CRMPermissionError } from "@/lib/crm/permissions";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET() {
  try {
    const { tenantId, userId } = await getPetApiContext("pet-veterinary", "view");
    const branchId = await getActiveCRMBranch(tenantId, userId);
    const [branch] = await db
      .select({
        timezone: tenantBranches.timezone,
      })
      .from(tenantBranches)
      .where(
        and(
          eq(tenantBranches.tenantId, tenantId),
          eq(tenantBranches.id, branchId),
        ),
      )
      .limit(1);

    const timezone =
      branch?.timezone ||
      "America/Mexico_City";
    await requireCRMModulePermission(tenantId, userId, "contacts", "view");
    let canReadSales = false;
    try { await requireCRMModulePermission(tenantId,userId,"sales-orders","view"); canReadSales=true; }
    catch(error) { if (!(error instanceof CRMPermissionError)) throw error; }
    let canCreate = false;
    try { await requireCRMModulePermission(tenantId, userId, "pet-veterinary", "create"); canCreate = true; }
    catch(error) { if (!(error instanceof CRMPermissionError)) throw error; }
    const pets = await db.select({ id: crmPets.id, name: crmPets.name, species: crmPets.species, tutor: crmCustomers.name })
      .from(crmPets).innerJoin(crmCustomers, and(eq(crmCustomers.id, crmPets.customerId), eq(crmCustomers.tenantId, tenantId)))
      .where(and(eq(crmPets.tenantId, tenantId), eq(crmPets.status, "active")));
    const visits = await db.execute(sql`SELECT v.id,v.pet_id AS "petId",p.name AS "petName",v.reason,v.clinician,v.details,
      v.follow_up_date AS "followUpDate",v.created_at AS "createdAt",v.sales_order_id AS "salesOrderId",
      o.reference AS "orderReference",o.total_amount AS "orderTotal",o.currency,
      GREATEST(0,o.total_amount-COALESCE((SELECT SUM(pay.amount) FROM commercial_payments pay WHERE pay.tenant_id=v.tenant_id AND pay.sales_order_id=o.id AND pay.status='received'),0)) AS balance
      FROM pet_clinical_visits v JOIN crm_pets p ON p.id=v.pet_id AND p.tenant_id=v.tenant_id
      LEFT JOIN crm_sales_orders o ON o.id=v.sales_order_id AND o.tenant_id=v.tenant_id
      WHERE v.tenant_id=${tenantId} AND v.branch_id=${branchId} ORDER BY v.created_at DESC,v.id DESC LIMIT 200`);
    let products: Array<{id:string;name:string;unitPrice:string;currency:string}> = [];
    try {
      await requireCRMModulePermission(tenantId, userId, "products", "view");
      products = await db.select({id:crmProducts.id,name:crmProducts.name,unitPrice:crmProducts.unitPrice,currency:crmProducts.currency})
        .from(crmProducts).where(and(eq(crmProducts.tenantId,tenantId),eq(crmProducts.active,true),eq(crmProducts.category,"Consulta")));
    } catch(error) { if (!(error instanceof CRMPermissionError)) throw error; }
    const visibleVisits=visits.rows.map(row=>canReadSales?row:{...row,salesOrderId:null,orderReference:null,orderTotal:null,balance:null,currency:null});
    return NextResponse.json(
      {
        success: true,
        data: {
          pets,
          visits: visibleVisits,
          products,
          canCreate,
          branchId,
          timezone,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch(error) {return createPetApiErrorResponse(error,"No fue posible cargar Veterinaria.");}
}

export async function POST(request: Request) {
  try {
    const {tenantId,userId}=await getPetApiContext("pet-veterinary","create");
    await requireCRMModulePermission(tenantId,userId,"contacts","view");
    const body=await request.json() as Record<string,unknown>;
    const branchId=await getActiveCRMBranch(tenantId,userId,typeof body.branchId === "string" ? body.branchId : null);
    const id=String(body.id || ""),petId=String(body.petId || "");
    if(!uuid.test(id)||!uuid.test(petId))throw new PetApiError("Selecciona una mascota válida.",400);
    function text(key:string,required=false){const value=typeof body[key]==="string"?(body[key] as string).trim():"";
      if((required&&!value)||value.length>10000)throw new PetApiError(`Revisa el campo ${key}.`,400);return value;}
    const reason=text("reason",true),clinician=text("clinician",true),followUpDate=text("followUpDate");
    if(followUpDate && (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)||Number.isNaN(Date.parse(followUpDate))||new Date(followUpDate).toISOString().slice(0,10)!==followUpDate))throw new PetApiError("La fecha de revisión no es válida.",400);
    const details:Record<string,unknown>={};
    for(const key of ["diagnosis","treatment","instructions","vaccines","nextVaccineDate","notes"])details[key]=text(key);
    const vaccineDate=String(details.nextVaccineDate||"");
    if(vaccineDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(vaccineDate)||Number.isNaN(Date.parse(vaccineDate))||new Date(vaccineDate).toISOString().slice(0,10)!==vaccineDate))throw new PetApiError("La fecha de próxima vacuna no es válida.",400);
    for(const key of ["weightKg","temperatureC","heartRate","respiratoryRate"]){const raw=text(key);const value=raw?Number(raw):null;
      if(value!==null&&(!Number.isFinite(value)||value<=0))throw new PetApiError("Los signos y el peso deben ser números positivos.",400);details[key]=value;}
    const [pet]=await db.select({customerId:crmPets.customerId,name:crmPets.name,tutor:crmCustomers.name}).from(crmPets)
      .innerJoin(crmCustomers,and(eq(crmCustomers.id,crmPets.customerId),eq(crmCustomers.tenantId,tenantId)))
      .where(and(eq(crmPets.id,petId),eq(crmPets.tenantId,tenantId),eq(crmPets.status,"active"))).limit(1);
    if(!pet)throw new PetApiError("La mascota no está activa o no pertenece a esta empresa.",404);
    const productId=text("productId");
    let product: {id:string;name:string;unitPrice:string;currency:string}|undefined;
    if(productId){
      await requireCRMModulePermission(tenantId,userId,"products","view");
      await requireCRMModulePermission(tenantId,userId,"sales-orders","create");
      [product]=await db.select({id:crmProducts.id,name:crmProducts.name,unitPrice:crmProducts.unitPrice,currency:crmProducts.currency}).from(crmProducts)
        .where(and(eq(crmProducts.id,productId),eq(crmProducts.tenantId,tenantId),eq(crmProducts.active,true),eq(crmProducts.category,"Consulta"))).limit(1);
      if(!product || Number(product.unitPrice)<=0)throw new PetApiError("Selecciona una consulta activa con precio mayor a cero.",400);
    }
    const orderId=crypto.randomUUID(),reference=`VET-${Date.now().toString(36).toUpperCase()}-${id.slice(0,6).toUpperCase()}`;
    // One SQL statement: clinical entry, order and line either all persist or none do.
    const result=await db.execute(sql`WITH visit AS (
      INSERT INTO pet_clinical_visits(id,tenant_id,branch_id,pet_id,customer_id,reason,clinician,details,follow_up_date,created_by,sales_order_id)
      VALUES(${id}::uuid,${tenantId}::uuid,${branchId}::uuid,${petId}::uuid,${pet.customerId}::uuid,${reason},${clinician},${JSON.stringify(details)}::jsonb,${followUpDate||null}::date,${userId},${product?orderId:null}::uuid)
      ON CONFLICT(id) DO NOTHING RETURNING id
    ), ord AS (
      INSERT INTO crm_sales_orders(id,tenant_id,branch_id,customer_id,reference,status,customer_name,currency,base_amount,total_amount,created_by_clerk_user_id,metadata)
      SELECT ${orderId}::uuid,${tenantId}::uuid,${branchId}::uuid,${pet.customerId}::uuid,${reference},'Confirmada',${pet.tutor},${product?.currency||"mxn"},${product?.unitPrice||"0"}::numeric,${product?.unitPrice||"0"}::numeric,${userId},
        ${JSON.stringify({sourceProduct:"crm",sourceType:"pet_veterinary",sourceId:id,petId})}::jsonb FROM visit WHERE ${Boolean(product)} RETURNING id
    ), line AS (
      INSERT INTO crm_sales_order_items(tenant_id,sales_order_id,product_id,name,quantity,unit_price,total_amount,position)
      SELECT ${tenantId}::uuid,ord.id,${product?.id||null}::uuid,${product?.name||"Consulta"},1,${product?.unitPrice||"0"}::numeric,${product?.unitPrice||"0"}::numeric,1 FROM ord RETURNING id
    ) SELECT id FROM visit`);
    // Repeated requests never create another clinical entry or another order.
    if(!result.rows.length){const existing=await db.execute(sql`SELECT id FROM pet_clinical_visits WHERE id=${id}::uuid AND tenant_id=${tenantId}::uuid AND branch_id=${branchId}::uuid AND created_by=${userId}`);
      if(!existing.rows.length)throw new PetApiError("El identificador de consulta ya existe.",409);}
    return NextResponse.json({success:true,data:{id}});
  }catch(error){return createPetApiErrorResponse(error,"No fue posible registrar la consulta.");}
}
