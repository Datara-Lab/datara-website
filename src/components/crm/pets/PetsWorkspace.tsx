"use client";
import PetVaccinationReview from "@/components/crm/pets/PetVaccinationReview";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";
import PetStaysWorkspace from "@/components/crm/pets/PetStaysWorkspace";
import { PetQrProvider, PetQrCard } from "@/components/crm/pets/PetQrCard";
import { useCRMConfig } from "@/hooks/useCRMConfig";

type Tab = "stays" | "agenda" | "pets" | "packages" | "modules";
type StayViewFilter = "" | "arrivals" | "daycare" | "boarding";
type PackageAlertFilter = "" | "low" | "expiring";
type WorkspaceView = "records" | "stays";
type Pet = { id: string; customerId: string; name: string; species: string; breed: string | null; status: string; tutorName: string | null; tutorLastName: string | null; tutorCompanyName: string | null; vaccination?: { status: string; validUntil: string; message: string; expiresThisWeek: boolean } };
type CardFilter = "all" | "week" | "expired" | "pending";
function petTutor(pet: Pet) { return [pet.tutorName, pet.tutorLastName].filter(Boolean).join(" ").trim() || pet.tutorCompanyName || "Sin tutor identificado"; }
function cardLabel(pet: Pet) {
  const value = pet.vaccination;
  if (!value || value.status === "missing") return "Sin cartilla";
  if (value.status === "pending") return "Pendiente de revisión";
  const date = value.validUntil.split("-").reverse().join("/");
  return `${value.status === "expired" ? "Venció" : "Vence"} ${date}`;
}
type Reservation = { id: string; customerId: string; petId: string; petName: string; branchName: string | null; productName: string | null; packageName: string | null; serviceType: string; status: string; startsAt: string; endsAt: string | null; reservedUnits: number; checkedInAt: string | null; checkedOutAt: string | null };
type PackageAccount = { id: string; customerId: string; petId: string | null; tutorName: string; petName: string | null; productName: string | null; name: string; serviceType: string; unitType: string; purchasedUnits: number; available: number; reserved: number; consumed: number; status: string; validUntil: string | null; metadata: Record<string, unknown> };
type Customer = { id: string; displayName: string };
type Product = { id: string; name: string; active: boolean; category: string | null; unitPrice: number; currency: string; productTypeKey?: string; technical__durationHours?: unknown; technical__includedUnits?: unknown; technical__packageServiceType?: unknown; technical__packageUnitType?: unknown; technical__validityDays?: unknown };
type CashSession = { id: string; terminalId: string; terminalName: string; status: "open" | "closed"; branchId: string };
type Option = { value: string; label: string };
type Access = { enabled: boolean; canView: boolean; canCreate: boolean; canEdit: boolean };
type AccessMap = Record<string, Access>;
type PetDocument = {
  id: string;
  name: string;
  category: string;
  createdTime: string;
  relations: Array<{
    entityType: string;
    entityId: string;
  }>;
};
type ApiResponse<T> = { success: boolean; data?: T; error?: string; primaryBranchId?: string | null };

const moduleDetails = [
  { id: "pet-veterinary", name: "Veterinaria", description: "Expediente clínico, consultas, vacunas y tratamientos." },
  { id: "pet-grooming", name: "Grooming y estética", description: "Agenda, preferencias y servicios recurrentes." },
  { id: "pet-stays", name: "Guardería y pensión", description: "Reservaciones, check-in, estancias y paquetes." },
  { id: "pet-store", name: "Tienda de mascotas", description: "Productos, inventario, promociones y recompra." },
] as const;

const serviceLabels: Record<string, string> = { veterinary: "Veterinaria", grooming: "Grooming", daycare: "Guardería", boarding: "Pensión" };
const statusLabels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", checked_in: "En estancia", checked_out: "Finalizada", cancelled: "Cancelada", no_show: "No asistió" };
const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const primaryButton = "rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-50";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function calculateStayQuote(products: Product[], serviceType: string, hours: number) {
  const expectedCategory = serviceType === "boarding" ? "pensión" : "guardería";
  const candidates = products.map((product) => ({
    product,
    duration: Number(product.technical__durationHours),
  })).filter((option) => option.product.category?.trim().toLowerCase() === expectedCategory
    && Number.isInteger(option.duration) && option.duration > 0 && option.product.unitPrice >= 0);
  if (candidates.length === 0) return null;
  const currency = candidates[0].product.currency;
  const options = candidates.filter((option) => option.product.currency === currency);
  const target = Math.max(1, hours);
  const limit = target + Math.max(...options.map((option) => option.duration));
  const costs = Array<number>(limit + 1).fill(Number.POSITIVE_INFINITY);
  const choices = Array<number>(limit + 1).fill(-1);
  costs[0] = 0;
  for (let covered = 1; covered <= limit; covered += 1) {
    options.forEach((option, index) => {
      const previous = covered - option.duration;
      if (previous < 0) return;
      const candidate = costs[previous] + option.product.unitPrice;
      if (candidate < costs[covered]) { costs[covered] = candidate; choices[covered] = index; }
    });
  }
  let bestHours = target;
  for (let covered = target + 1; covered <= limit; covered += 1) {
    if (costs[covered] < costs[bestHours]) bestHours = covered;
  }
  const selected = new Map<number, number>();
  let remaining = bestHours;
  while (remaining > 0 && choices[remaining] >= 0) {
    const index = choices[remaining];
    selected.set(index, (selected.get(index) ?? 0) + 1);
    remaining = Math.max(0, remaining - options[index].duration);
  }
  return {
    total: costs[bestHours], currency, coveredHours: bestHours,
    lines: [...selected.entries()].map(([index, quantity]) => ({
      name: options[index].product.name, duration: options[index].duration,
      unitPrice: options[index].product.unitPrice, quantity,
    })),
  };
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency.toUpperCase() }).format(value);
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success || payload.data === undefined) throw new Error(payload.error ?? "No fue posible completar la solicitud.");
  return payload.data;
}

