"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PageHeader from "@/components/shared/PageHeader";

type Pet = {
  id: string;
  customerId: string;
  name: string;
  species: string;
  breed: string | null;
  tutorName: string | null;
  tutorLastName: string | null;
};

type Product = {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  unitPrice: number;
  currency: string;
};

type Branch = {
  value: string;
  label: string;
};

type GroomingOrder = {
  id: string;
  branchId: string | null;
  customerId: string | null;
  reference: string;
  status: string;
  priority: string;
  serviceType: string;
  customerName: string;
  unitModel: string;
  unitIdentifier: string | null;
  reportedProblem: string;
  scheduledAt: string | null;
  ownerName: string | null;
  result: string | null;
  items: GroomingItem[];
};

type GroomingItem = {
  id: string;
  productId: string | null;
  itemType: "Mano de obra" | "Refacción";
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
};

type GroomingDocument = {
  id: string;
  name: string;
  category: string;
  createdTime: string;
  relations: Array<{
    entityType: string;
    entityId: string;
  }>;
};

type EvidencePhase = "before" | "after";

type OpenCashSession = {
  id: string;
  terminalName: string;
  status: string;
};

type PendingPOSCheckout = {
  salesOrderId: string;
  reference: string;
  customerName: string;
  petNames: string[];
  totalAmount: number;
  currency: string;
};

type CheckoutSelection = {
  anchor: GroomingOrder;
  orders: GroomingOrder[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type GroomingViewFilter =
  | ""
  | "pending"
  | "working"
  | "ready"
  | "appointments";

const columns = [
  {
    id: "pending",
    label: "Por recibir",
    statuses: ["Borrador", "Programada"],
  },
  {
    id: "working",
    label: "En estética",
    statuses: ["En proceso", "Pausada", "Pendiente de autorización"],
  },
  {
    id: "ready",
    label: "Lista para entregar",
    statuses: ["Pendiente de cierre"],
  },
  {
    id: "done",
    label: "Entregadas",
    statuses: ["Completada"],
  },
] as const;

const fieldClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const primaryButton =
  "rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-50";

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error ?? "No fue posible completar la operación.");
  }
  return payload.data;
}

