"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DataraTableScroll from "@/components/shared/DataraTableScroll";
import Button from "@/components/ui/Button";

type StockOption = {
  stockId: string | null;
  productName: string;
  productCode: string | null;
  locationLabel: string;
  branchName: string;
};

type InventoryPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canViewCost: boolean;
};

type UnitRecord = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  locationName: string;
  locationCode: string | null;
  productName: string;
  productCode: string | null;
  stockId: string;
  vin: string | null;
  serialNumber: string | null;
  modelYear: number | null;
  color: string | null;
  status: "available" | "reserved" | "sold" | "delivered" | "unavailable";
  receivedAt: string | null;
  unitCost: number | null;
  listPrice: number | null;
  daysInInventory: number | null;
};

type UnitsResponse = {
  success: boolean;
  data?: UnitRecord[];
  error?: string;
};

type InventoryUnitsWorkspaceProps = {
  stocks: StockOption[];
  permissions: InventoryPermissions;
};

const statusLabels = {
  available: "Disponible",
  reserved: "Apartada",
  sold: "Vendida",
  delivered: "Entregada",
  unavailable: "No disponible",
};

const statusClasses = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  reserved: "bg-violet-50 text-violet-700 ring-violet-600/20",
  sold: "bg-blue-50 text-blue-700 ring-blue-600/20",
  delivered: "bg-slate-900 text-white ring-slate-900/20",
  unavailable: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

const emptyForm = {
  stockId: "",
  vin: "",
  serialNumber: "",
  modelYear: "",
  color: "",
  receivedAt: new Date().toISOString().slice(0, 10),
  unitCost: "",
  listPrice: "",
};

function formatMoney(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(value);
}

