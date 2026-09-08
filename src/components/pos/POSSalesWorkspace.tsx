"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = { id: string; code: string | null; name: string; description: string | null; itemType: string; category: string | null; unitPrice: number };
type OrderItem = { id: string; productId: string | null; name: string; quantity: number; unitPrice: string | number; totalAmount: string | number };
type PendingOrder = { id: string; reference: string; customerName: string; totalAmount: number; paidAmount: number; sourceType: string | null; createdAt: string; items: OrderItem[] };
type CartItem = Product & { quantity: number };
type Receipt = { receiptNumber: string; orderReference: string; totalAmount: number; changeAmount: number };

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

async function responseData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: string } | null;
  if (!response.ok || !payload?.success) throw new Error(payload?.error ?? "No fue posible completar la operación.");
  return payload.data as T;
}

export default function POSSalesWorkspace({ terminalId, cashSessionId, onCompleted }: { terminalId: string; cashSessionId: string; onCompleted: () => Promise<void> }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "other">("cash");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await responseData<{ products: Product[]; orders: PendingOrder[] }>(await fetch(`/api/pos/sales/workspace?terminalId=${encodeURIComponent(terminalId)}`, { cache: "no-store" }));
      setProducts(data.products); setOrders(data.orders); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar las ventas."); }
    finally { setLoading(false); }
  }, [terminalId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const total = selectedOrder ? selectedOrder.totalAmount - selectedOrder.paidAmount : cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const change = paymentMethod === "cash" ? Math.max(0, Number(tenderedAmount || 0) - total) : 0;
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return products.filter((product) => !query || [product.name, product.code, product.category].some((value) => value?.toLocaleLowerCase("es-MX").includes(query))).slice(0, 24);
  }, [products, search]);

  function addProduct(product: Product) {
    setSelectedOrderId("");
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current.map((item) => item.id === productId ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  function selectOrder(orderId: string) {
    setSelectedOrderId(orderId); setCart([]);
    const order = orders.find((item) => item.id === orderId);
    setCustomerName(order?.customerName === "Público general" ? "" : order?.customerName ?? "");
    setTenderedAmount(order ? String(order.totalAmount - order.paidAmount) : "");
  }

  async function checkout(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const data = await responseData<Receipt>(await fetch("/api/pos/sales/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashSessionId,
          salesOrderId: selectedOrderId || null,
          customerName,
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          payments: [{ method: paymentMethod, amount: total, tenderedAmount: paymentMethod === "cash" ? Number(tenderedAmount || 0) : total, reference }],
        }),
      }));
      setReceipt(data); setCart([]); setSelectedOrderId(""); setCustomerName(""); setTenderedAmount(""); setReference("");
      await Promise.all([load(), onCompleted()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible completar la venta."); }
    finally { setBusy(false); }
  }

  const input = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";
  if (loading) return <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">Cargando catálogo y órdenes…</section>;

  return <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
    <div className="space-y-6">
      {orders.length > 0 && <div className="rounded-[30px] border border-violet-200 bg-violet-50/70 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-violet-600">DBP + Pets</p><h2 className="mt-1 text-xl font-black">Órdenes listas para cobrar</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">{orders.length} pendientes</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{orders.map((order) => <button type="button" onClick={() => selectOrder(order.id)} key={order.id} className={`rounded-2xl border p-4 text-left transition ${selectedOrderId === order.id ? "border-violet-500 bg-white ring-4 ring-violet-100" : "border-violet-100 bg-white/80 hover:border-violet-300"}`}><div className="flex justify-between gap-3"><span className="font-black">{order.reference}</span><span className="font-black text-violet-700">{currency.format(order.totalAmount - order.paidAmount)}</span></div><p className="mt-1 text-sm text-slate-600">{order.customerName}</p><p className="mt-2 text-xs font-semibold text-slate-400">{order.items.length} concepto(s) · {order.sourceType ?? "DBP"}</p></button>)}</div></div>}
      <div className="rounded-[30px] border border-slate-200 bg-white p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-600">Venta directa</p><h2 className="mt-1 text-2xl font-black">Productos y servicios</h2></div><input className={`${input} sm:max-w-sm`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, código o categoría"/></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${product.itemType === "service" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{product.itemType === "service" ? "Servicio" : "Producto"}</span><span className="font-black">{currency.format(product.unitPrice)}</span></div><p className="mt-3 font-black">{product.name}</p><p className="mt-1 text-xs text-slate-400">{product.code || product.category || "Catálogo"}</p></button>)}</div>{filteredProducts.length === 0 && <p className="py-10 text-center text-sm font-semibold text-slate-400">No encontramos productos con esa búsqueda.</p>}</div>
    </div>
    <form onSubmit={checkout} className="self-start rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 xl:sticky xl:top-6"><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Cobro actual</p><h2 className="mt-1 text-2xl font-black">{selectedOrder ? selectedOrder.reference : "Nueva venta"}</h2>
      <div className="mt-5 max-h-72 space-y-3 overflow-y-auto">{selectedOrder ? selectedOrder.items.map((item) => <div key={item.id} className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-3"><div><p className="font-bold">{item.name}</p><p className="text-xs text-slate-400">{item.quantity} × {currency.format(Number(item.unitPrice))}</p></div><span className="font-black">{currency.format(Number(item.totalAmount))}</span></div>) : cart.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div className="min-w-0"><p className="truncate font-bold">{item.name}</p><p className="text-xs text-slate-400">{currency.format(item.unitPrice)}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => changeQuantity(item.id, -1)} className="h-8 w-8 rounded-lg bg-white font-black">−</button><span className="w-5 text-center font-black">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} className="h-8 w-8 rounded-lg bg-white font-black">+</button></div></div>)}{!selectedOrder && cart.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm font-semibold text-slate-400">Selecciona productos o una orden pendiente.</div>}</div>
      <div className="mt-5 border-t border-slate-200 pt-5"><div className="flex items-end justify-between"><span className="font-bold text-slate-500">Total a cobrar</span><span className="text-3xl font-black">{currency.format(total)}</span></div></div>
      {!selectedOrder && <input className={`${input} mt-5`} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Cliente (opcional)"/>}
      <div className="mt-4 grid grid-cols-2 gap-2">{(["cash", "card", "transfer", "other"] as const).map((method) => <button key={method} type="button" onClick={() => { setPaymentMethod(method); if (method !== "cash") setTenderedAmount(String(total)); }} className={`rounded-xl px-3 py-2.5 text-sm font-black ${paymentMethod === method ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{({ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro" })[method]}</button>)}</div>
      {paymentMethod === "cash" ? <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500">Recibido<input required min={total} step="0.01" type="number" className={`${input} mt-1`} value={tenderedAmount} onChange={(event) => setTenderedAmount(event.target.value)}/></label><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-700">Cambio</p><p className="mt-1 text-xl font-black text-emerald-700">{currency.format(change)}</p></div></div> : <input className={`${input} mt-4`} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Referencia opcional"/>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      <button disabled={busy || total <= 0} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-40">{busy ? "Procesando…" : `Cobrar ${currency.format(total)}`}</button>
    </form>
    {receipt && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[30px] bg-white p-7 text-center shadow-2xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-emerald-600">Venta completada</p><h2 className="mt-2 text-3xl font-black">{currency.format(receipt.totalAmount)}</h2><p className="mt-2 font-bold text-slate-600">Ticket {receipt.receiptNumber}</p><p className="mt-1 text-sm text-slate-400">Orden {receipt.orderReference}</p>{receipt.changeAmount > 0 && <div className="mt-5 rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-black uppercase text-cyan-700">Entregar cambio</p><p className="mt-1 text-3xl font-black text-cyan-700">{currency.format(receipt.changeAmount)}</p></div>}<button type="button" onClick={() => setReceipt(null)} className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Nueva venta</button></div></div>}
  </section>;
}