function formatDate(value: string | null) {
  if (!value) return "Sin horario";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PetGroomingWorkspace() {
  const [orders, setOrders] = useState<GroomingOrder[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [documents, setDocuments] = useState<GroomingDocument[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [petId, setPetId] = useState("");
  const [productId, setProductId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [openCashSessions, setOpenCashSessions] = useState<OpenCashSession[]>([]);
  const [cashSessionId, setCashSessionId] = useState("");
  const [pendingPOSCheckout, setPendingPOSCheckout] = useState<PendingPOSCheckout | null>(null);
  const [checkoutSelection, setCheckoutSelection] = useState<CheckoutSelection | null>(null);
  const [selectedCheckoutOrderIds, setSelectedCheckoutOrderIds] = useState<string[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState<string | null>(null);
  const [addonProductIds, setAddonProductIds] = useState<Record<string, string>>({});
  const [addonQuantities, setAddonQuantities] = useState<Record<string, string>>({});
  const [addonTypes, setAddonTypes] = useState<Record<string, GroomingItem["itemType"]>>({});
  const [groomingViewFilter, setGroomingViewFilter] =
    useState<GroomingViewFilter>("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        fetch("/api/crm/services", { cache: "no-store" }),
        fetch("/api/crm/pets", { cache: "no-store" }),
        fetch("/api/crm/products", { cache: "no-store" }),
        fetch("/api/crm/branches/options", { cache: "no-store" }),
        fetch("/api/crm/documents", { cache: "no-store" }),
      ]);
      const [nextOrders, nextPets, nextProducts, nextBranches, nextDocuments] =
        await Promise.all([
          readResponse<GroomingOrder[]>(responses[0]),
          readResponse<Pet[]>(responses[1]),
          readResponse<Product[]>(responses[2]),
          readResponse<Branch[]>(responses[3]),
          readResponse<GroomingDocument[]>(responses[4]),
        ]);

      const activePets = nextPets.filter((pet) => pet.id);
      const groomingProducts = nextProducts.filter((product) => {
        const category = product.category?.trim().toLowerCase() ?? "";
        return product.active && ["grooming", "estética", "estetica", "baño", "bano"].some((term) => category.includes(term));
      });

      setOrders(nextOrders.filter((order) => order.unitIdentifier));
      setPets(activePets);
      setProducts(nextProducts.filter((product) => product.active));
      setBranches(nextBranches);
      setDocuments(nextDocuments);
      setPetId((current) => current || activePets[0]?.id || "");
      setProductId((current) => current || groomingProducts[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Grooming.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search,
    );

    const groomingView =
      searchParams.get(
        "groomingView",
      );

    if (
      groomingView === "pending" ||
      groomingView === "working" ||
      groomingView === "ready" ||
      groomingView === "appointments"
    ) {
      setGroomingViewFilter(
        groomingView,
      );
    }
  }, []);

  const visibleColumns =
    groomingViewFilter ===
    "appointments"
      ? columns.filter(
          (column) =>
            column.id ===
            "pending",
        )
      : groomingViewFilter
        ? columns.filter(
            (column) =>
              column.id ===
              groomingViewFilter,
          )
        : columns;

  const visibleOrdersForColumn = (
    column: (typeof columns)[number],
  ) => {
    const columnOrders =
      orders.filter((order) =>
        column.statuses.includes(
          order.status as never,
        ),
      );

    if (
      groomingViewFilter !==
      "appointments"
    ) {
      return columnOrders;
    }

    const now = new Date();
    const limit = new Date(
      now.getTime() +
        7 * 86400000,
    );

    return columnOrders.filter(
      (order) => {
        if (
          order.status !==
            "Programada" ||
          !order.scheduledAt
        ) {
          return false;
        }

        const scheduledAt =
          new Date(
            order.scheduledAt,
          );

        return (
          scheduledAt >= now &&
          scheduledAt < limit
        );
      },
    );
  };

  function clearGroomingViewFilter() {
    setGroomingViewFilter(
      "",
    );

    const url =
      new URL(
        window.location.href,
      );

    url.searchParams.delete(
      "groomingView",
    );

    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  const selectedPet = pets.find((pet) => pet.id === petId) ?? null;
  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const groomingProducts = products.filter((product) => {
    const category = product.category?.trim().toLowerCase() ?? "";
    return ["grooming", "estética", "estetica", "baño", "bano"].some(
      (term) => category.includes(term),
    );
  });

  const activeCount = useMemo(
    () => orders.filter((order) => !["Completada", "Cancelada"].includes(order.status)).length,
    [orders],
  );

  async function patchOrder(
    orderId: string,
    body: Record<string, unknown>,
  ) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/services/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await readResponse<unknown>(response);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPet || !selectedProduct) return;
    const values = new FormData(event.currentTarget);
    const scheduledAt = String(values.get("scheduledAt") ?? "");

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/crm/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: String(values.get("branchId") ?? ""),
          customerId: selectedPet.customerId,
          serviceType: selectedProduct.name,
          priority: String(values.get("priority") ?? "Normal"),
          unitModel: selectedPet.name,
          unitIdentifier: selectedPet.id,
          reportedProblem: String(values.get("instructions") ?? "Servicio de grooming"),
          scheduledAt,
          commitmentAt: String(values.get("commitmentAt") ?? "") || null,
          notes: `Servicio de catálogo: ${selectedProduct.name}. Precio de referencia: ${selectedProduct.unitPrice} ${selectedProduct.currency}.`,
        }),
      });
      const created = await readResponse<{ id: string; reference: string }>(response);
      await patchOrder(created.id, {
        action: "Programar",
        scheduledAt,
      });
      setNotice(`Orden ${created.reference} programada para ${selectedPet.name}.`);
      setFormOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible crear la orden de Grooming.");
    } finally {
      setIsSaving(false);
    }
  }

  async function runAction(order: GroomingOrder, action: string) {
    try {
      const body: Record<string, unknown> = { action };
      if (action === "Finalizar grooming") {
        body.result = "Servicio de grooming terminado; mascota lista para entrega.";
      }
      await patchOrder(order.id, body);
      setNotice(
        action === "Iniciar"
          ? `${order.unitModel} ingresó a estética.`
          : action === "Finalizar grooming"
            ? `${order.unitModel} está lista para entregar.`
            : `${order.unitModel} fue entregada.`,
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No fue posible actualizar la orden.");
    }
  }

  async function uploadEvidence(
    order: GroomingOrder,
    phase: EvidencePhase,
    file: File,
  ) {
    const phaseLabel = phase === "before" ? "Antes" : "Después";
    const uploadKey = `${order.id}:${phase}`;
    setUploadingEvidence(uploadKey);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set(
        "name",
        `Grooming ${phaseLabel.toLowerCase()} · ${order.unitModel} · ${order.reference}`,
      );
      formData.set(
        "description",
        `Evidencia ${phaseLabel.toLowerCase()} del servicio ${order.serviceType}.`,
      );
      formData.set("category", `Evidencia Grooming - ${phaseLabel}`);
      formData.set("entityType", "service_order");
      formData.set("entityId", order.id);
      formData.set("entityName", order.reference);

      const response = await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      });
      await readResponse<GroomingDocument>(response);
      setNotice(
        `Evidencia ${phaseLabel.toLowerCase()} de ${order.unitModel} guardada.`,
      );
      await loadData();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No fue posible cargar la evidencia de Grooming.",
      );
    } finally {
      setUploadingEvidence(null);
    }
  }

  function getEvidence(
    orderId: string,
    phase: EvidencePhase,
  ) {
    const category =
      phase === "before"
        ? "Evidencia Grooming - Antes"
        : "Evidencia Grooming - Después";

    return documents
      .filter(
        (document) =>
          document.category === category &&
          document.relations.some(
            (relation) =>
              relation.entityType === "service_order" &&
              relation.entityId === orderId,
          ),
      )
      .sort((left, right) =>
        right.createdTime.localeCompare(left.createdTime),
      );
  }

  function getOrderTotal(order: GroomingOrder) {
    const baseService = products.find(
      (product) => product.name === order.serviceType,
    );
    return (
      Number(baseService?.unitPrice ?? 0) +
      order.items.reduce((total, item) => total + item.totalAmount, 0)
    );
  }

  function beginCheckout(order: GroomingOrder) {
    const relatedOrders = orders.filter(
      (candidate) =>
        candidate.status === "Pendiente de cierre" &&
        candidate.customerId === order.customerId &&
        candidate.branchId === order.branchId,
    );
    setCheckoutSelection({
      anchor: order,
      orders: relatedOrders,
    });
    setSelectedCheckoutOrderIds(relatedOrders.map((candidate) => candidate.id));
    setError(null);
    setNotice(null);
  }

  async function checkoutOrder() {
    if (!checkoutSelection || selectedCheckoutOrderIds.length === 0) return;
    const order = checkoutSelection.anchor;
    const selectedOrders = checkoutSelection.orders.filter((candidate) =>
      selectedCheckoutOrderIds.includes(candidate.id),
    );
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/crm/services/${order.id}/pet-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod,
            paymentReference,
            serviceOrderIds: selectedCheckoutOrderIds,
          }),
        },
      );
      const checkout = await readResponse<{
        salesOrderId: string;
        reference: string;
        totalAmount: number;
        currency: string;
        checkoutMode: "pos" | "embedded";
      }>(response);
      if (checkout.checkoutMode === "pos") {
        const sessionsResponse = await fetch("/api/pos/cash-sessions", {
          cache: "no-store",
        });
        const sessions = (await readResponse<OpenCashSession[]>(sessionsResponse))
          .filter((session) => session.status === "open");
        setOpenCashSessions(sessions);
        setCashSessionId(sessions[0]?.id ?? "");
        setCashTendered(String(checkout.totalAmount));
        setPendingPOSCheckout({
          salesOrderId: checkout.salesOrderId,
          reference: checkout.reference,
          customerName: order.customerName,
          petNames: selectedOrders.map((candidate) => candidate.unitModel),
          totalAmount: checkout.totalAmount,
          currency: checkout.currency,
        });
        setCheckoutSelection(null);
      } else {
        setNotice(`${selectedOrders.map((candidate) => candidate.unitModel).join(", ")} ${selectedOrders.length === 1 ? "fue entregada" : "fueron entregadas"}. Orden ${checkout.reference} cobrada por ${new Intl.NumberFormat("es-MX", { style: "currency", currency: checkout.currency.toUpperCase() }).format(checkout.totalAmount)}.`);
        setCheckoutSelection(null);
      }
      setPaymentReference("");
      await loadData();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No fue posible registrar el cobro de Grooming.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function completePOSCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPOSCheckout) return;
    if (!cashSessionId) {
      setError("Abre una caja en Datara POS antes de registrar el cobro.");
      return;
    }

    const tenderedAmount = Number(cashTendered);
    if (paymentMethod === "cash" && (!Number.isFinite(tenderedAmount) || tenderedAmount < pendingPOSCheckout.totalAmount)) {
      setError("El efectivo recibido debe cubrir el total de la venta.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/pos/sales/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashSessionId,
          salesOrderId: pendingPOSCheckout.salesOrderId,
          payments: [{
            method: paymentMethod,
            amount: pendingPOSCheckout.totalAmount,
            tenderedAmount: paymentMethod === "cash" ? tenderedAmount : undefined,
            reference: paymentReference,
          }],
        }),
      });
      const transaction = await readResponse<{
        receiptNumber: string;
        changeAmount: number;
      }>(response);
      const changeMessage = transaction.changeAmount > 0
        ? ` Cambio: ${new Intl.NumberFormat("es-MX", { style: "currency", currency: pendingPOSCheckout.currency.toUpperCase() }).format(transaction.changeAmount)}.`
        : "";
      setNotice(`${pendingPOSCheckout.petNames.join(", ")} ${pendingPOSCheckout.petNames.length === 1 ? "fue entregada" : "fueron entregadas"} y el cobro quedó registrado. Ticket ${transaction.receiptNumber}.${changeMessage}`);
      setPendingPOSCheckout(null);
      setPaymentReference("");
      setCashTendered("");
      await loadData();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No fue posible completar el cobro en POS.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addOrderItem(order: GroomingOrder) {
    const productId = addonProductIds[order.id] ?? "";
    const product = products.find((item) => item.id === productId);
    const quantity = Number(addonQuantities[order.id] ?? "1");
    const itemType = addonTypes[order.id] ?? "Refacción";

    if (!product) {
      setError("Selecciona un producto o servicio adicional.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    const existingIndex = order.items.findIndex(
      (item) => item.productId === product.id && item.itemType === itemType,
    );
    const nextItems = order.items.map((item) => ({
      itemType: item.itemType,
      productId: item.productId,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    if (existingIndex >= 0) {
      nextItems[existingIndex].quantity += quantity;
    } else {
      nextItems.push({
        itemType,
        productId: product.id,
        name: product.name,
        description: product.category,
        quantity,
        unitPrice: product.unitPrice,
      });
    }

    try {
      await patchOrder(order.id, {
        action: "Actualizar",
        items: nextItems,
      });
      setAddonProductIds((current) => ({ ...current, [order.id]: "" }));
      setAddonQuantities((current) => ({ ...current, [order.id]: "1" }));
      setNotice(`${product.name} agregado a la orden de ${order.unitModel}.`);
    } catch (itemError) {
      setError(
        itemError instanceof Error
          ? itemError.message
          : "No fue posible agregar la partida.",
      );
    }
  }

  async function removeOrderItem(order: GroomingOrder, itemId: string) {
    const nextItems = order.items
      .filter((item) => item.id !== itemId)
      .map((item) => ({
        itemType: item.itemType,
        productId: item.productId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

    try {
      await patchOrder(order.id, { action: "Actualizar", items: nextItems });
      setNotice("Partida retirada de la orden.");
    } catch (itemError) {
      setError(
        itemError instanceof Error
          ? itemError.message
          : "No fue posible retirar la partida.",
      );
    }
  }

  return <div className="space-y-7">
    <PageHeader
      eyebrow="Operación Pets"
      title="Grooming y estética"
      description="Órdenes de baño, corte y estética organizadas desde la recepción hasta la entrega."
      action={<button type="button" className={primaryButton} onClick={() => setFormOpen((current) => !current)}>Nueva orden</button>}
    />

    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "Órdenes activas", value: activeCount }, { label: "En estética", value: orders.filter((order) => order.status === "En proceso").length }, { label: "Listas para entregar", value: orders.filter((order) => order.status === "Pendiente de cierre").length }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p></div>)}
    </div>

    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
    {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

    {formOpen && <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-6 md:grid-cols-3">
      <label className="text-sm font-semibold text-slate-700">Mascota<select value={petId} onChange={(event) => setPetId(event.target.value)} required className={fieldClass}><option value="">Selecciona una mascota</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {[pet.tutorName, pet.tutorLastName].filter(Boolean).join(" ")}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Servicio<select value={productId} onChange={(event) => setProductId(event.target.value)} required className={fieldClass}><option value="">Selecciona un servicio</option>{groomingProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Sucursal<select name="branchId" required defaultValue={branches.length === 1 ? branches[0].value : ""} className={fieldClass}><option value="">Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.value} value={branch.value}>{branch.label}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-700">Fecha y hora<input name="scheduledAt" type="datetime-local" required className={fieldClass} /></label>
      <label className="text-sm font-semibold text-slate-700">Hora prometida<input name="commitmentAt" type="datetime-local" className={fieldClass} /></label>
      <label className="text-sm font-semibold text-slate-700">Prioridad<select name="priority" defaultValue="Normal" className={fieldClass}><option>Baja</option><option>Normal</option><option>Alta</option><option>Urgente</option></select></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-3">Preferencias e indicaciones<textarea name="instructions" required placeholder="Tipo de corte, largo, shampoo especial, comportamiento, zonas sensibles…" rows={3} className={fieldClass} /></label>
      <div className="md:col-span-3"><button disabled={isSaving || !selectedPet || !selectedProduct} className={primaryButton}>{isSaving ? "Creando…" : "Crear y programar orden"}</button></div>
    </form>}

    {groomingViewFilter && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-cyan-900">
            {groomingViewFilter === "pending"
              ? "Mostrando órdenes pendientes"
              : groomingViewFilter === "working"
                ? "Mostrando órdenes en proceso"
                : groomingViewFilter === "ready"
                  ? "Mostrando mascotas listas para entregar"
                  : "Mostrando citas de Grooming de los próximos 7 días"}
          </p>
          <p className="text-xs text-cyan-700">
            Vista filtrada desde el resumen.
          </p>
        </div>

        <button
          type="button"
          className={secondaryButton}
          onClick={clearGroomingViewFilter}
        >
          Ver todas las órdenes
        </button>
      </div>
    )}

    {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Cargando órdenes de Grooming…</div> : <div className={groomingViewFilter ? "grid gap-4" : "grid gap-4 xl:grid-cols-4"}>
      {visibleColumns.map((column) => <section key={column.id} className="min-h-72 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-950">{column.label}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{visibleOrdersForColumn(column).length}</span></div>
        <div className="space-y-3">{visibleOrdersForColumn(column).map((order) => {
          const beforeEvidence = getEvidence(order.id, "before");
          const afterEvidence = getEvidence(order.id, "after");

          return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">{order.reference}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{order.unitModel}</h3>
          <p className="text-sm font-semibold text-slate-700">{order.serviceType}</p>
          <p className="mt-2 text-xs text-slate-500">{formatDate(order.scheduledAt)} · {order.ownerName ?? "Sin responsable"}</p>
          <p className="mt-3 line-clamp-3 text-sm text-slate-600">{order.reportedProblem}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["before", "after"] as const).map((phase) => {
              const evidence = phase === "before" ? beforeEvidence : afterEvidence;
              const label = phase === "before" ? "Antes" : "Después";
              const latest = evidence[0] ?? null;
              const uploadKey = `${order.id}:${phase}`;

              return <div key={phase} className={latest ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3" : "rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"}>
                <p className="text-xs font-bold text-slate-800">Foto {label.toLowerCase()}</p>
                <p className="mt-1 text-[11px] text-slate-500">{latest ? `${evidence.length} ${evidence.length === 1 ? "archivo" : "archivos"}` : "Sin evidencia"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {latest && <a href={`/api/crm/documents/${latest.id}/content`} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 hover:underline">Ver</a>}
                  <label className="cursor-pointer text-xs font-bold text-cyan-700 hover:underline">
                    {uploadingEvidence === uploadKey ? "Subiendo…" : latest ? "Agregar" : "Subir"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="sr-only"
                      disabled={uploadingEvidence !== null || isSaving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadEvidence(order, phase, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>;
            })}
          </div>
          {order.items.length > 0 && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Adicionales</p>
            <div className="mt-2 space-y-2">{order.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
              <div><p className="font-bold text-slate-800">{item.quantity} × {item.name}</p><p className="text-slate-500">{item.itemType} · {new Intl.NumberFormat("es-MX", { style: "currency", currency: products.find((product) => product.id === item.productId)?.currency.toUpperCase() ?? "MXN" }).format(item.totalAmount)}</p></div>
              {order.status === "En proceso" && <button type="button" disabled={isSaving} onClick={() => void removeOrderItem(order, item.id)} className="font-bold text-red-600 hover:underline">Quitar</button>}
            </div>)}</div>
          </div>}
          {order.status === "En proceso" && <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-bold text-blue-900">Agregar consumible o servicio</p>
            <select value={addonProductIds[order.id] ?? ""} onChange={(event) => setAddonProductIds((current) => ({ ...current, [order.id]: event.target.value }))} className={fieldClass}>
              <option value="">Selecciona del catálogo</option>
              {products.filter((product) => product.name !== order.serviceType).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.category ?? "Sin categoría"}</option>)}
            </select>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <select value={addonTypes[order.id] ?? "Refacción"} onChange={(event) => setAddonTypes((current) => ({ ...current, [order.id]: event.target.value as GroomingItem["itemType"] }))} className={fieldClass}>
                <option value="Refacción">Consumible</option>
                <option value="Mano de obra">Servicio adicional</option>
              </select>
              <input type="number" min="0.001" step="0.001" value={addonQuantities[order.id] ?? "1"} onChange={(event) => setAddonQuantities((current) => ({ ...current, [order.id]: event.target.value }))} aria-label="Cantidad" className={fieldClass} />
            </div>
            <button type="button" disabled={isSaving || !(addonProductIds[order.id] ?? "")} className={`${secondaryButton} w-full`} onClick={() => void addOrderItem(order)}>Agregar a la orden</button>
          </div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {order.status === "Programada" && <button disabled={isSaving} className={primaryButton} onClick={() => void runAction(order, "Iniciar")}>Iniciar</button>}
            {order.status === "En proceso" && <button disabled={isSaving} className={primaryButton} onClick={() => void runAction(order, "Finalizar grooming")}>Marcar lista</button>}
            {order.status === "Pendiente de cierre" && <div className="w-full space-y-2 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
              <p className="text-xs font-semibold leading-5 text-cyan-900">Genera la orden y cobra sin salir de Grooming.</p>
              <button disabled={isSaving} className={`${primaryButton} w-full`} onClick={() => beginCheckout(order)}>Cobrar y entregar</button>
            </div>}
            {order.status === "Borrador" && <span className={secondaryButton}>Sin programar</span>}
          </div>
        </article>;
        })}</div>
      </section>)}
    </div>}
    {checkoutSelection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-600">Entrega agrupada</p><h2 className="mt-2 text-2xl font-black text-slate-950">¿Qué mascotas entregarás?</h2><p className="mt-2 text-sm text-slate-500">Selecciona los servicios del mismo tutor que deseas cobrar en un solo ticket.</p></div>
          <button type="button" disabled={isSaving} onClick={() => setCheckoutSelection(null)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-500">Cerrar</button>
        </div>
        <div className="mt-6 space-y-3">
          {checkoutSelection.orders.map((candidate) => {
            const selected = selectedCheckoutOrderIds.includes(candidate.id);
            const required = candidate.id === checkoutSelection.anchor.id;
            return <label key={candidate.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${selected ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-600" checked={selected} disabled={required || isSaving} onChange={(event) => setSelectedCheckoutOrderIds((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} />
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{candidate.unitModel}</p><p className="text-sm font-semibold text-slate-600">{candidate.serviceType}</p><p className="mt-1 text-xs text-slate-400">{candidate.reference}{required ? " · Selección inicial" : ""}</p></div><p className="font-black text-slate-900">{new Intl.NumberFormat("es-MX", { style: "currency", currency: products.find((product) => product.name === candidate.serviceType)?.currency.toUpperCase() ?? "MXN" }).format(getOrderTotal(candidate))}</p></div>
                {candidate.items.length > 0 && <p className="mt-2 text-xs text-slate-500">Incluye: {candidate.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p>}
              </div>
            </label>;
          })}
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total estimado</p><p className="mt-1 text-sm text-slate-300">{selectedCheckoutOrderIds.length} {selectedCheckoutOrderIds.length === 1 ? "mascota" : "mascotas"}</p></div><p className="text-2xl font-black text-cyan-300">{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(checkoutSelection.orders.filter((candidate) => selectedCheckoutOrderIds.includes(candidate.id)).reduce((total, candidate) => total + getOrderTotal(candidate), 0))}</p></div>
        <button type="button" disabled={isSaving || selectedCheckoutOrderIds.length === 0} onClick={() => void checkoutOrder()} className={`${primaryButton} mt-6 w-full py-3.5`}>{isSaving ? "Generando orden…" : "Continuar al cobro"}</button>
      </div>
    </div>}
    {pendingPOSCheckout && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={completePOSCheckout} className="w-full max-w-lg rounded-[28px] border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-600">Cobro integrado</p><h2 className="mt-2 text-2xl font-black text-slate-950">Cobrar y entregar</h2></div>
          <button type="button" disabled={isSaving} onClick={() => setPendingPOSCheckout(null)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-500">Cerrar</button>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex items-start justify-between gap-4"><div><p className="font-black">{pendingPOSCheckout.customerName}</p><p className="mt-1 text-sm text-slate-400">{pendingPOSCheckout.petNames.join(", ")} · {pendingPOSCheckout.reference}</p></div><p className="text-2xl font-black text-cyan-300">{new Intl.NumberFormat("es-MX", { style: "currency", currency: pendingPOSCheckout.currency.toUpperCase() }).format(pendingPOSCheckout.totalAmount)}</p></div>
        </div>
        {openCashSessions.length === 0 ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">No hay una caja abierta. Abre tu turno una vez en Datara POS y regresa para cobrar desde aquí.</div> : <div className="mt-5 space-y-4">
          {openCashSessions.length > 1 && <label className="block text-sm font-bold text-slate-700">Caja<select value={cashSessionId} onChange={(event) => setCashSessionId(event.target.value)} className={fieldClass}>{openCashSessions.map((session) => <option key={session.id} value={session.id}>{session.terminalName}</option>)}</select></label>}
          <label className="block text-sm font-bold text-slate-700">Método de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={fieldClass}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label>
          {paymentMethod === "cash" && <label className="block text-sm font-bold text-slate-700">Efectivo recibido<input type="number" min={pendingPOSCheckout.totalAmount} step="0.01" value={cashTendered} onChange={(event) => setCashTendered(event.target.value)} className={fieldClass} /></label>}
          {paymentMethod === "cash" && Number(cashTendered) >= pendingPOSCheckout.totalAmount && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Cambio: {new Intl.NumberFormat("es-MX", { style: "currency", currency: pendingPOSCheckout.currency.toUpperCase() }).format(Number(cashTendered) - pendingPOSCheckout.totalAmount)}</p>}
          <label className="block text-sm font-bold text-slate-700">Referencia opcional<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Autorización, folio o nota" className={fieldClass} /></label>
        </div>}
        <button disabled={isSaving || openCashSessions.length === 0} className={`${primaryButton} mt-6 w-full py-3.5`}>{isSaving ? "Registrando cobro…" : "Confirmar cobro y entregar"}</button>
      </form>
    </div>}
  </div>;
}
