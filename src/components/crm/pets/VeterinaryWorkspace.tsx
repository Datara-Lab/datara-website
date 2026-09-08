"use client";
import { useEffect, useState, type FormEvent } from "react";

type Visit={id:string;petId:string;petName:string;reason:string;clinician:string;details:Record<string,string|number|null>;followUpDate:string|null;createdAt:string;salesOrderId:string|null;orderReference:string|null;orderTotal:string|null;balance:string|null;currency:string|null};
type Data={branchId:string;timezone:string;canCreate:boolean;pets:Array<{id:string;name:string;species:string;tutor:string}>;visits:Visit[];products:Array<{id:string;name:string;unitPrice:string;currency:string}>};
type VeterinaryViewFilter=""|"today"|"followups"|"vaccines";
type Session={id:string;branchId:string;terminalName:string;status:string};
const field="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
async function read<T>(response:Response):Promise<T>{const body=await response.json() as {success:boolean;data:T;error?:string};if(!response.ok||!body.success)throw new Error(body.error||"No fue posible completar la operación.");return body.data;}

export default function VeterinaryWorkspace(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState(""),[petId,setPetId]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[requestId,setRequestId]=useState("");
 const [checkout,setCheckout]=useState<Visit|null>(null),[sessions,setSessions]=useState<Session[]>([]),[sessionId,setSessionId]=useState(""),[method,setMethod]=useState("cash"),[tendered,setTendered]=useState("");
 const [vetView,setVetView]=useState<VeterinaryViewFilter>("");
 useEffect(()=>{
  const controller=new AbortController();

  void fetch(
    "/api/crm/veterinary",
    {
      signal:controller.signal,
      cache:"no-store",
    },
  )
    .then(response=>read<Data>(response))
    .then(value=>{
      if(controller.signal.aborted)return;

      setData(value);
      setError("");

      const searchParams=
        new URLSearchParams(
          window.location.search,
        );

      const requested=
        searchParams.get("petId");

      if(
        requested &&
        value.pets.some(
          p=>p.id===requested,
        )
      ){
        setPetId(requested);
      }

      const requestedView=
        searchParams.get("vetView");

      if(
        requestedView==="today" ||
        requestedView==="followups" ||
        requestedView==="vaccines"
      ){
        setVetView(requestedView);
      }
    })
    .catch(cause=>{
      if(!controller.signal.aborted){
        setError(cause.message);
      }
    });

  return()=>controller.abort();
 },[revision]);
 const pets=data?.pets.filter(p=>`${p.name} ${p.tutor} ${p.species}`.toLowerCase().includes(query.toLowerCase()))||[];

 const today=data
  ? new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:data.timezone,
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
      },
    ).format(new Date())
  : "";

 const weekEnd=(()=>{
  if(!today)return "";
  const date=new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+7);
  return date.toISOString().slice(0,10);
 })();

 const thirtyDayEnd=(()=>{
  if(!today)return "";
  const date=new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+30);
  return date.toISOString().slice(0,10);
 })();

 const visits=data?.visits.filter(v=>{
  if(
    petId &&
    v.petId!==petId
  ){
    return false;
  }

  if(
    vetView==="today"
  ){
    const createdDate=
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:data.timezone,
          year:"numeric",
          month:"2-digit",
          day:"2-digit",
        },
      ).format(
        new Date(v.createdAt),
      );

    return createdDate===today;
  }

  if(
    vetView==="followups"
  ){
    return Boolean(
      v.followUpDate &&
      v.followUpDate>=today &&
      v.followUpDate<=weekEnd,
    );
  }

  if(
    vetView==="vaccines"
  ){
    const nextVaccineDate=
      typeof v.details.nextVaccineDate==="string"
        ? v.details.nextVaccineDate
        : "";

    return Boolean(
      nextVaccineDate &&
      nextVaccineDate>=today &&
      nextVaccineDate<=thirtyDayEnd,
    );
  }

  return true;
 })||[];

 function clearVetView(){
  setVetView("");

  const url=
    new URL(
      window.location.href,
    );

  url.searchParams.delete(
    "vetView",
  );

  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
 }
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setError("");try{await read(await fetch("/api/crm/veterinary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,id:requestId,petId,branchId:data?.branchId})}));setOpen(false);setNotice("Consulta registrada en el historial. Si elegiste un servicio, su orden está lista para cobrar.");setRevision(n=>n+1);}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar.");}finally{setBusy(false);}}
 async function prepare(visit:Visit){setBusy(true);setError("");try{const rows=await read<Session[]>(await fetch("/api/pos/cash-sessions",{cache:"no-store"}));const available=rows.filter(s=>s.status==="open"&&s.branchId===data?.branchId);setSessions(available);setSessionId(available[0]?.id||"");setTendered(String(visit.balance));setCheckout(visit);}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo abrir caja.");}finally{setBusy(false);}}
 async function pay(event:FormEvent){event.preventDefault();if(!checkout)return;setBusy(true);setError("");try{const tx=await read<{receiptNumber:string}>(await fetch("/api/pos/sales/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cashSessionId:sessionId,salesOrderId:checkout.salesOrderId,payments:[{method,amount:Number(checkout.balance),tenderedAmount:method==="cash"?Number(tendered):undefined}]})}));setCheckout(null);setNotice(`Cobro registrado · ${tx.receiptNumber}`);setRevision(n=>n+1);}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo cobrar.");}finally{setBusy(false);}}
 return <main className="space-y-6"><header className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-indigo-50 p-7"><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Datara Pets · Atención clínica</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Veterinaria</h1><p className="mt-2 text-sm text-slate-600">Cada consulta, una parte de su historia.</p></header>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
 {!data&&!error&&<p>Cargando Veterinaria…</p>}
 {data&&<><div className="flex flex-wrap items-end gap-3"><label className="min-w-52 flex-1 text-sm font-medium">Buscar mascota o tutor<input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre de mascota o tutor"/></label><label className="min-w-56 flex-1 text-sm font-medium">Expediente<select className={field} value={petId} onChange={e=>setPetId(e.target.value)}><option value="">Todas las mascotas</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name} · {p.tutor}</option>)}</select></label>{data.canCreate&&<button disabled={!petId} onClick={()=>{setRequestId(crypto.randomUUID());setOpen(true);}} className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Nueva consulta</button>}</div>
 <p className="text-xs text-slate-500">Historial de la sucursal activa · hasta 200 consultas recientes. Selecciona una mascota para registrar su consulta.</p>

 {vetView&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
  <div>
   <p className="text-sm font-semibold text-cyan-900">
    {vetView==="today"
     ?"Mostrando consultas de hoy"
     :vetView==="followups"
      ?"Mostrando revisiones de los próximos 7 días"
      :"Mostrando vacunas de los próximos 30 días"}
   </p>
   <p className="text-xs text-cyan-700">
    Vista filtrada desde el resumen.
   </p>
  </div>

  <button
   type="button"
   onClick={clearVetView}
   className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
  >
   Ver todo el historial
  </button>
 </div>}

 <div className="space-y-3">{!visits.length&&<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">Aún no hay consultas registradas en esta vista.</div>}{visits.map(v=><details key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer"><span className="font-semibold text-slate-950">{v.petName} · {v.reason}</span><span className="mt-1 block text-xs text-slate-500">{new Date(v.createdAt).toLocaleString("es-MX")} · {v.clinician}</span></summary><div className="mt-5 grid gap-4 md:grid-cols-2">{Object.entries({weightKg:"Peso (kg)",temperatureC:"Temperatura (°C)",heartRate:"Frecuencia cardiaca",respiratoryRate:"Frecuencia respiratoria",diagnosis:"Diagnóstico",treatment:"Tratamiento",instructions:"Indicaciones",vaccines:"Vacunas aplicadas",nextVaccineDate:"Próxima vacuna",notes:"Notas"}).map(([key,label])=>v.details[key]!==null&&v.details[key]!==""&&<div key={key}><p className="text-xs font-semibold text-slate-500">{label}</p><p className="whitespace-pre-wrap text-sm text-slate-900">{String(v.details[key]??"")}</p></div>)}{v.followUpDate&&<p className="text-sm">Próxima revisión: {v.followUpDate}</p>}</div>{v.salesOrderId&&<div className="mt-5 flex items-center justify-between border-t pt-4"><p className="text-sm">{v.orderReference} · {Number(v.balance)>0?`Pendiente: ${v.balance} ${v.currency}`:"Pagada"}</p>{Number(v.balance)>0&&<button disabled={busy} onClick={()=>void prepare(v)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Cobrar consulta</button>}</div>}</details>)}</div></>}
 {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="visit-title" className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6"><h2 id="visit-title" className="text-xl font-bold">Nueva consulta · {data?.pets.find(p=>p.id===petId)?.name}</h2><p className="mt-2 text-xs text-slate-500">Registro permanente. Revisa los datos antes de guardar; el seguimiento se registra como otra consulta.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{[["reason","Motivo de consulta"],["clinician","Veterinario responsable"]].map(([name,label])=><label key={name} className="text-sm font-medium">{label}<input name={name} required maxLength={200} className={field}/></label>)}{[["weightKg","Peso (kg)"],["temperatureC","Temperatura (°C)"],["heartRate","Frecuencia cardiaca (lpm)"],["respiratoryRate","Frecuencia respiratoria (rpm)"]].map(([name,label])=><label key={name} className="text-sm font-medium">{label}<input name={name} type="number" min="0.01" step="0.01" className={field}/></label>)}{[["diagnosis","Diagnóstico"],["treatment","Tratamiento"],["instructions","Indicaciones para el tutor"],["vaccines","Vacunas aplicadas (nombre, lote y fecha)"],["notes","Notas clínicas"]].map(([name,label])=><label key={name} className="text-sm font-medium">{label}<textarea name={name} maxLength={10000} rows={3} className={field}/></label>)}<label className="text-sm font-medium">Próxima vacuna<input name="nextVaccineDate" type="date" className={field}/></label><label className="text-sm font-medium">Próxima revisión<input name="followUpDate" type="date" className={field}/></label><label className="text-sm font-medium">Servicio a cobrar<select name="productId" className={field}><option value="">Sin orden de cobro</option>{data?.products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.unitPrice} {p.currency}</option>)}</select><span className="text-xs text-slate-500">Catálogo: categoría Consulta. El cobro se confirma después.</span></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setOpen(false)} className="rounded-xl border px-4 py-2">Cancelar</button><button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2 text-white">{busy?"Guardando…":"Registrar consulta"}</button></div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</form></div>}
 {checkout&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={pay} role="dialog" aria-modal="true" aria-label="Cobrar consulta" className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">Cobrar consulta</h2><p>{checkout.petName} · {checkout.balance} {checkout.currency}</p><label className="block text-sm">Caja<select required className={field} value={sessionId} onChange={e=>setSessionId(e.target.value)}><option value="">Selecciona caja</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.terminalName}</option>)}</select></label>{!sessions.length&&<p className="text-sm text-amber-700">Abre una caja en la sucursal activa para cobrar.</p>}<select aria-label="Método de pago" className={field} value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select>{method==="cash"&&<label className="block text-sm">Recibido<input className={field} type="number" min={Number(checkout.balance)} step="0.01" required value={tendered} onChange={e=>setTendered(e.target.value)}/></label>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setCheckout(null)}>Cerrar</button><button disabled={busy||!sessionId} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-40">Confirmar cobro</button></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</form></div>}
 </main>;
}