export default function PetsWorkspace({
  view = "records",
}: {
  view?: WorkspaceView;
}) {
  const { industry } = useCRMConfig();
  const [tab, setTab] = useState<Tab>(
    view === "records" ? "pets" : "stays",
  );
  const [pets, setPets] = useState<Pet[]>([]);
  const [petSearch, setPetSearch] = useState("");
  const [petView, setPetView] = useState<"cards" | "list">("cards");
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [stayViewFilter, setStayViewFilter] =
    useState<StayViewFilter>("");
  const [packageAlertFilter, setPackageAlertFilter] =
    useState<PackageAlertFilter>("");
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const matchesCardFilter = (pet: Pet, filter: CardFilter) => filter === "all" ||
    (filter === "week" && pet.vaccination?.expiresThisWeek) ||
    (filter === "expired" && pet.vaccination?.status === "expired") ||
    (filter === "pending" && (!pet.vaccination || ["pending", "missing"].includes(pet.vaccination.status)));
  const normalizeSearch = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");
  const visiblePets = pets.filter((pet) => matchesCardFilter(pet, cardFilter) && normalizeSearch([pet.name, pet.species, pet.breed, petTutor(pet)].filter(Boolean).join(" ")).includes(normalizeSearch(petSearch.trim())));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [packages, setPackages] = useState<PackageAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [access, setAccess] = useState<AccessMap>({});
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [uploadingPetId, setUploadingPetId] = useState<string | null>(null);
  const [uploadingPetPhotoId, setUploadingPetPhotoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [petFormOpen, setPetFormOpen] = useState(false);
  const [petTutorId, setPetTutorId] = useState("");
  const [reservationFormOpen, setReservationFormOpen] = useState(false);
  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [reservationPetId, setReservationPetId] = useState("");
  const [packageCustomerId, setPackageCustomerId] = useState("");
  const [packageProductId, setPackageProductId] = useState("");
  const [packagePaymentMethod, setPackagePaymentMethod] = useState("card");
  const [packagePaymentReference, setPackagePaymentReference] = useState("");
  const [packageTenderedAmount, setPackageTenderedAmount] = useState("");
  const [pendingPackagePurchase, setPendingPackagePurchase] = useState<{ transactionId: string; receiptNumber: string; customerId: string; petId: string; productId: string } | null>(null);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [checkoutReservationId, setCheckoutReservationId] = useState<string | null>(null);
  const [checkoutEvaluatedAt, setCheckoutEvaluatedAt] = useState(0);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState("card");
  const [checkoutPaymentReference, setCheckoutPaymentReference] = useState("");
  const handleOperationNotice = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);
  const handleOperationError = useCallback((message: string) => {
    setNotice(null);
    setError(message);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const responses = await Promise.all([
        fetch("/api/crm/pet-access", { cache: "no-store" }),
        fetch("/api/crm/pets", { cache: "no-store" }),
        fetch("/api/crm/pet-reservations", { cache: "no-store" }),
        fetch("/api/crm/pet-packages", { cache: "no-store" }),
        fetch("/api/crm/customers", { cache: "no-store" }),
        fetch("/api/crm/products", { cache: "no-store" }),
        fetch("/api/crm/active-branch?selectedOnly=1", { cache: "no-store" }),
        fetch("/api/crm/documents", { cache: "no-store" }),
        fetch("/api/pos/cash-sessions", { cache: "no-store" }),
      ]);
      const [nextAccess, nextPets, nextReservations, nextPackages, nextCustomers, nextProducts, nextBranches, nextDocuments, nextCashSessions] = await Promise.all([
        readResponse<AccessMap>(responses[0]), readResponse<Pet[]>(responses[1]),
        readResponse<Reservation[]>(responses[2]), readResponse<PackageAccount[]>(responses[3]),
        readResponse<Customer[]>(responses[4]), readResponse<Product[]>(responses[5]), readResponse<Option[]>(responses[6]),
        readResponse<PetDocument[]>(responses[7]),
        readResponse<CashSession[]>(responses[8]),
      ]);
      setAccess(nextAccess); setPets(nextPets); setReservations(nextReservations); setPackages(nextPackages);
      setCustomers(nextCustomers); setProducts(nextProducts.filter((item) => item.active)); setBranches(nextBranches);
      setDocuments(nextDocuments);
      setCashSessions(nextCashSessions);
      setReservationPetId((current) => current || nextPets[0]?.id || "");
      setPackageCustomerId((current) => current || nextCustomers[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar Mascotas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);

      const reservationId = searchParams.get("petCheckout");
      if (reservationId) {
        setTab("agenda");
        setCheckoutReservationId(reservationId);
        setCheckoutEvaluatedAt(Date.now());
      }

      const cartilla = searchParams.get("cartilla");
      if (
        cartilla === "week" ||
        cartilla === "expired" ||
        cartilla === "pending"
      ) {
        setTab("pets");
        setCardFilter(cartilla);
        setPetSearch("");
        setSelectedPet(null);
        setPetView("list");

        window.requestAnimationFrame(() =>
          document
            .getElementById("pet-directory")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
        );
      }

      const stayView = searchParams.get("stayView");
      if (
        stayView === "arrivals" ||
        stayView === "daycare" ||
        stayView === "boarding"
      ) {
        setTab("stays");
        setStayViewFilter(stayView);
        setPackageAlertFilter("");
      }

      const packageAlert = searchParams.get("packageAlert");
      if (
        packageAlert === "low" ||
        packageAlert === "expiring"
      ) {
        setTab("packages");
        setPackageAlertFilter(packageAlert);
        setStayViewFilter("");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (view !== "records") return;

    const timer = window.setTimeout(() => {
      const parameters = new URLSearchParams(window.location.search);
      const tutorId = parameters.get("tutorId") ?? "";

      if (parameters.get("newPet") === "1") {
        setPetTutorId(tutorId);
        setPetFormOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view]);

  const activeModules = useMemo(() => moduleDetails.filter((item) => access[item.id]?.enabled), [access]);
  const stayAccess = access["pet-stays"];
  const groomingAccess = access["pet-grooming"];
  const canCreateReservation = Boolean(stayAccess?.canCreate || groomingAccess?.canCreate || access["pet-veterinary"]?.canCreate);
  const canCreatePackage = Boolean(stayAccess?.canCreate || groomingAccess?.canCreate);
  const reservationPet = pets.find((item) => item.id === reservationPetId);
  const packagePets = pets.filter(
    (item) => item.customerId === packageCustomerId,
  );

  const visiblePackages = useMemo(() => {
    if (!packageAlertFilter) {
      return packages;
    }

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const sevenDaysFromToday = new Date(today);
    sevenDaysFromToday.setDate(
      sevenDaysFromToday.getDate() + 7,
    );

    return packages.filter((item) => {
      if (packageAlertFilter === "low") {
        const threshold = Math.max(
          1,
          Math.ceil(item.purchasedUnits * 0.2),
        );

        return (
          item.status === "active" &&
          item.available > 0 &&
          item.available <= threshold
        );
      }

      if (
        packageAlertFilter === "expiring" &&
        item.status === "active" &&
        item.available > 0 &&
        item.validUntil
      ) {
        const validUntil = new Date(item.validUntil);

        return (
          validUntil >= today &&
          validUntil <= sevenDaysFromToday
        );
      }

      return false;
    });
  }, [packageAlertFilter, packages]);
  const checkoutReservation = reservations.find((item) => item.id === checkoutReservationId) ?? null;
  const checkoutStartedAt = checkoutReservation?.checkedInAt ?? checkoutReservation?.startsAt ?? null;
  const checkoutMinutes = checkoutStartedAt
    ? Math.max(0, Math.ceil((checkoutEvaluatedAt - new Date(checkoutStartedAt).getTime()) / 60000))
    : 0;
  const checkoutHours = Math.floor(checkoutMinutes / 60);
  const checkoutRemainingMinutes = checkoutMinutes % 60;
  const billableHours = Math.max(1, Math.ceil(checkoutMinutes / 60));
  const checkoutQuote = checkoutReservation && !checkoutReservation.packageName
    ? calculateStayQuote(products, checkoutReservation.serviceType, billableHours)
    : null;

  async function submitJson<T>(url: string, method: "POST" | "PATCH", body: Record<string, unknown>): Promise<T> {
    setIsSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return await readResponse<T>(response);
    } finally { setIsSaving(false); }
  }

  async function handlePetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await submitJson("/api/crm/pets", "POST", Object.fromEntries(values));
      form.reset();
      setPetTutorId("");
      setPetFormOpen(false);
      setNotice("Mascota registrada correctamente. Puedes registrar otra cuando quieras.");
      await loadData();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No fue posible registrar la mascota."); }
  }

  async function uploadPetPhoto(pet: Pet, file: File) {
    setUploadingPetPhotoId(pet.id);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("name", `Foto principal · ${pet.name}`);
      formData.set("description", "Fotografía principal del expediente de la mascota.");
      formData.set("category", "Foto de mascota");
      formData.set("entityType", "pet");
      formData.set("entityId", pet.id);
      formData.set("entityName", pet.name);
      await readResponse<PetDocument>(await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      }));
      setNotice(`Foto de ${pet.name} actualizada.`);
      await loadData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No fue posible guardar la foto de la mascota.");
    } finally {
      setUploadingPetPhotoId(null);
    }
  }

  async function uploadVaccinationCard(
    pet: Pet,
    file: File,
  ) {
    setUploadingPetId(pet.id);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("name", `Cartilla de vacunación · ${pet.name}`);
      formData.set("description", "Imagen o PDF de la cartilla de vacunación vigente.");
      formData.set("category", "Cartilla de vacunación");
      formData.set("entityType", "pet");
      formData.set("entityId", pet.id);
      formData.set("entityName", pet.name);

      const response = await fetch("/api/crm/documents", {
        method: "POST",
        body: formData,
      });

      await readResponse<PetDocument>(response);
      setNotice(`Cartilla de ${pet.name} cargada correctamente.`);
      await loadData();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No fue posible cargar la cartilla de vacunación.",
      );
    } finally {
      setUploadingPetId(null);
    }
  }

  async function handleReservationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await submitJson("/api/crm/pet-reservations", "POST", { ...values, reservedUnits: Number(values.reservedUnits) });
      setReservationFormOpen(false); setNotice("Reservación confirmada. El paquete se evaluará al completar la salida."); await loadData();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No fue posible crear la reservación."); }
  }

  async function handlePackageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (pendingPackagePurchase) {
        await submitJson("/api/crm/pet-packages", "POST", { customerId: pendingPackagePurchase.customerId, petId: pendingPackagePurchase.petId, productId: pendingPackagePurchase.productId, posTransactionId: pendingPackagePurchase.transactionId });
        setNotice(`Paquete del ticket ${pendingPackagePurchase.receiptNumber} recuperado y acreditado.`);
        setPendingPackagePurchase(null); setPackageFormOpen(false); await loadData(); return;
      }
      const product = products.find((item) => item.id === packageProductId);
      const openSession = cashSessions.find((item) => item.status === "open");
      if (!product) throw new Error("Selecciona un paquete configurado en Productos y servicios.");
      if (!openSession) throw new Error("Abre una caja en Datara POS antes de vender el paquete.");
      if (!["Guardería", "Pensión", "Ambos"].includes(product.category ?? "") || !product.technical__packageUnitType || !Number.isInteger(Number(product.technical__includedUnits)) || Number(product.technical__includedUnits) <= 0) throw new Error("Completa categoría, unidad y cantidad incluida antes de cobrar el paquete.");
      const amount = product.unitPrice;
      const tenderedAmount = packagePaymentMethod === "cash" ? Number(packageTenderedAmount || amount) : amount;
      if (!Number.isFinite(tenderedAmount) || tenderedAmount < amount) throw new Error("El efectivo recibido no cubre el precio del paquete.");
      const transaction = await submitJson<{ id: string; receiptNumber: string }>("/api/pos/sales/checkout", "POST", {
        cashSessionId: openSession.id,
        customerName: customers.find((item) => item.id === packageCustomerId)?.displayName ?? "Tutor",
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: packagePaymentMethod, amount, tenderedAmount, reference: packagePaymentReference }],
      });
      setPendingPackagePurchase({ transactionId: transaction.id, receiptNumber: transaction.receiptNumber, customerId: packageCustomerId, petId: String(values.petId ?? ""), productId: product.id });
      await submitJson("/api/crm/pet-packages", "POST", { customerId: packageCustomerId, petId: values.petId, productId: product.id, posTransactionId: transaction.id });
      setPendingPackagePurchase(null); setPackageFormOpen(false); setPackageProductId(""); setPackagePaymentReference(""); setPackageTenderedAmount("");
      setNotice(`Paquete cobrado en el ticket ${transaction.receiptNumber} y saldo acreditado.`); await loadData();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No fue posible vender el paquete."); }
  }

  async function runLifecycle(reservationId: string, action: string): Promise<boolean> {
    try {
      const result = await submitJson<{ warning?: string | null }>(`/api/crm/pet-reservations/${reservationId}/lifecycle`, "PATCH", { action });
      setNotice(action === "check_in" ? `Check-in registrado. El paquete se evaluará en la salida.${result.warning ? ` ${result.warning}` : ""}` : "Reservación actualizada.");
      await loadData();
      return true;
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "No fue posible actualizar la reservación."); return false; }
  }

  function closeCheckout() {
    setCheckoutReservationId(null);
    setCheckoutEvaluatedAt(0);
    const url = new URL(window.location.href);
    url.searchParams.delete("petCheckout");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function completeCommercialCheckout() {
    if (!checkoutReservation) return;
    try {
      const checkout = await submitJson<{ reference: string; totalAmount: number; currency: string }>(
        `/api/crm/pet-reservations/${checkoutReservation.id}/checkout`,
        "POST",
        { paymentMethod: checkoutPaymentMethod, paymentReference: checkoutPaymentReference },
      );
      setNotice(`Check-out completado con la orden ${checkout.reference} por ${formatMoney(checkout.totalAmount, checkout.currency)}.`);
      await loadData();
      closeCheckout();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "No fue posible registrar el cobro.");
    }
  }

  if (industry && industry !== "veterinary") return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">Este centro operativo está disponible para empresas de Mascotas.</div>;

  return <div className="space-y-7">
    <PageHeader
      eyebrow={view === "records" ? "Expedientes" : "Operación de estancias"}
      title={view === "records" ? "Mascotas" : "Guardería y pensión"}
      description={
        view === "records"
          ? "Expedientes, tutores e identificadores de cada mascota en un solo lugar."
          : "Check-in, estancias activas, salidas y paquetes conectados con caja."
      }
      action={<span className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700">{activeModules.length} módulos activos</span>}
    />

    {view === "stays" && <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "En estancia", value: reservations.filter((item) => item.status === "checked_in").length }, { label: "Salidas completadas", value: reservations.filter((item) => item.status === "checked_out").length }, { label: "Unidades disponibles", value: packages.reduce((sum, item) => sum + item.available, 0) }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p></div>)}
    </div>}

    {view === "stays" && <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
      {([['stays','Estancias'],['packages','Paquetes y saldos']] as [Tab,string][]).map(([id,label]) => <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" : "rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"}>{label}</button>)}
    </div>}

    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
    {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{notice}</div>}
    {isLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Cargando operación de Mascotas…</div> : null}

    {!isLoading && tab === "stays" && <PetStaysWorkspace
      pets={pets}
      stays={reservations}
      branches={branches}
      initialColumn={stayViewFilter || undefined}
      canCreate={Boolean(stayAccess?.canCreate)}
      onReload={loadData}
      onNotice={handleOperationNotice}
      onError={handleOperationError}
    />}

    {!isLoading && tab === "agenda" && <section className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-950">Agenda operativa</h2><p className="text-sm text-slate-500">Reservaciones, entradas y salidas del centro.</p></div>{canCreateReservation && <button className={primaryButton} onClick={() => setReservationFormOpen((value) => !value)}>Nueva reservación</button>}</div>
      {reservationFormOpen && <form onSubmit={handleReservationSubmit} className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5 md:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Mascota<select name="petId" required value={reservationPetId} onChange={(event) => setReservationPetId(event.target.value)} className={fieldClass}>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {pet.tutorCompanyName ?? [pet.tutorName, pet.tutorLastName].filter(Boolean).join(" ")}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Servicio<select name="serviceType" required className={fieldClass}><option value="veterinary">Veterinaria</option><option value="grooming">Grooming</option><option value="daycare">Guardería</option><option value="boarding">Pensión</option></select></label>
        <label className="text-sm font-semibold text-slate-700">Sucursal<select name="branchId" className={fieldClass}><option value="">Sin sucursal</option>{branches.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Inicio<input name="startsAt" type="datetime-local" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Término<input name="endsAt" type="datetime-local" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Unidades<input name="reservedUnits" type="number" min="1" defaultValue="1" required className={fieldClass} /></label>
        <label className="text-sm font-semibold text-slate-700">Producto o servicio<select name="productId" className={fieldClass}><option value="">Sin producto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <input type="hidden" name="customerId" value={reservationPet?.customerId ?? ""} />
        <div className="flex items-end"><button disabled={isSaving || pets.length === 0} className={primaryButton}>Confirmar reservación</button></div>
      </form>}
      <div className="grid gap-4 xl:grid-cols-2">{reservations.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-600">{serviceLabels[item.serviceType] ?? item.serviceType}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{item.petName}</h3><p className="text-sm text-slate-500">{formatDate(item.startsAt)} · {item.branchName ?? "Sin sucursal"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabels[item.status] ?? item.status}</span></div><p className="mt-3 text-sm text-slate-600">{item.packageName ? `${item.packageName} · ${item.reservedUnits} unidades` : item.productName ?? "Servicio sin paquete"}</p>{["confirmed","checked_in"].includes(item.status) && <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Image src={`/api/crm/pet-reservations/${item.id}/qr`} alt={`QR de salida de ${item.petName}`} width={72} height={72} unoptimized className="rounded-lg" /><div><p className="text-sm font-bold text-slate-900">QR de salida</p><p className="text-xs leading-5 text-slate-500">Escanéalo al entregar la mascota.</p></div></div>}<div className="mt-4 flex flex-wrap gap-2">{["pending","confirmed"].includes(item.status) && <><button disabled={isSaving} className={primaryButton} onClick={() => void runLifecycle(item.id,"check_in")}>Hacer check-in</button><button disabled={isSaving} className={secondaryButton} onClick={() => void runLifecycle(item.id,"cancel")}>Cancelar</button></>}{item.status === "checked_in" && <button disabled={isSaving} className={primaryButton} onClick={() => { setCheckoutReservationId(item.id); setCheckoutEvaluatedAt(Date.now()); }}>Revisar salida</button>}</div></article>)}</div>
      {reservations.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Todavía no hay reservaciones.</div>}
    </section>}

    {!isLoading && tab === "pets" && <section className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-950">Expedientes de mascotas</h2><p className="text-sm text-slate-500">Información de cuidado ligada a cada tutor.</p></div><button className={primaryButton} onClick={() => setPetFormOpen((value) => !value)}>Registrar mascota</button></div>
      {petFormOpen && <form onSubmit={handlePetSubmit} className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Tutor<select name="customerId" required value={petTutorId} onChange={(event) => setPetTutorId(event.target.value)} className={fieldClass}><option value="">Selecciona un tutor</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Nombre<input name="name" required className={fieldClass} /></label><label className="text-sm font-semibold text-slate-700">Especie<input name="species" required placeholder="Perro, gato…" className={fieldClass} /></label><label className="text-sm font-semibold text-slate-700">Raza<input name="breed" className={fieldClass} /></label><label className="text-sm font-semibold text-slate-700">Peso kg<input name="weightKg" type="number" min="0" step="0.001" className={fieldClass} /></label><label className="text-sm font-semibold text-slate-700">Microchip (opcional)<input name="microchipNumber" placeholder="Déjalo vacío si no tiene" className={fieldClass} /></label><div className="md:col-span-3"><button disabled={isSaving || customers.length === 0 || !petTutorId} className={primaryButton}>Guardar expediente</button></div></form>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Control de cartillas">
        {([{ key: "all", label: "Todas las mascotas" }, { key: "week", label: "Cartillas que vencen en 7 días" }, { key: "expired", label: "Cartillas vencidas" }, { key: "pending", label: "Sin cartilla o revisión" }] as const).map((item) => <button key={item.key} type="button" aria-pressed={cardFilter === item.key} className={`rounded-2xl border p-4 text-left transition ${cardFilter === item.key ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white hover:border-cyan-300"}`} onClick={() => {
          setCardFilter(item.key); setPetSearch(""); setSelectedPet(null); setPetView("list");
          window.requestAnimationFrame(() => document.getElementById("pet-directory")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}><span className="block text-xs font-medium text-slate-600">{item.label}</span><span className="mt-2 block text-2xl font-semibold text-slate-950">{pets.filter((pet) => matchesCardFilter(pet, item.key)).length}</span></button>)}
      </div>
      <p className="text-xs text-slate-500">Próximos 7 días: desde hoy, horario de Ciudad de México. Las cartillas ya vencidas se muestran por separado.</p>
      <div id="pet-directory" className="scroll-mt-24 flex flex-wrap items-center gap-3">
        <label className="min-w-56 flex-1"><span className="sr-only">Buscar mascotas</span><input type="search" value={petSearch} onChange={(event) => { setPetSearch(event.target.value); setSelectedPet(null); }} placeholder="Buscar mascota, tutor, especie o raza…" className={fieldClass} /></label>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1" aria-label="Vista de mascotas">
          {([['cards', 'Tarjetas'], ['list', 'Lista']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={petView === value} onClick={() => { setPetView(value); setSelectedPet(null); }} className={`rounded-lg px-3 py-2 text-sm font-medium ${petView === value ? "bg-slate-900 text-white" : "text-slate-600"}`}>{label}</button>)}
        </div>
        {cardFilter !== "all" && <button type="button" onClick={() => { setCardFilter("all"); setSelectedPet(null); }} className={secondaryButton}>Quitar filtro de cartilla</button>}
      </div>
      <p role="status" className="text-xs text-slate-500">{visiblePets.length} de {pets.length} mascotas</p>
      {!visiblePets.length && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No hay mascotas que coincidan con estos filtros.</div>}
      {petView === "list" && visiblePets.length > 0 && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4">Mascota</th><th className="p-4">Tutor</th><th className="p-4">Especie / raza</th><th className="p-4">Cartilla</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{visiblePets.map((pet) => <tr key={pet.id} className="border-t border-slate-100"><td className="p-4 font-semibold text-slate-900">{pet.name}</td><td className="p-4 text-slate-600">{petTutor(pet)}</td><td className="p-4 text-slate-600">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</td><td className="p-4 text-slate-700">{cardLabel(pet)}</td><td className="p-4"><button type="button" className={secondaryButton} onClick={() => {
        setSelectedPet(pet.id); window.requestAnimationFrame(() => document.getElementById("selected-pet-record")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }}>Ver expediente<span className="sr-only"> de {pet.name}, tutor {petTutor(pet)}</span></button></td></tr>)}</tbody></table></div>}
      {petView === "list" && selectedPet && <div id="selected-pet-record" className="scroll-mt-24 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Expediente de la mascota</h3><button type="button" className={secondaryButton} onClick={() => setSelectedPet(null)}>Cerrar expediente</button></div>}
      <PetQrProvider><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visiblePets.filter((pet) => petView === "cards" || pet.id === selectedPet).map((pet) => {
        const vaccinationCards = documents
          .filter((document) =>
            document.category === "Cartilla de vacunación" &&
            document.relations.some((relation) =>
              relation.entityType === "pet" && relation.entityId === pet.id,
            ),
          )
          .sort((left, right) => right.createdTime.localeCompare(left.createdTime));
        const currentCard = vaccinationCards[0] ?? null;
        const petPhotos = documents
          .filter((document) =>
            document.category === "Foto de mascota" &&
            document.relations.some((relation) =>
              relation.entityType === "pet" && relation.entityId === pet.id,
            ),
          )
          .sort((left, right) => right.createdTime.localeCompare(left.createdTime));
        const currentPhoto = petPhotos[0] ?? null;

        return <article key={pet.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400">
              {currentPhoto ? <Image src={`/api/crm/documents/${currentPhoto.id}/content`} alt={`Foto de ${pet.name}`} fill sizes="80px" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-3xl text-white">●</div>}
            </div>
            {/* pet-photo-qr-row */}
            <PetQrCard petId={pet.id} name={pet.name} />
            {access["pet-veterinary"]?.canView && <Link href={`/crm/veterinaria?petId=${pet.id}`} className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100">Historial veterinario →</Link>}
            <div className="min-w-[120px] flex-1"><h3 className="text-lg font-bold text-slate-950">{pet.name}</h3><p className="text-sm text-slate-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p><label className="mt-2 inline-flex cursor-pointer text-xs font-bold text-cyan-700 hover:underline">{uploadingPetPhotoId === pet.id ? "Subiendo…" : currentPhoto ? "Cambiar foto" : "Agregar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={uploadingPetPhotoId !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPetPhoto(pet, file); event.target.value = ""; }} /></label></div>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">Tutor: {pet.tutorCompanyName ?? [pet.tutorName,pet.tutorLastName].filter(Boolean).join(" ")}</p>

          <div className={currentCard ? "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" : "mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"}>
            <p className={currentCard ? "text-sm font-bold text-emerald-800" : "text-sm font-bold text-amber-800"}>Cartilla de vacunación</p>
            <p className={currentCard ? "mt-1 text-xs text-emerald-700" : "mt-1 text-xs text-amber-700"}>
              {currentCard
                ? `Última actualización: ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(currentCard.createdTime))}`
                : "Todavía no se ha cargado una cartilla."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentCard && <a href={`/api/crm/documents/${currentCard.id}/content`} target="_blank" rel="noreferrer" className={secondaryButton}>Ver cartilla</a>}
              <label className={`${primaryButton} cursor-pointer`}>
                {uploadingPetId === pet.id ? "Subiendo…" : currentCard ? "Actualizar cartilla" : "Subir cartilla"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  disabled={uploadingPetId !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadVaccinationCard(pet, file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {currentCard && <PetVaccinationReview key={currentCard.id} petId={pet.id} documentId={currentCard.id} onSaved={loadData} />}
            {vaccinationCards.length > 1 && <p className="mt-2 text-xs font-semibold text-slate-500">{vaccinationCards.length} versiones conservadas en Documentos.</p>}
          </div>
        </article>;
      })}</div></PetQrProvider>
    </section>}

    {!isLoading && tab === "packages" && <section className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-950">Paquetes y saldos</h2><p className="text-sm text-slate-500">Días, noches o accesos descontados automáticamente.</p></div>{canCreatePackage && <button className={primaryButton} onClick={() => setPackageFormOpen((value) => !value)}>Vender paquete</button>}</div>
      {packageAlertFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {packageAlertFilter === "low"
                ? "Mostrando paquetes por agotarse"
                : "Mostrando paquetes por vencer"}
            </p>
            <p className="text-xs text-amber-700">
              {visiblePackages.length}{" "}
              {visiblePackages.length === 1
                ? "paquete encontrado"
                : "paquetes encontrados"}
            </p>
          </div>

          <button
            type="button"
            className={secondaryButton}
            onClick={() => setPackageAlertFilter("")}
          >
            Ver todos
          </button>
        </div>
      )}
      {packageFormOpen && <form onSubmit={handlePackageSubmit} className="grid gap-4 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5 md:grid-cols-3">
        <div className="md:col-span-3"><p className="text-sm font-bold text-slate-950">Venta conectada con Datara POS</p><p className="mt-1 text-xs text-slate-600">El saldo se acreditará solamente después de registrar el pago. Las unidades y la vigencia provienen del producto.</p></div>
        <label className="text-sm font-semibold text-slate-700">Tutor<select name="customerId" required value={packageCustomerId} onChange={(event) => setPackageCustomerId(event.target.value)} className={fieldClass}>{customers.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Mascota<select name="petId" className={fieldClass}><option value="">Cualquier mascota del tutor</option>{packagePets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Paquete del catálogo<select required value={packageProductId} onChange={(event) => setPackageProductId(event.target.value)} className={fieldClass}><option value="">Selecciona un paquete</option>{products.filter((item) => item.productTypeKey === "stay_package").map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.unitPrice, item.currency)}</option>)}</select></label>
        {(() => { const selected = products.find((item) => item.id === packageProductId); return selected ? <div className="md:col-span-3 rounded-xl border border-cyan-100 bg-white p-4 text-sm text-slate-700"><strong>{selected.name}</strong><span className="ml-2">{String(selected.technical__includedUnits || "?")} {String(selected.technical__packageUnitType || "unidades")} · {selected.category ?? "Categoría sin configurar"}{selected.technical__validityDays ? ` · ${String(selected.technical__validityDays)} días de vigencia` : " · Sin vencimiento"}</span></div> : null; })()}
        <label className="text-sm font-semibold text-slate-700">Método de pago<select value={packagePaymentMethod} onChange={(event) => setPackagePaymentMethod(event.target.value)} className={fieldClass}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label>
        {packagePaymentMethod === "cash" && <label className="text-sm font-semibold text-slate-700">Efectivo recibido<input type="number" min="0" step="0.01" value={packageTenderedAmount} onChange={(event) => setPackageTenderedAmount(event.target.value)} className={fieldClass} /></label>}
        <label className="text-sm font-semibold text-slate-700">Referencia<input value={packagePaymentReference} onChange={(event) => setPackagePaymentReference(event.target.value)} placeholder="Opcional" className={fieldClass} /></label>
        <div className="md:col-span-3">{pendingPackagePurchase ? <p className="mb-3 text-xs font-bold text-amber-700">El ticket {pendingPackagePurchase.receiptNumber} ya fue cobrado, pero falta acreditar el saldo. El siguiente intento no volverá a cobrar.</p> : cashSessions.some((item) => item.status === "open") ? <p className="mb-3 text-xs font-bold text-emerald-700">Caja abierta: lista para cobrar.</p> : <p className="mb-3 text-xs font-bold text-amber-700">No hay caja abierta. Abre una desde Datara POS para continuar.</p>}<button disabled={isSaving || (!pendingPackagePurchase && (customers.length === 0 || !packageProductId || !cashSessions.some((item) => item.status === "open")))} className={primaryButton}>{pendingPackagePurchase ? "Reintentar acreditación sin cobrar" : "Cobrar y acreditar paquete"}</button></div>
      </form>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visiblePackages.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-cyan-600">{serviceLabels[item.serviceType] ?? "Guardería y pensión"}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{item.productName ?? item.name}</h3><div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p><span className="font-semibold">Tutor:</span> {item.tutorName}</p><p><span className="font-semibold">Mascota:</span> {item.petName ?? "Compartido entre las mascotas del tutor"}</p><p><span className="font-semibold">Vigencia:</span> {item.validUntil ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(item.validUntil)) : "Sin vencimiento"}</p></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-3"><strong className="block text-xl text-emerald-700">{item.available}</strong><span className="text-xs text-emerald-700">Disponibles</span></div><div className="rounded-xl bg-amber-50 p-3"><strong className="block text-xl text-amber-700">{item.reserved}</strong><span className="text-xs text-amber-700">Apartadas</span></div><div className="rounded-xl bg-slate-100 p-3"><strong className="block text-xl text-slate-700">{item.consumed}</strong><span className="text-xs text-slate-600">Usadas</span></div></div></article>)}</div>
    </section>}

    {!isLoading && tab === "modules" && <section><div className="grid gap-4 md:grid-cols-2">{moduleDetails.map((item) => { const moduleAccess = access[item.id]; return <article key={item.id} className={moduleAccess?.enabled ? "rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm" : "rounded-2xl border border-slate-200 bg-slate-50 p-6 opacity-70"}><div className="flex items-start justify-between"><div><h3 className="text-lg font-bold text-slate-950">{item.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></div><span className={moduleAccess?.enabled ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"}>{moduleAccess?.enabled ? "Activo" : "Disponible"}</span></div></article>; })}</div></section>}

    {checkoutReservationId && !isLoading && !checkoutReservation && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold text-slate-950">Reservación no disponible</h2><p className="mt-2 text-sm text-slate-600">El QR no corresponde a una reservación visible para esta empresa.</p><button type="button" className={`${primaryButton} mt-5`} onClick={closeCheckout}>Cerrar</button></div></div>}
    {checkoutReservation && checkoutReservationId && ["daycare", "boarding"].includes(checkoutReservation.serviceType) && <PetStaysWorkspace pets={pets} stays={reservations} branches={branches} canCreate={Boolean(stayAccess?.canEdit)} onReload={loadData} onNotice={handleOperationNotice} onError={handleOperationError} initialCheckoutPetId={checkoutReservation.petId} onCheckoutClosed={closeCheckout} />}
    {checkoutReservation && checkoutReservationId && !["daycare", "boarding"].includes(checkoutReservation.serviceType) && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Salida por código QR</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Check-out de {checkoutReservation.petName}</h2><div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-sm text-slate-300">Tiempo de estancia</p><p className="mt-1 text-3xl font-bold">{checkoutHours} h {checkoutRemainingMinutes} min</p><p className="mt-2 text-sm text-cyan-300">Equivale a {billableHours} {billableHours === 1 ? "hora" : "horas"} facturables.</p></div><div className={checkoutReservation.packageName ? "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" : "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"}><p className={checkoutReservation.packageName ? "font-bold text-emerald-800" : "font-bold text-amber-800"}>{checkoutReservation.packageName ? "Sí tiene plan contratado" : "No tiene plan contratado"}</p><p className={checkoutReservation.packageName ? "mt-1 text-sm text-emerald-700" : "mt-1 text-sm text-amber-700"}>{checkoutReservation.packageName ? `${checkoutReservation.packageName}. La unidad correspondiente fue descontada durante el check-in.` : checkoutQuote ? `Total a cobrar: ${formatMoney(checkoutQuote.total, checkoutQuote.currency)} por ${checkoutQuote.coveredHours} horas cubiertas.` : "No hay una tarifa horaria configurada para este servicio."}</p>{checkoutQuote && <div className="mt-3 space-y-1 border-t border-amber-200 pt-3">{checkoutQuote.lines.map((line) => <p key={line.name} className="text-sm text-amber-800">{line.quantity} × {line.name} ({line.duration} h) · {formatMoney(line.unitPrice * line.quantity, checkoutQuote.currency)}</p>)}</div>}{!checkoutReservation.packageName && !checkoutQuote && <p className="mt-3 text-xs font-semibold text-amber-800">Configura el campo “Duración facturable (horas)” en el tipo Servicio para mascota y captura ese valor en cada tarifa del catálogo.</p>}</div>{!checkoutReservation.packageName && checkoutQuote && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Método de pago<select value={checkoutPaymentMethod} onChange={(event) => setCheckoutPaymentMethod(event.target.value)} className={fieldClass}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label><label className="text-sm font-semibold text-slate-700">Referencia<input value={checkoutPaymentReference} onChange={(event) => setCheckoutPaymentReference(event.target.value)} placeholder="Opcional" className={fieldClass} /></label></div>}<div className="mt-6 flex justify-end gap-3"><button type="button" className={secondaryButton} onClick={closeCheckout}>Volver</button><button type="button" disabled={isSaving || checkoutReservation.status !== "checked_in" || (!checkoutReservation.packageName && !checkoutQuote)} className={primaryButton} onClick={() => void completeCommercialCheckout()}>{checkoutReservation.status === "checked_in" ? checkoutReservation.packageName ? "Generar orden y completar salida" : "Registrar cobro y check-out" : "Salida ya procesada"}</button></div></div></div>}
  </div>;
}