export default function InventoryUnitsWorkspace({
  stocks,
  permissions,
}: InventoryUnitsWorkspaceProps) {
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [statusUnit, setStatusUnit] = useState<UnitRecord | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const stockOptions = useMemo(
    () =>
      stocks.filter(
        (stock): stock is StockOption & { stockId: string } =>
          Boolean(stock.stockId),
      ),
    [stocks],
  );

  const loadUnits = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = status
        ? `?status=${encodeURIComponent(status)}`
        : "";

      const response = await fetch(`/api/crm/inventory/units${query}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as UnitsResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible cargar las unidades.");
      }

      setUnits(payload.data ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar las unidades.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadUnits();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [loadUnits]);

  const visibleUnits = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return units;
    }

    return units.filter((unit) =>
      [
        unit.vin,
        unit.serialNumber,
        unit.productName,
        unit.productCode,
        unit.color,
        unit.branchName,
        unit.locationName,
      ].some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [search, units]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/crm/inventory/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as UnitsResponse & {
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible registrar la unidad.");
      }

      setForm({ ...emptyForm });
      setIsDrawerOpen(false);
      setMessage(payload.message ?? "Unidad registrada correctamente.");
      await loadUnits();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible registrar la unidad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateDrawer() {
    setEditingUnit(null);
    setForm({ ...emptyForm });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(unit: UnitRecord) {
    setEditingUnit(unit);
    setForm({
      stockId: unit.stockId,
      vin: unit.vin ?? "",
      serialNumber: unit.serialNumber ?? "",
      modelYear: unit.modelYear?.toString() ?? "",
      color: unit.color ?? "",
      receivedAt: unit.receivedAt?.slice(0, 10) ?? "",
      unitCost: unit.unitCost?.toString() ?? "",
      listPrice: unit.listPrice?.toString() ?? "",
    });
    setIsDrawerOpen(true);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUnit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/crm/inventory/units/${encodeURIComponent(editingUnit.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_details",
            vin: form.vin,
            serialNumber: form.serialNumber,
            modelYear: form.modelYear,
            color: form.color,
            receivedAt: form.receivedAt,
            unitCost: form.unitCost,
            listPrice: form.listPrice,
          }),
        },
      );

      const payload = (await response.json()) as UnitsResponse & {
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible actualizar la unidad.");
      }

      setIsDrawerOpen(false);
      setEditingUnit(null);
      setMessage(payload.message ?? "Unidad actualizada correctamente.");
      await loadUnits();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible actualizar la unidad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAvailabilityChange() {
    if (!statusUnit) {
      return;
    }

    const action =
      statusUnit.status === "available"
        ? "set_unavailable"
        : "restore_available";

    if (action === "set_unavailable" && !statusReason.trim()) {
      setError("Captura el motivo por el que la unidad deja de estar disponible.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/crm/inventory/units/${encodeURIComponent(statusUnit.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: statusReason }),
        },
      );
      const payload = (await response.json()) as UnitsResponse & {
        message?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No fue posible cambiar la disponibilidad.");
      }

      setStatusUnit(null);
      setStatusReason("");
      setMessage(payload.message ?? "Disponibilidad actualizada.");
      await loadUnits();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No fue posible cambiar la disponibilidad.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const summary = useMemo(
    () => ({
      total: units.length,
      available: units.filter((unit) => unit.status === "available").length,
      reserved: units.filter((unit) => unit.status === "reserved").length,
      aging: units.filter(
        (unit) => unit.status === "available" && (unit.daysInInventory ?? 0) >= 90,
      ).length,
    }),
    [units],
  );

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            Unidades físicas
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Inventario por VIN
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Consulta cada motocicleta desde su ingreso hasta el apartado, venta y entrega.
          </p>
        </div>

        {permissions.canCreate && (
          <Button type="button" onClick={openCreateDrawer}>
            Registrar unidad
          </Button>
        )}
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Unidades registradas", summary.total],
          ["Disponibles", summary.available],
          ["Apartadas", summary.reserved],
          ["Más de 90 días", summary.aging],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="search"
          value={search}
          placeholder="Buscar VIN, serie, modelo, color..."
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={status}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <DataraTableScroll>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {["Unidad", "Modelo", "Ubicación", "Ingreso", "Antigüedad", "Estado", "Precio", "Acciones"].map((header) => (
                <th key={header} className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleUnits.map((unit) => (
              <tr key={unit.id} className="transition hover:bg-slate-50">
                <td className="min-w-56 px-5 py-4">
                  <p className="font-bold text-slate-950">{unit.vin ?? unit.serialNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {unit.vin && unit.serialNumber ? `Serie ${unit.serialNumber}` : "Identificador físico"}
                  </p>
                </td>
                <td className="min-w-52 px-5 py-4">
                  <p className="font-semibold text-slate-900">{unit.productName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[unit.modelYear, unit.color].filter(Boolean).join(" · ") || unit.productCode || "Sin ficha adicional"}
                  </p>
                </td>
                <td className="min-w-52 px-5 py-4 text-sm text-slate-700">
                  <p className="font-semibold">{unit.branchName ?? "Sin sucursal"}</p>
                  <p className="mt-1 text-xs text-slate-500">{unit.locationName}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {unit.receivedAt ? new Intl.DateTimeFormat("es-MX").format(new Date(unit.receivedAt)) : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                  {unit.daysInInventory === null ? "—" : `${unit.daysInInventory} días`}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className={["inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset", statusClasses[unit.status]].join(" ")}>
                    {statusLabels[unit.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                  {formatMoney(unit.listPrice)}
                  {permissions.canViewCost && (
                    <p className="mt-1 text-xs font-medium text-slate-400">Costo {formatMoney(unit.unitCost)}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {permissions.canEdit &&
                    (unit.status === "available" || unit.status === "unavailable") ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => openEditDrawer(unit)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => {
                            setStatusReason("");
                            setStatusUnit(unit);
                          }}
                        >
                          {unit.status === "available" ? "No disponible" : "Restaurar"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Gestionada por la operación
                      </span>
                    )}
                </td>
              </tr>
            ))}
            {!isLoading && visibleUnits.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-500">
                  No hay unidades físicas que coincidan con los filtros.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-sm font-semibold text-slate-500">
                  Cargando unidades...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataraTableScroll>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <form onSubmit={editingUnit ? handleEdit : handleCreate}>
              <header className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-black text-slate-950">
                  {editingUnit ? "Editar unidad física" : "Registrar unidad física"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingUnit
                    ? "Actualiza la ficha identificable de la motocicleta."
                    : "Vincula el VIN con una existencia real del inventario."}
                </p>
              </header>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-semibold text-slate-700">
                  Existencia
                  <select required disabled={Boolean(editingUnit)} value={form.stockId} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100 disabled:text-slate-500" onChange={(event) => setForm((current) => ({ ...current, stockId: event.target.value }))}>
                    <option value="">Selecciona producto y ubicación</option>
                    {stockOptions.map((stock) => (
                      <option key={stock.stockId} value={stock.stockId}>
                        {stock.productName} · {stock.branchName} · {stock.locationLabel}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ["vin", "VIN"],
                  ["serialNumber", "Número de serie"],
                  ["modelYear", "Año modelo"],
                  ["color", "Color"],
                  ["receivedAt", "Fecha de ingreso"],
                  ["unitCost", "Costo"],
                  ["listPrice", "Precio de lista"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm font-semibold text-slate-700">
                    {label}
                    <input
                      type={key === "receivedAt" ? "date" : key === "modelYear" || key === "unitCost" || key === "listPrice" ? "number" : "text"}
                      step={key === "unitCost" || key === "listPrice" ? "0.01" : undefined}
                      value={form[key as keyof typeof form]}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <Button type="button" variant="secondary" onClick={() => setIsDrawerOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Guardando..."
                    : editingUnit
                      ? "Guardar cambios"
                      : "Registrar unidad"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {statusUnit && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0"
            onClick={() => setStatusUnit(null)}
          />
          <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              Disponibilidad
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {statusUnit.status === "available"
                ? "Marcar unidad como no disponible"
                : "Restaurar unidad disponible"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {statusUnit.vin ?? statusUnit.serialNumber} · {statusUnit.productName}
            </p>
            {statusUnit.status === "available" && (
              <label className="mt-5 block text-sm font-semibold text-slate-700">
                Motivo
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Ej. unidad en inspección o mantenimiento"
                  onChange={(event) => setStatusReason(event.target.value)}
                />
              </label>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setStatusUnit(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={() => void handleAvailabilityChange()}>
                {isSubmitting ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
