"use client";

import {
  Fragment,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import InventoryAuditWorkspace from "@/components/crm/inventory/InventoryAuditWorkspace";
import InventoryCountsWorkspace from "@/components/crm/inventory/InventoryCountsWorkspace";
import DataraTableScroll from "@/components/shared/DataraTableScroll";
import PageHeader from "@/components/shared/PageHeader";

import Button from "@/components/ui/Button";

import { useCRMConfig } from "@/hooks/useCRMConfig";

type MovementType =
  | "Entrada"
  | "Salida"
  | "Ajuste";

type SortDirection =
  | "asc"
  | "desc";

type StockSortField =
  | "productName"
  | "quantity"
  | "reservedQuantity"
  | "availableQuantity"
  | "locationCount"
  | "status"
  | "inventoryValue";

type MovementSortField =
  | "createdAt"
  | "type"
  | "productName"
  | "locationName"
  | "branchName"
  | "quantity"
  | "previousQuantity"
  | "resultingQuantity"
  | "reason"
  | "reference"
  | "performedByName";

type InventoryStatus =
  | "Disponible"
  | "Bajo"
  | "Agotado"
  | "Sin inicializar";

type BranchOption = {
  value: string;
  label: string;
};

type LocationOption = {
  value: string;
  label: string;

  branchId:
  | string
  | null;

  branchLabel:
  | string
  | null;

  name: string;

  code:
  | string
  | null;

  type: string;
  active: boolean;
  isDefault: boolean;

  addressLine:
  | string
  | null;

  city:
  | string
  | null;

  state:
  | string
  | null;

  postalCode:
  | string
  | null;

  country: string;
};

type InventoryPermissions = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
  canViewCost: boolean;
};

type StockRecord = {
  id: string;
  stockId: string | null;

  initialized: boolean;

  branchId:
  | string
  | null;

  branchName: string;

  locationId: string;
  locationName: string;
  locationLabel: string;
  locationType: string;
  isDefaultLocation:
  boolean;

  productId: string;
  productName: string;

  productCode:
  | string
  | null;

  productTypeId: string;
  productTypeName: string;

  category:
  | string
  | null;

  quantity: number;

  reservedQuantity:
  number;

  availableQuantity:
  number;

  minimumQuantity:
  number;

  maximumQuantity:
  | number
  | null;

  reorderPoint:
  | number
  | null;

  binLocation:
  | string
  | null;

  averageUnitCost:
  | number
  | null;

  lastUnitCost:
  | number
  | null;

  inventoryValue:
  | number
  | null;

  unitPrice: number;
  commercialValue: number;
  currency: string;

  status:
  InventoryStatus;

  updatedAt:
  | string
  | null;
};

type ConsolidatedStockRecord = {
  id: string;

  productId: string;
  productName: string;

  productCode:
  | string
  | null;

  productTypeId: string;
  productTypeName: string;

  category:
  | string
  | null;

  quantity: number;

  reservedQuantity:
  number;

  availableQuantity:
  number;

  locationCount: number;

  inventoryValue:
  | number
  | null;

  commercialValue:
  number;

  currency: string;

  status:
  InventoryStatus;

  locations:
  StockRecord[];
};

type StockSummary = {
  totalUnits: number;

  availableUnits:
  number;

  reservedUnits:
  number;

  inventoryValue:
  | number
  | null;

  commercialValue:
  number;

  lowStock: number;
  outOfStock: number;
  uninitialized: number;
};

type StocksResponse = {
  success: boolean;

  data?: StockRecord[];

  summary?:
  StockSummary;

  branches?:
  BranchOption[];

  locations?:
  LocationOption[];

  primaryBranchId?:
  | string
  | null;

  permissions?:
  InventoryPermissions;

  error?: string;
};

type LocationFormState = {
  id: string;
  branchId: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  isDefault: boolean;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyLocationForm:
  LocationFormState = {
  id: "",
  branchId: "",
  name: "",
  code: "",
  type: "Bodega",
  active: true,
  isDefault: false,
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "MX",
};

type LocationsResponse = {
  success: boolean;
  data?: LocationOption[];
  error?: string;
};

type LocationWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type MovementRecord = {
  id: string;
  type: MovementType;

  quantity: number;

  previousQuantity:
  number;

  resultingQuantity:
  number;

  reason:
  | string
  | null;

  reference:
  | string
  | null;

  performedByName:
  | string
  | null;

  performedByClerkUserId:
  string;

  createdAt: string;

  branchId:
  | string
  | null;

  branchName: string;

  locationId?: string;
  locationName?: string;

  productId: string;
  productName: string;

  productCode:
  | string
  | null;
};

type MovementsResponse = {
  success: boolean;
  data?: MovementRecord[];
  error?: string;
};

type MovementWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type ReservationStatus =
  | "Activa"
  | "Liberada"
  | "Cancelada"
  | "Consumida"
  | "Vencida";

type ReservationRecord = {
  id: string;

  sourceType: string;

  sourceId:
  | string
  | null;

  sourceReference:
  | string
  | null;

  quantity: number;
  status: ReservationStatus;

  customerName:
  | string
  | null;

  notes:
  | string
  | null;

  expiresAt:
  | string
  | null;

  createdByName:
  | string
  | null;

  releasedByName:
  | string
  | null;

  releasedAt:
  | string
  | null;

  releaseReason:
  | string
  | null;

  createdAt: string;
  updatedAt: string;

  branchId:
  | string
  | null;

  branchLabel: string;

  locationId: string;
  locationName: string;
  locationLabel: string;
  locationType: string;

  productId: string;
  productName: string;

  productCode:
  | string
  | null;

  stockId: string;

  stockQuantity: number;

  stockReservedQuantity:
  number;

  availableQuantity:
  number;
};

type ReservationsResponse = {
  success: boolean;
  data?: ReservationRecord[];
  error?: string;
};

type ReservationWriteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type DealOption = {
  id: string;

  branchId:
  | string
  | null;

  branchName: string;

  name: string;
  stage: string;
  status: string;

  customerName:
  | string
  | null;

  items: Array<{
    id: string;

    productId:
    | string
    | null;

    name: string;
    quantity: number;
  }>;

  itemsSummary: string;
};

type ReservationDraftItem = {
  key: string;

  dealItemId: string;

  productId: string;
  productName: string;

  requestedQuantity:
  number;

  quantity: string;
  locationId: string;

  selected: boolean;
};

type DealsResponse = {
  success: boolean;
  data?: DealOption[];
  error?: string;
};

type ReservationSettings = {
  manualHours: number;
  qualifiedHours: number;
  proposalHours: number;
  negotiationHours: number;
  depositHours: number;
  maximumHours: number;
  allowExtensions: boolean;
  autoReleaseExpired: boolean;
};

type ReservationSettingsResponse = {
  success: boolean;

  data?: {
    settings:
    ReservationSettings;

    canManage: boolean;
  };

  error?: string;
};

type ReplenishmentRequestItem = {
  id: string;
  requestId: string;
  stockId: string;
  productId: string;
  productName: string;

  productCode:
  | string
  | null;

  locationId: string;
  locationName: string;
  locationCode:
  | string
  | null;

  locationLabel: string;
  requestedQuantity: number;
  receivedQuantity: number;

  unitCost:
  | number
  | null;

  totalCost:
  | number
  | null;

  notes:
  | string
  | null;
};

type ReplenishmentRequest = {
  id: string;
  reference: string;
  status: string;

  branchId:
  | string
  | null;

  branchName:
  | string
  | null;

  branchCode:
  | string
  | null;

  branchLabel: string;

  supplierName:
  | string
  | null;

  supplierReference:
  | string
  | null;

  currency: string;

  notes:
  | string
  | null;

  externalSystem:
  | string
  | null;

  externalId:
  | string
  | null;

  externalReference:
  | string
  | null;

  syncStatus: string;

  syncError:
  | string
  | null;

  requestedByName:
  | string
  | null;

  requestedAt: string;
  createdAt: string;
  updatedAt: string;

  items:
  ReplenishmentRequestItem[];
};

type ReplenishmentResponse = {
  success: boolean;

  data?:
  ReplenishmentRequest[];

  message?: string;
  error?: string;
};

type ProductOption = {
  id: string;
  name: string;

  code:
  | string
  | null;

  label: string;
};

const emptySummary:
  StockSummary = {
  totalUnits: 0,
  availableUnits: 0,
  reservedUnits: 0,
  inventoryValue: 0,
  commercialValue: 0,
  lowStock: 0,
  outOfStock: 0,
  uninitialized: 0,
};

const defaultReservationSettings:
  ReservationSettings = {
  manualHours: 24,
  qualifiedHours: 24,
  proposalHours: 48,
  negotiationHours: 72,
  depositHours: 168,
  maximumHours: 360,
  allowExtensions: true,
  autoReleaseExpired: true,
};

function formatMoney(
  value: number,
  currency = "mxn",
): string {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency:
        currency.toUpperCase(),
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Sin movimientos";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function getReservationExpirationValue(
  hours: number,
): string {
  const date =
    new Date(
      Date.now() +
      hours *
      60 *
      60 *
      1000,
    );

  const localDate =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() *
      60 *
      1000,
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


function compareSortValues(
  first: unknown,
  second: unknown,
): number {
  if (
    typeof first === "number" &&
    typeof second === "number"
  ) {
    return first - second;
  }

  if (
    first === null ||
    first === undefined
  ) {
    return second === null ||
      second === undefined
      ? 0
      : 1;
  }

  if (
    second === null ||
    second === undefined
  ) {
    return -1;
  }

  return String(first).localeCompare(
    String(second),
    "es-MX",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function getStatusClassName(
  status: InventoryStatus,
): string {
  if (status === "Disponible") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }

  if (status === "Bajo") {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  if (status === "Agotado") {
    return "bg-red-50 text-red-700 ring-red-600/20";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function getMovementClassName(
  type: MovementType,
): string {
  if (type === "Entrada") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (type === "Salida") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

export default function InventariosPage() {
  const {
    tenantConfig,
  } = useCRMConfig();

  const productSingularLabel =
    tenantConfig
      ?.terminology
      ?.modules.products
      ?.singular ??
    "Producto";

  const productPluralLabel =
    tenantConfig
      ?.terminology
      ?.modules.products
      ?.plural ??
    "Productos";

  const [
    stocks,
    setStocks,
  ] = useState<StockRecord[]>([]);

  const [
    movements,
    setMovements,
  ] = useState<MovementRecord[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<
    ReservationRecord[]
  >([]);

  const [
    deals,
    setDeals,
  ] = useState<DealOption[]>([]);

  const [
    reservationSettings,
    setReservationSettings,
  ] = useState<
    ReservationSettings
  >({
    ...defaultReservationSettings,
  });

  const [
    summary,
    setSummary,
  ] = useState<StockSummary>(
    emptySummary,
  );

  const [
    branches,
    setBranches,
  ] = useState<BranchOption[]>([]);

  const [
    locations,
    setLocations,
  ] = useState<LocationOption[]>([]);

  const activeLocations =
    useMemo<
      LocationOption[]
    >(
      () =>
        locations.filter(
          (inventoryLocation) =>
            inventoryLocation.active,
        ),
      [locations],
    );

  const [
    permissions,
    setPermissions,
  ] = useState<InventoryPermissions>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canManage: false,
    canViewCost: false,
  });

    const [
    replenishmentRequests,
    setReplenishmentRequests,
  ] = useState<
    ReplenishmentRequest[]
  >([]);

  const [
    requestingStockIds,
    setRequestingStockIds,
  ] = useState<string[]>([]);

  const [
    replenishmentError,
    setReplenishmentError,
  ] = useState<string | null>(
    null,
  );


  const [
    replenishmentMessage,
    setReplenishmentMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    primaryBranchId,
    setPrimaryBranchId,
  ] = useState<string | null>(null);

  const [
    activeView,
    setActiveView,
  ] = useState<
    | "stocks"
    | "movements"
    | "reservations"
    | "replenishment"
    | "counts"
    | "audit"
  >("stocks");

  const [
    linkedDealReservationId,
    setLinkedDealReservationId,
  ] = useState<string | null>(
    null,
  );

  const [
    expandedProductIds,
    setExpandedProductIds,
  ] = useState<string[]>(
    [],
  );

  const [
    expandedReservationGroupIds,
    setExpandedReservationGroupIds,
  ] = useState<string[]>(
    [],
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    branchFilter,
    setBranchFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    productTypeFilter,
    setProductTypeFilter,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("");

  const [
    reservationStatusFilter,
    setReservationStatusFilter,
  ] = useState("");

  const [
    stockSortField,
    setStockSortField,
  ] = useState<StockSortField>(
    "productName",
  );

  const [
    stockSortDirection,
    setStockSortDirection,
  ] = useState<SortDirection>(
    "asc",
  );

  const [
    movementTypeFilter,
    setMovementTypeFilter,
  ] = useState("");

  const [
    movementSortField,
    setMovementSortField,
  ] = useState<MovementSortField>(
    "createdAt",
  );

  const [
    movementSortDirection,
    setMovementSortDirection,
  ] = useState<SortDirection>(
    "desc",
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    isDrawerOpen,
    setIsDrawerOpen,
  ] = useState(false);

  const [
    configurationStock,
    setConfigurationStock,
  ] = useState<StockRecord | null>(
    null,
  );

  const [
    configurationMinimum,
    setConfigurationMinimum,
  ] = useState("");

  const [
    configurationMaximum,
    setConfigurationMaximum,
  ] = useState("");

  const [
    configurationReorderPoint,
    setConfigurationReorderPoint,
  ] = useState("");

  const [
    configurationBinLocation,
    setConfigurationBinLocation,
  ] = useState("");

  const [
    configurationError,
    setConfigurationError,
  ] = useState<string | null>(
    null,
  );

  const [
    isConfigurationSubmitting,
    setIsConfigurationSubmitting,
  ] = useState(false);

  const [
    isTransferDrawerOpen,
    setIsTransferDrawerOpen,
  ] = useState(false);

  const [
    transferSourceLocationId,
    setTransferSourceLocationId,
  ] = useState("");

  const [
    transferDestinationLocationId,
    setTransferDestinationLocationId,
  ] = useState("");

  const [
    transferProductId,
    setTransferProductId,
  ] = useState("");

  const [
    transferQuantity,
    setTransferQuantity,
  ] = useState("");

  const [
    transferReason,
    setTransferReason,
  ] = useState(
    "Transferencia entre ubicaciones",
  );

  const [
    transferReference,
    setTransferReference,
  ] = useState("");

  const [
    transferError,
    setTransferError,
  ] = useState<string | null>(
    null,
  );

  const [
    isTransferSubmitting,
    setIsTransferSubmitting,
  ] = useState(false);

  const [
    isLocationsDrawerOpen,
    setIsLocationsDrawerOpen,
  ] = useState(false);

  const [
    isLocationFormOpen,
    setIsLocationFormOpen,
  ] = useState(false);

  const [
    locationForm,
    setLocationForm,
  ] = useState<LocationFormState>({
    ...emptyLocationForm,
  });

  const [
    isLocationSubmitting,
    setIsLocationSubmitting,
  ] = useState(false);

  const [
    locationFormError,
    setLocationFormError,
  ] = useState<string | null>(
    null,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(null);

  const [
    movementType,
    setMovementType,
  ] = useState<MovementType>(
    "Entrada",
  );

  const [
    movementBranchId,
    setMovementBranchId,
  ] = useState("");

  const [
    movementLocationId,
    setMovementLocationId,
  ] = useState("");

  const [
    movementProductId,
    setMovementProductId,
  ] = useState("");

  const [
    movementQuantity,
    setMovementQuantity,
  ] = useState("");

  const [
    movementUnitCost,
    setMovementUnitCost,
  ] = useState("");

  const [
    movementReason,
    setMovementReason,
  ] = useState("");

  const [
    movementReference,
    setMovementReference,
  ] = useState("");

  const [
    isReservationDrawerOpen,
    setIsReservationDrawerOpen,
  ] = useState(false);

  const [
    reservationDealId,
    setReservationDealId,
  ] = useState("");

  const [
    reservationDraftItems,
    setReservationDraftItems,
  ] = useState<
    ReservationDraftItem[]
  >([]);

  const [
    reservationLocationId,
    setReservationLocationId,
  ] = useState("");

  const [
    reservationProductId,
    setReservationProductId,
  ] = useState("");

  const [
    reservationQuantity,
    setReservationQuantity,
  ] = useState("");

  const [
    reservationReference,
    setReservationReference,
  ] = useState("");

  const [
    reservationCustomerName,
    setReservationCustomerName,
  ] = useState("");

  const [
    reservationExpiresAt,
    setReservationExpiresAt,
  ] = useState("");

  const [
    reservationNotes,
    setReservationNotes,
  ] = useState("");

  const [
    reservationError,
    setReservationError,
  ] = useState<string | null>(
    null,
  );

  const [
    isReservationSubmitting,
    setIsReservationSubmitting,
  ] = useState(false);

  const [
    reservationBeingUpdated,
    setReservationBeingUpdated,
  ] = useState<string | null>(
    null,
  );

  const [
    isReactivatingReservations,
    setIsReactivatingReservations,
  ] = useState(false);

  const [
    reservationGroupBeingUpdated,
    setReservationGroupBeingUpdated,
  ] = useState<string | null>(
    null,
  );

  const [
    extensionReservation,
    setExtensionReservation,
  ] = useState<
    ReservationRecord | null
  >(null);

  const [
    extensionReservationGroupId,
    setExtensionReservationGroupId,
  ] = useState<string | null>(
    null,
  );

  const [
    extensionExpiresAt,
    setExtensionExpiresAt,
  ] = useState("");

  const [
    extensionReason,
    setExtensionReason,
  ] = useState(
    "Seguimiento comercial activo",
  );

  const [
    extensionError,
    setExtensionError,
  ] = useState<string | null>(
    null,
  );

  const loadInventory =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setPageError(null);

        const reservationsResponse =
          await fetch(
            "/api/crm/inventory/reservations",
            {
              cache: "no-store",
            },
          );

        const [
          stocksResponse,
          movementsResponse,
          locationsResponse,
          dealsResponse,
          reservationSettingsResponse,
          replenishmentResponse,
        ] = await Promise.all([
          fetch(
            "/api/crm/inventory/stocks",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/inventory/movements",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/inventory/locations?includeInactive=true",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/deals",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/settings/inventory-reservations",
            {
              cache: "no-store",
            },
          ),

          fetch(
            "/api/crm/inventory/replenishment",
            {
              cache: "no-store",
            },
          ),
        ]);

        const stocksPayload =
          (await stocksResponse.json()) as
          StocksResponse;

        const movementsPayload =
          (await movementsResponse.json()) as
          MovementsResponse;

        const locationsPayload =
          (await locationsResponse.json()) as
          LocationsResponse;

        const reservationsPayload =
          (await reservationsResponse.json()) as
          ReservationsResponse;

        const dealsPayload =
          (await dealsResponse.json()) as
          DealsResponse;

        const reservationSettingsPayload =
          (await reservationSettingsResponse.json()) as
          ReservationSettingsResponse;

        const replenishmentPayload =
          (await replenishmentResponse.json()) as
          ReplenishmentResponse;

        if (
          !stocksResponse.ok ||
          !stocksPayload.success
        ) {
          throw new Error(
            stocksPayload.error ??
            "No fue posible cargar las existencias.",
          );
        }

        if (
          !movementsResponse.ok ||
          !movementsPayload.success
        ) {
          throw new Error(
            movementsPayload.error ??
            "No fue posible cargar el historial de movimientos.",
          );
        }

        if (
          !locationsResponse.ok ||
          !locationsPayload.success
        ) {
          throw new Error(
            locationsPayload.error ??
            "No fue posible cargar las ubicaciones de inventario.",
          );
        }

        if (
          !reservationsResponse.ok ||
          !reservationsPayload.success
        ) {
          throw new Error(
            reservationsPayload.error ??
            "No fue posible cargar las reservas de inventario.",
          );
        }

                if (
          !replenishmentResponse.ok ||
          !replenishmentPayload.success
        ) {
          throw new Error(
            replenishmentPayload.error ??
            "No fue posible cargar las solicitudes de reposición.",
          );
        }

        setReplenishmentRequests(
          replenishmentPayload.data ??
          [],
        );

        setStocks(
          stocksPayload.data ?? [],
        );

        setSummary(
          stocksPayload.summary ??
          emptySummary,
        );

        setBranches(
          stocksPayload.branches ??
          [],
        );

        setLocations(
          locationsPayload.data ??
          [],
        );

        setPermissions(
          stocksPayload.permissions ??
          {
            canView: false,
            canCreate: false,
            canEdit: false,
            canManage: false,
            canViewCost: false,
          },
        );

        setPrimaryBranchId(
          stocksPayload.primaryBranchId ??
          null,
        );

        setMovements(
          movementsPayload.data ?? [],
        );

        setReservations(
          reservationsPayload.data ??
          [],
        );

        if (
          !dealsResponse.ok ||
          !dealsPayload.success
        ) {
          throw new Error(
            dealsPayload.error ??
            "No fue posible cargar las oportunidades.",
          );
        }

        if (
          !reservationSettingsResponse.ok ||
          !reservationSettingsPayload.success ||
          !reservationSettingsPayload.data
        ) {
          throw new Error(
            reservationSettingsPayload.error ??
            "No fue posible cargar la política de reservas.",
          );
        }

        setDeals(
          dealsPayload.data ?? [],
        );

        setReservationSettings(
          reservationSettingsPayload
            .data.settings,
        );
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el inventario.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search,
      );

    if (
      searchParams.get("view") ===
      "reservations"
    ) {
      setActiveView(
        "reservations",
      );
    }

    setLinkedDealReservationId(
      searchParams.get(
        "dealId",
      ),
    );
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [successMessage]);

  const products =
    useMemo<ProductOption[]>(() => {
      const productsById =
        new Map<
          string,
          ProductOption
        >();

      for (const stock of stocks) {
        if (
          productsById.has(
            stock.productId,
          )
        ) {
          continue;
        }

        productsById.set(
          stock.productId,
          {
            id: stock.productId,
            name: stock.productName,
            code:
              stock.productCode,
            label:
              stock.productCode
                ? `${stock.productName} (${stock.productCode})`
                : stock.productName,
          },
        );
      }

      return Array.from(
        productsById.values(),
      ).sort((a, b) =>
        a.label.localeCompare(
          b.label,
          "es",
        ),
      );
    }, [stocks]);

  const selectedStock =
    useMemo(
      () =>
        stocks.find(
          (stock) =>
            stock.locationId ===
            movementLocationId &&
            stock.productId ===
            movementProductId,
        ),
      [
        stocks,
        movementLocationId,
        movementProductId,
      ],
    );

  const transferSourceStock =
    useMemo(
      () =>
        stocks.find(
          (stock) =>
            stock.initialized &&
            stock.locationId ===
            transferSourceLocationId &&
            stock.productId ===
            transferProductId,
        ) ?? null,
      [
        stocks,
        transferSourceLocationId,
        transferProductId,
      ],
    );

  const transferDestinationLocations =
    useMemo(
      () =>
        activeLocations.filter(
          (inventoryLocation) =>
            inventoryLocation.value !==
            transferSourceLocationId,
        ),
      [
        activeLocations,
        transferSourceLocationId,
      ],
    );

  const inventoryProductTypes =
    useMemo(
      () =>
        Array.from(
          new Map(
            stocks.map(
              (stock) => [
                stock.productTypeId,
                {
                  id:
                    stock.productTypeId,
                  name:
                    stock.productTypeName,
                },
              ],
            ),
          ).values(),
        ).sort(
          (first, second) =>
            first.name.localeCompare(
              second.name,
              "es-MX",
              {
                sensitivity:
                  "base",
              },
            ),
        ),
      [stocks],
    );

  const inventoryCategories =
    useMemo(
      () =>
        Array.from(
          new Set(
            stocks
              .filter(
                (stock) =>
                  !productTypeFilter ||
                  stock.productTypeId ===
                    productTypeFilter,
              )
              .map(
                (stock) =>
                  stock.category,
              )
              .filter(
                (
                  category,
                ): category is string =>
                  Boolean(category),
              ),
          ),
        ).sort(
          (first, second) =>
            first.localeCompare(
              second,
              "es-MX",
              {
                sensitivity:
                  "base",
              },
            ),
        ),
      [
        stocks,
        productTypeFilter,
      ],
    );

  const visibleStocks =
    useMemo<
      ConsolidatedStockRecord[]
    >(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      const filteredLocationStocks =
        stocks.filter(
          (stock) => {
            if (!stock.initialized) {
              return false;
            }

            if (
              branchFilter &&
              stock.branchId !==
              branchFilter
            ) {
              return false;
            }

            if (
              productTypeFilter &&
              stock.productTypeId !==
                productTypeFilter
            ) {
              return false;
            }

            if (
              categoryFilter &&
              stock.category !==
                categoryFilter
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            return [
              stock.productName,
              stock.productCode,
              stock.category,
              stock.locationLabel,
              stock.locationType,
              stock.branchName,
              stock.binLocation,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
              );
          },
        );

      const recordsByProduct =
        new Map<
          string,
          ConsolidatedStockRecord
        >();

      for (
        const stock of
        filteredLocationStocks
      ) {
        const existing =
          recordsByProduct.get(
            stock.productId,
          );

        if (!existing) {
          recordsByProduct.set(
            stock.productId,
            {
              id:
                stock.productId,

              productId:
                stock.productId,

              productName:
                stock.productName,

              productCode:
                stock.productCode,

              productTypeId:
                stock.productTypeId,

              productTypeName:
                stock.productTypeName,

              category:
                stock.category,

              quantity:
                stock.quantity,

              reservedQuantity:
                stock.reservedQuantity,

              availableQuantity:
                stock.availableQuantity,

              locationCount:
                stock.quantity > 0
                  ? 1
                  : 0,

              inventoryValue:
                stock.inventoryValue,

              commercialValue:
                stock.commercialValue,

              currency:
                stock.currency,

              status:
                stock.status,

              locations: [
                stock,
              ],
            },
          );

          continue;
        }

        existing.quantity +=
          stock.quantity;

        existing.reservedQuantity +=
          stock.reservedQuantity;

        existing.availableQuantity +=
          stock.availableQuantity;

        if (stock.quantity > 0) {
          existing.locationCount +=
            1;
        }

        existing.commercialValue +=
          stock.commercialValue;

        if (
          existing.inventoryValue ===
          null ||
          stock.inventoryValue ===
          null
        ) {
          existing.inventoryValue =
            null;
        } else {
          existing.inventoryValue +=
            stock.inventoryValue;
        }

        existing.locations.push(
          stock,
        );
      }

      const consolidatedRecords =
        Array.from(
          recordsByProduct.values(),
        ).map((record) => {
          const hasLowLocation =
            record.locations.some(
              (stock) =>
                stock.status ===
                "Bajo",
            );

          const consolidatedStatus:
            InventoryStatus =
            record.availableQuantity <=
              0
              ? "Agotado"
              : hasLowLocation
                ? "Bajo"
                : "Disponible";

          return {
            ...record,

            status:
              consolidatedStatus,
          };
        });

      const statusFilteredRecords =
        statusFilter
          ? consolidatedRecords.filter(
            (record) =>
              record.status ===
              statusFilter,
          )
          : consolidatedRecords;

      return [
        ...statusFilteredRecords,
      ].sort((first, second) => {
        const result =
          compareSortValues(
            first[stockSortField],
            second[stockSortField],
          );

        return stockSortDirection ===
          "asc"
          ? result
          : -result;
      });
    }, [
      stocks,
      search,
      branchFilter,
      productTypeFilter,
      categoryFilter,
      statusFilter,
      stockSortField,
      stockSortDirection,
    ]);

    const replenishmentSuggestions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return stocks
        .filter((stock) => {
          if (!stock.initialized) {
            return false;
          }

          if (
            branchFilter &&
            stock.branchId !==
              branchFilter
          ) {
            return false;
          }

          const triggerQuantity =
            stock.reorderPoint ??
            stock.minimumQuantity;

          if (
            stock.availableQuantity >
            triggerQuantity
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            stock.productName,
            stock.productCode,
            stock.locationLabel,
            stock.branchName,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ),
            );
        })
        .map((stock) => {
          const triggerQuantity =
            stock.reorderPoint ??
            stock.minimumQuantity;

          const targetQuantity =
            stock.maximumQuantity ??
            stock.minimumQuantity;

          return {
            ...stock,

            triggerQuantity,

            targetQuantity,

            suggestedQuantity:
              Math.max(
                0,
                targetQuantity -
                  stock.availableQuantity,
              ),

            requiresMaximum:
              stock.maximumQuantity ===
              null,
          };
        })
        .sort(
          (first, second) =>
            first.availableQuantity -
            second.availableQuantity,
        );
    }, [
      stocks,
      search,
      branchFilter,
    ]);

  const visibleMovements =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      const filteredMovements =
        movements.filter(
          (movement) => {
            if (
              branchFilter &&
              movement.branchId !==
              branchFilter
            ) {
              return false;
            }

            if (
              movementTypeFilter &&
              movement.type !==
              movementTypeFilter
            ) {
              return false;
            }

            if (
              normalizedSearch &&
              ![
                movement.productName,
                movement.productCode,
                movement.locationName,
                movement.branchName,
                movement.reason,
                movement.reference,
                movement.performedByName,
              ]
                .filter(Boolean)
                .some((value) =>
                  String(value)
                    .toLowerCase()
                    .includes(
                      normalizedSearch,
                    ),
                )
            ) {
              return false;
            }

            return true;
          },
        );

      return [
        ...filteredMovements,
      ].sort((first, second) => {
        const result =
          compareSortValues(
            first[
            movementSortField
            ],
            second[
            movementSortField
            ],
          );

        return movementSortDirection ===
          "asc"
          ? result
          : -result;
      });
    }, [
      movements,
      search,
      branchFilter,
      movementTypeFilter,
      movementSortField,
      movementSortDirection,
    ]);

  const visibleReservations =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return reservations
        .filter(
          (reservation) => {
            if (
              branchFilter &&
              reservation.branchId !==
              branchFilter
            ) {
              return false;
            }

            if (
              linkedDealReservationId &&
              reservation.sourceId !==
              linkedDealReservationId
            ) {
              return false;
            }

            if (
              reservationStatusFilter &&
              reservation.status !==
              reservationStatusFilter
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            return [
              reservation.productName,
              reservation.productCode,
              reservation.locationLabel,
              reservation.branchLabel,
              reservation.sourceType,
              reservation.sourceReference,
              reservation.customerName,
              reservation.notes,
              reservation.createdByName,
              reservation.status,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
              );
          },
        )
        .sort(
          (first, second) => {
            if (
              first.status ===
              "Activa" &&
              second.status !==
              "Activa"
            ) {
              return -1;
            }

            if (
              first.status !==
              "Activa" &&
              second.status ===
              "Activa"
            ) {
              return 1;
            }

            return (
              new Date(
                second.createdAt,
              ).getTime() -
              new Date(
                first.createdAt,
              ).getTime()
            );
          },
        );
    }, [
      reservations,
      search,
      branchFilter,
      linkedDealReservationId,
      reservationStatusFilter,
    ]);

  function handleStockSort(
    field: StockSortField,
  ) {
    if (
      stockSortField === field
    ) {
      setStockSortDirection(
        (current) =>
          current === "asc"
            ? "desc"
            : "asc",
      );
      return;
    }

    setStockSortField(field);
    setStockSortDirection("asc");
  }

  function handleMovementSort(
    field: MovementSortField,
  ) {
    if (
      movementSortField === field
    ) {
      setMovementSortDirection(
        (current) =>
          current === "asc"
            ? "desc"
            : "asc",
      );
      return;
    }

    setMovementSortField(field);
    setMovementSortDirection(
      field === "createdAt"
        ? "desc"
        : "asc",
    );
  }

  function openNewLocationForm() {
    setLocationForm({
      ...emptyLocationForm,
      branchId:
        primaryBranchId ?? "",
    });

    setLocationFormError(null);
    setIsLocationFormOpen(true);
  }

  function openEditLocationForm(
    inventoryLocation:
      LocationOption,
  ) {
    setLocationForm({
      id:
        inventoryLocation.value,
      branchId:
        inventoryLocation.branchId ??
        "",
      name:
        inventoryLocation.name,
      code:
        inventoryLocation.code ??
        "",
      type:
        inventoryLocation.type,
      active:
        inventoryLocation.active,
      isDefault:
        inventoryLocation.isDefault,
      addressLine:
        inventoryLocation.addressLine ??
        "",
      city:
        inventoryLocation.city ??
        "",
      state:
        inventoryLocation.state ??
        "",
      postalCode:
        inventoryLocation.postalCode ??
        "",
      country:
        inventoryLocation.country ||
        "MX",
    });

    setLocationFormError(null);
    setIsLocationFormOpen(true);
  }

  async function handleLocationSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setLocationFormError(null);

    if (
      !locationForm.name.trim()
    ) {
      setLocationFormError(
        "Captura el nombre de la ubicación.",
      );
      return;
    }

    try {
      setIsLocationSubmitting(
        true,
      );

      const isEditing =
        Boolean(locationForm.id);

      const response =
        await fetch(
          "/api/crm/inventory/locations",
          {
            method: isEditing
              ? "PATCH"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              ...(isEditing
                ? {
                  id:
                    locationForm.id,
                }
                : {}),

              branchId:
                locationForm.branchId ||
                undefined,

              name:
                locationForm.name.trim(),

              code:
                locationForm.code.trim() ||
                undefined,

              type:
                locationForm.type,

              active:
                locationForm.active,

              isDefault:
                locationForm.isDefault,

              addressLine:
                locationForm.addressLine.trim() ||
                undefined,

              city:
                locationForm.city.trim() ||
                undefined,

              state:
                locationForm.state.trim() ||
                undefined,

              postalCode:
                locationForm.postalCode.trim() ||
                undefined,

              country:
                locationForm.country.trim() ||
                "MX",
            }),
          },
        );

      const result =
        (await response.json()) as
        LocationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible guardar la ubicación.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La ubicación fue guardada correctamente.",
      );

      setIsLocationFormOpen(false);
      setLocationForm({
        ...emptyLocationForm,
      });

      await loadInventory();
    } catch (error) {
      setLocationFormError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la ubicación.",
      );
    } finally {
      setIsLocationSubmitting(
        false,
      );
    }
  }

  async function handleToggleLocationActive(
    inventoryLocation:
      LocationOption,
  ) {
    if (!permissions.canManage) {
      return;
    }

    const nextActive =
      !inventoryLocation.active;

    const confirmed =
      window.confirm(
        nextActive
          ? `¿Deseas reactivar "${inventoryLocation.name}"?`
          : `¿Deseas desactivar "${inventoryLocation.name}"? Su historial y existencias se conservarán.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setPageError(null);

      const response =
        await fetch(
          "/api/crm/inventory/locations",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id:
                inventoryLocation.value,
              branchId:
                inventoryLocation.branchId ||
                undefined,
              name:
                inventoryLocation.name,
              code:
                inventoryLocation.code ||
                undefined,
              type:
                inventoryLocation.type,
              active:
                nextActive,
              isDefault:
                nextActive
                  ? inventoryLocation.isDefault
                  : false,
              addressLine:
                inventoryLocation.addressLine ||
                undefined,
              city:
                inventoryLocation.city ||
                undefined,
              state:
                inventoryLocation.state ||
                undefined,
              postalCode:
                inventoryLocation.postalCode ||
                undefined,
              country:
                inventoryLocation.country ||
                "MX",
            }),
          },
        );

      const result =
        (await response.json()) as
        LocationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible actualizar la ubicación.",
        );
      }

      setSuccessMessage(
        nextActive
          ? "La ubicación fue reactivada correctamente."
          : "La ubicación fue desactivada correctamente.",
      );

      await loadInventory();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la ubicación.",
      );
    }
  }

  function toggleProductLocations(
    productId: string,
  ) {
    setExpandedProductIds(
      (currentIds) =>
        currentIds.includes(
          productId,
        )
          ? currentIds.filter(
            (id) =>
              id !== productId,
          )
          : [
            ...currentIds,
            productId,
          ],
    );
  }

  function toggleReservationGroup(
    groupId: string,
  ) {
    setExpandedReservationGroupIds(
      (currentIds) =>
        currentIds.includes(
          groupId,
        )
          ? currentIds.filter(
            (id) =>
              id !== groupId,
          )
          : [
            ...currentIds,
            groupId,
          ],
    );
  }

  function openReservationDrawer(
    stock?: StockRecord,
  ) {
    if (
      !permissions.canCreate
    ) {
      return;
    }

    const reservableStock =
      stock ??
      stocks.find(
        (item) =>
          item.initialized &&
          item.availableQuantity >
          0 &&
          activeLocations.some(
            (inventoryLocation) =>
              inventoryLocation.value ===
              item.locationId,
          ),
      );

    setReservationDealId("");

    setReservationDraftItems(
      [],
    );

    setReservationLocationId(
      reservableStock
        ?.locationId ?? "",
    );

    setReservationProductId(
      reservableStock
        ?.productId ?? "",
    );

    setReservationQuantity("");
    setReservationReference("");
    setReservationCustomerName("");
    setReservationExpiresAt(
      getReservationExpirationValue(
        reservationSettings
          .manualHours,
      ),
    );
    setReservationNotes("");
    setReservationError(null);

    setIsReservationDrawerOpen(
      true,
    );
  }

  function closeReservationDrawer() {
    if (
      isReservationSubmitting
    ) {
      return;
    }

    setIsReservationDrawerOpen(
      false,
    );

    setReservationError(null);
  }

  function handleReservationDealChange(
    dealId: string,
  ) {
    setReservationDealId(
      dealId,
    );

    setReservationDraftItems(
      [],
    );

    if (!dealId) {
      setReservationCustomerName(
        "",
      );

      setReservationReference(
        "",
      );

      setReservationNotes(
        "",
      );

      return;
    }

    const deal =
      deals.find(
        (item) =>
          item.id === dealId,
      );

    if (!deal) {
      return;
    }

    const normalizedStage =
      deal.stage
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        );

    if (
      normalizedStage.includes(
        "prospecto",
      ) ||
      normalizedStage.includes(
        "contactado",
      )
    ) {
      setReservationDealId(
        "",
      );

      setReservationError(
        "Las oportunidades en etapa Prospecto o Contactado todavía no pueden reservar inventario.",
      );

      return;
    }

    const expirationHours =
      normalizedStage.includes(
        "anticipo",
      )
        ? reservationSettings
          .depositHours
        : normalizedStage.includes(
          "negoci",
        )
          ? reservationSettings
            .negotiationHours
          : normalizedStage.includes(
            "propuesta",
          ) ||
            normalizedStage.includes(
              "cotiza",
            )
            ? reservationSettings
              .proposalHours
            : reservationSettings
              .qualifiedHours;

    setReservationExpiresAt(
      getReservationExpirationValue(
        expirationHours,
      ),
    );

    setReservationError(null);

    setReservationCustomerName(
      deal.customerName ?? "",
    );

    setReservationReference(
      deal.name,
    );

    const groupedItems =
      new Map<
        string,
        {
          dealItemId: string;
          productId: string;
          productName: string;
          requestedQuantity:
          number;
        }
      >();

    for (
      const dealItem of
      deal.items
    ) {
      if (!dealItem.productId) {
        continue;
      }

      const requestedQuantity =
        Number(
          dealItem.quantity,
        );

      if (
        !Number.isInteger(
          requestedQuantity,
        ) ||
        requestedQuantity <= 0
      ) {
        continue;
      }

      const current =
        groupedItems.get(
          dealItem.productId,
        );

      if (current) {
        current.requestedQuantity +=
          requestedQuantity;

        continue;
      }

      groupedItems.set(
        dealItem.productId,
        {
          dealItemId:
            dealItem.id,

          productId:
            dealItem.productId,

          productName:
            dealItem.name,

          requestedQuantity,
        },
      );
    }

    const nextDraftItems =
      Array.from(
        groupedItems.values(),
      ).map((dealItem) => {
        const matchingStock =
          stocks.find(
            (stock) =>
              stock.initialized &&
              stock.productId ===
              dealItem.productId &&
              stock.availableQuantity >=
              dealItem.requestedQuantity &&
              stock.branchId ===
              deal.branchId &&
              activeLocations.some(
                (
                  inventoryLocation,
                ) =>
                  inventoryLocation.value ===
                  stock.locationId,
              ),
          ) ??
          stocks.find(
            (stock) =>
              stock.initialized &&
              stock.productId ===
              dealItem.productId &&
              stock.availableQuantity >=
              dealItem.requestedQuantity &&
              activeLocations.some(
                (
                  inventoryLocation,
                ) =>
                  inventoryLocation.value ===
                  stock.locationId,
              ),
          ) ??
          stocks.find(
            (stock) =>
              stock.initialized &&
              stock.productId ===
              dealItem.productId &&
              stock.availableQuantity >
              0 &&
              activeLocations.some(
                (
                  inventoryLocation,
                ) =>
                  inventoryLocation.value ===
                  stock.locationId,
              ),
          );

        return {
          key:
            crypto.randomUUID(),

          dealItemId:
            dealItem.dealItemId,

          productId:
            dealItem.productId,

          productName:
            dealItem.productName,

          requestedQuantity:
            dealItem
              .requestedQuantity,

          quantity:
            String(
              dealItem
                .requestedQuantity,
            ),

          locationId:
            matchingStock
              ?.locationId ?? "",

          selected: true,
        };
      });

    setReservationDraftItems(
      nextDraftItems,
    );

    const firstDraftItem =
      nextDraftItems[0];

    setReservationLocationId(
      firstDraftItem
        ?.locationId ?? "",
    );

    setReservationProductId(
      firstDraftItem
        ?.productId ?? "",
    );

    setReservationQuantity(
      firstDraftItem
        ?.quantity ?? "",
    );

    setReservationNotes(
      [
        `Oportunidad: ${deal.name}`,

        deal.itemsSummary
          ? `Productos: ${deal.itemsSummary}`
          : null,

        `Etapa: ${deal.stage}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  async function handleReservationSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setReservationError(null);

    if (
      !reservationExpiresAt
    ) {
      setReservationError(
        "Selecciona la fecha y hora de vencimiento de la reserva.",
      );
      return;
    }

    const isOpportunityReservation =
      Boolean(
        reservationDealId,
      );

    const selectedDraftItems =
      reservationDraftItems.filter(
        (item) =>
          item.selected,
      );

    let requestUrl =
      "/api/crm/inventory/reservations";

    let requestBody:
      Record<string, unknown>;

    if (
      isOpportunityReservation
    ) {
      if (
        selectedDraftItems.length ===
        0
      ) {
        setReservationError(
          `La oportunidad no contiene ${productPluralLabel.toLowerCase()} disponibles para reservar.`,
        );
        return;
      }

      const validatedItems:
        Array<{
          locationId: string;
          productId: string;
          quantity: number;
        }> = [];

      for (
        const draftItem of
        selectedDraftItems
      ) {
        if (
          !draftItem.locationId
        ) {
          setReservationError(
            `Selecciona una ubicación para "${draftItem.productName}".`,
          );
          return;
        }

        const quantity =
          Number(
            draftItem.quantity,
          );

        if (
          !Number.isInteger(
            quantity,
          ) ||
          quantity <= 0
        ) {
          setReservationError(
            `La cantidad de "${draftItem.productName}" debe ser un entero mayor que cero.`,
          );
          return;
        }

        const selectedStock =
          stocks.find(
            (stock) =>
              stock.initialized &&
              stock.locationId ===
              draftItem.locationId &&
              stock.productId ===
              draftItem.productId,
          );

        if (!selectedStock) {
          setReservationError(
            `"${draftItem.productName}" no tiene existencias inicializadas en la ubicación seleccionada.`,
          );
          return;
        }

        if (
          quantity >
          selectedStock
            .availableQuantity
        ) {
          setReservationError(
            `Solo hay ${selectedStock.availableQuantity} unidad(es) disponibles de "${draftItem.productName}" en la ubicación seleccionada.`,
          );
          return;
        }

        validatedItems.push({
          locationId:
            draftItem.locationId,

          productId:
            draftItem.productId,

          quantity,
        });
      }

      requestUrl =
        "/api/crm/inventory/reservations/bulk";

      requestBody = {
        sourceId:
          reservationDealId,

        sourceReference:
          reservationReference
            .trim() ||
          undefined,

        customerName:
          reservationCustomerName
            .trim() ||
          undefined,

        expiresAt:
          reservationExpiresAt,

        notes:
          reservationNotes
            .trim() ||
          undefined,

        items:
          validatedItems,
      };
    } else {
      if (
        !reservationLocationId ||
        !reservationProductId
      ) {
        setReservationError(
          `Selecciona la ubicación y el ${productSingularLabel.toLowerCase()}.`,
        );
        return;
      }

      const quantity =
        Number(
          reservationQuantity,
        );

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        setReservationError(
          "La cantidad reservada debe ser un entero mayor que cero.",
        );
        return;
      }

      const selectedStock =
        stocks.find(
          (stock) =>
            stock.initialized &&
            stock.locationId ===
            reservationLocationId &&
            stock.productId ===
            reservationProductId,
        );

      if (!selectedStock) {
        setReservationError(
          `El ${productSingularLabel.toLowerCase()} no tiene existencias inicializadas en la ubicación seleccionada.`,
        );
        return;
      }

      if (
        quantity >
        selectedStock
          .availableQuantity
      ) {
        setReservationError(
          `Solo hay ${selectedStock.availableQuantity} unidades disponibles para reservar.`,
        );
        return;
      }

      requestBody = {
        locationId:
          reservationLocationId,

        productId:
          reservationProductId,

        quantity,

        sourceType:
          "Manual",

        sourceReference:
          reservationReference
            .trim() ||
          undefined,

        customerName:
          reservationCustomerName
            .trim() ||
          undefined,

        expiresAt:
          reservationExpiresAt,

        notes:
          reservationNotes
            .trim() ||
          undefined,
      };
    }

    try {
      setIsReservationSubmitting(
        true,
      );

      const response =
        await fetch(
          requestUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody,
              ),
          },
        );

      const result =
        (await response.json()) as
        ReservationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible registrar la reserva.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La reserva fue registrada correctamente.",
      );

      setIsReservationDrawerOpen(
        false,
      );

      setReservationDraftItems(
        [],
      );

      setActiveView(
        "reservations",
      );

      await loadInventory();
    } catch (error) {
      setReservationError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la reserva.",
      );
    } finally {
      setIsReservationSubmitting(
        false,
      );
    }
  }

  async function handleReactivateReservations() {
    if (
      !linkedDealReservationId ||
      isReactivatingReservations
    ) {
      return;
    }

    try {
      setIsReactivatingReservations(
        true,
      );

      setPageError(null);

      const response =
        await fetch(
          "/api/crm/inventory/reservations/bulk",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sourceId:
                linkedDealReservationId,

              expiresAt:
                getReservationExpirationValue(
                  reservationSettings
                    .depositHours,
                ),
            }),
          },
        );

      const result =
        (await response.json()) as
        ReservationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible reactivar las reservas.",
        );
      }

      setSuccessMessage(
        result.message ??
        "Las reservas fueron reactivadas correctamente.",
      );

      await loadInventory();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "No fue posible reactivar las reservas.",
      );
    } finally {
      setIsReactivatingReservations(
        false,
      );
    }
  }

  async function handleReservationGroupAction(
    sourceId: string,
    action:
      | "Entregar"
      | "Liberar"
      | "Cancelar",
  ) {
    if (
      reservationGroupBeingUpdated
    ) {
      return;
    }

    const confirmationMessage =
      action === "Entregar"
        ? "¿Confirmas la entrega de todos los modelos reservados? Se descontarán las existencias y se registrará una salida en el Kardex por cada modelo."
        : action === "Cancelar"
          ? "¿Confirmas la cancelación de todas las reservas de esta oportunidad?"
          : "¿Confirmas la liberación de todas las reservas de esta oportunidad?";

    if (
      !window.confirm(
        confirmationMessage,
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        action === "Entregar"
          ? "Motivo o referencia de la entrega:"
          : action === "Cancelar"
            ? "Motivo de la cancelación:"
            : "Motivo de la liberación:",
        action === "Entregar"
          ? "Entrega completa al cliente"
          : action === "Cancelar"
            ? "Reservas canceladas"
            : "Reservas liberadas",
      );

    if (reason === null) {
      return;
    }

    try {
      setReservationGroupBeingUpdated(
        sourceId,
      );

      setPageError(null);

      const response =
        await fetch(
          "/api/crm/inventory/reservations/bulk",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sourceId,
              action,

              reason:
                reason.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
        ReservationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible actualizar el grupo de reservas.",
        );
      }

      setSuccessMessage(
        result.message ??
        "El grupo de reservas fue actualizado correctamente.",
      );

      await loadInventory();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el grupo de reservas.",
      );
    } finally {
      setReservationGroupBeingUpdated(
        null,
      );
    }
  }

  async function handleReservationAction(
    reservation:
      ReservationRecord,

    action:
      | "Liberar"
      | "Cancelar"
      | "Consumir",
  ) {
    if (
      !permissions.canEdit ||
      reservation.status !==
      "Activa"
    ) {
      return;
    }

    const confirmationMessage =
      action === "Consumir"
        ? `¿Confirmas la entrega de ${reservation.quantity} unidad(es)? Esto descontará la existencia física y registrará la salida en el Kardex.`
        : action === "Cancelar"
          ? "¿Confirmas la cancelación de esta reserva? Las unidades volverán a estar disponibles."
          : "¿Confirmas la liberación de esta reserva? Las unidades volverán a estar disponibles.";

    if (
      !window.confirm(
        confirmationMessage,
      )
    ) {
      return;
    }

    const releaseReason =
      window.prompt(
        action === "Consumir"
          ? "Motivo o referencia de la entrega:"
          : action === "Cancelar"
            ? "Motivo de la cancelación:"
            : "Motivo de la liberación:",
        action === "Consumir"
          ? "Entrega al cliente"
          : action === "Cancelar"
            ? "Reserva cancelada"
            : "Reserva liberada",
      );

    if (
      releaseReason === null
    ) {
      return;
    }

    try {
      setReservationBeingUpdated(
        reservation.id,
      );

      setPageError(null);

      const response =
        await fetch(
          "/api/crm/inventory/reservations",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id:
                reservation.id,

              action,

              releaseReason:
                releaseReason.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
        ReservationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible actualizar la reserva.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La reserva fue actualizada correctamente.",
      );

      await loadInventory();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la reserva.",
      );
    } finally {
      setReservationBeingUpdated(
        null,
      );
    }
  }

  function openExtensionDrawer(
    reservation:
      ReservationRecord,
  ) {
    if (
      !permissions.canEdit ||
      reservation.status !==
      "Activa"
    ) {
      return;
    }

    if (
      !reservationSettings
        .allowExtensions
    ) {
      setPageError(
        "La política de reservas no permite extensiones.",
      );
      return;
    }

    const currentExpiration =
      reservation.expiresAt
        ? new Date(
          reservation.expiresAt,
        )
        : new Date();

    const suggestedExpiration =
      new Date(
        Math.max(
          currentExpiration.getTime(),
          Date.now(),
        ) +
        24 *
        60 *
        60 *
        1000,
      );

    const timezoneOffset =
      suggestedExpiration
        .getTimezoneOffset() *
      60 *
      1000;

    const suggestedValue =
      new Date(
        suggestedExpiration
          .getTime() -
        timezoneOffset,
      )
        .toISOString()
        .slice(0, 16);

    setExtensionReservation(
      reservation,
    );

    setExtensionExpiresAt(
      suggestedValue,
    );

    setExtensionReason(
      "Seguimiento comercial activo",
    );

    setExtensionReservationGroupId(
      null,
    );

    setExtensionError(null);
  }

  function openGroupExtensionDrawer(
    sourceId: string,
  ) {
    if (
      !permissions.canEdit ||
      !reservationSettings
        .allowExtensions
    ) {
      return;
    }

    const groupReservations =
      reservations.filter(
        (reservation) =>
          reservation.sourceType ===
            "Oportunidad" &&
          reservation.sourceId ===
            sourceId &&
          reservation.status ===
            "Activa",
      );

    const firstReservation =
      groupReservations[0];

    if (!firstReservation) {
      setPageError(
        "No hay reservas activas para extender en este grupo.",
      );
      return;
    }

    const latestExpiration =
      groupReservations.reduce(
        (latest, reservation) => {
          const expiration =
            reservation.expiresAt
              ? new Date(
                  reservation.expiresAt,
                ).getTime()
              : Date.now();

          return Math.max(
            latest,
            expiration,
          );
        },
        Date.now(),
      );

    const suggestedExpiration =
      new Date(
        latestExpiration +
          24 *
            60 *
            60 *
            1000,
      );

    const timezoneOffset =
      suggestedExpiration
        .getTimezoneOffset() *
      60 *
      1000;

    const suggestedValue =
      new Date(
        suggestedExpiration
          .getTime() -
          timezoneOffset,
      )
        .toISOString()
        .slice(0, 16);

    setExtensionReservation(
      firstReservation,
    );

    setExtensionReservationGroupId(
      sourceId,
    );

    setExtensionExpiresAt(
      suggestedValue,
    );

    setExtensionReason(
      "Seguimiento comercial activo",
    );

    setExtensionError(null);
  }

  function closeExtensionDrawer() {
    if (
      (
        extensionReservation &&
        reservationBeingUpdated ===
          extensionReservation.id
      ) ||
      (
        extensionReservationGroupId &&
        reservationGroupBeingUpdated ===
          extensionReservationGroupId
      )
    ) {
      return;
    }

    setExtensionReservation(
      null,
    );

    setExtensionReservationGroupId(
      null,
    );

    setExtensionError(null);
  }

  async function handleExtensionSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setExtensionError(null);

    if (!extensionReservation) {
      return;
    }

    if (!extensionExpiresAt) {
      setExtensionError(
        "Selecciona la nueva fecha y hora de vencimiento.",
      );
      return;
    }

    const requestedDate =
      new Date(
        extensionExpiresAt,
      );

    if (
      Number.isNaN(
        requestedDate.getTime(),
      )
    ) {
      setExtensionError(
        "La nueva fecha de vencimiento no es válida.",
      );
      return;
    }

    try {
      if (
        extensionReservationGroupId
      ) {
        setReservationGroupBeingUpdated(
          extensionReservationGroupId,
        );
      } else {
        setReservationBeingUpdated(
          extensionReservation.id,
        );
      }

      const response =
        await fetch(
          extensionReservationGroupId
            ? "/api/crm/inventory/reservations/bulk"
            : "/api/crm/inventory/reservations",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              extensionReservationGroupId
                ? {
                    sourceId:
                      extensionReservationGroupId,

                    action:
                      "Extender",

                    expiresAt:
                      requestedDate
                        .toISOString(),

                    reason:
                      extensionReason.trim() ||
                      undefined,
                  }
                : {
                    id:
                      extensionReservation.id,

                    action:
                      "Extender",

                    expiresAt:
                      requestedDate
                        .toISOString(),

                    releaseReason:
                      extensionReason.trim() ||
                      undefined,
                  },
            ),
          },
        );

      const result =
        (await response.json()) as
        ReservationWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible extender la reserva.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La reserva fue extendida correctamente.",
      );

      setExtensionReservation(
        null,
      );

      setExtensionReservationGroupId(
        null,
      );

      await loadInventory();
    } catch (error) {
      setExtensionError(
        error instanceof Error
          ? error.message
          : "No fue posible extender la reserva.",
      );
    } finally {
      setReservationBeingUpdated(
        null,
      );

      setReservationGroupBeingUpdated(
        null,
      );
    }
  }

  function openTransferDrawer(
    stock?: StockRecord,
  ) {
    if (!permissions.canEdit) {
      return;
    }

    const sourceStock =
      stock ??
      stocks.find(
        (item) =>
          item.initialized &&
          item.availableQuantity >
          0,
      );

    const sourceLocationId =
      sourceStock?.locationId ??
      "";

    const destinationLocation =
      activeLocations.find(
        (inventoryLocation) =>
          inventoryLocation.value !==
          sourceLocationId,
      );

    setTransferSourceLocationId(
      sourceLocationId,
    );

    setTransferDestinationLocationId(
      destinationLocation?.value ??
      "",
    );

    setTransferProductId(
      sourceStock?.productId ??
      "",
    );

    setTransferQuantity("");

    setTransferReason(
      "Transferencia entre ubicaciones",
    );

    setTransferReference("");
    setTransferError(null);

    setIsTransferDrawerOpen(
      true,
    );
  }

  function handleTransferSourceLocationChange(
    locationId: string,
  ) {
    const firstAvailableStock =
      stocks.find(
        (stock) =>
          stock.initialized &&
          stock.locationId ===
          locationId &&
          stock.availableQuantity >
          0,
      );

    const nextDestination =
      activeLocations.find(
        (inventoryLocation) =>
          inventoryLocation.value !==
          locationId,
      );

    setTransferSourceLocationId(
      locationId,
    );

    setTransferProductId(
      firstAvailableStock
        ?.productId ?? "",
    );

    if (
      transferDestinationLocationId ===
      locationId ||
      !transferDestinationLocationId
    ) {
      setTransferDestinationLocationId(
        nextDestination?.value ??
        "",
      );
    }

    setTransferQuantity("");
    setTransferError(null);
  }

  async function handleTransferSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setTransferError(null);

    if (
      !transferSourceLocationId ||
      !transferDestinationLocationId
    ) {
      setTransferError(
        "Selecciona las ubicaciones de origen y destino.",
      );
      return;
    }

    if (
      transferSourceLocationId ===
      transferDestinationLocationId
    ) {
      setTransferError(
        "La ubicación de destino debe ser diferente a la de origen.",
      );
      return;
    }

    if (
      !transferProductId ||
      !transferSourceStock
    ) {
      setTransferError(
        `Selecciona un ${productSingularLabel.toLowerCase()} con existencias en el origen.`,
      );
      return;
    }

    const parsedQuantity =
      Number(
        transferQuantity,
      );

    if (
      !Number.isInteger(
        parsedQuantity,
      ) ||
      parsedQuantity <= 0
    ) {
      setTransferError(
        "La cantidad debe ser un entero mayor que cero.",
      );
      return;
    }

    if (
      parsedQuantity >
      transferSourceStock
        .availableQuantity
    ) {
      setTransferError(
        `Solo hay ${transferSourceStock.availableQuantity} unidades disponibles para transferir.`,
      );
      return;
    }

    try {
      setIsTransferSubmitting(
        true,
      );

      const response =
        await fetch(
          "/api/crm/inventory/transfers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              sourceLocationId:
                transferSourceLocationId,

              destinationLocationId:
                transferDestinationLocationId,

              productId:
                transferProductId,

              quantity:
                parsedQuantity,

              reason:
                transferReason.trim() ||
                undefined,

              reference:
                transferReference.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
        MovementWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible registrar la transferencia.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La transferencia fue registrada correctamente.",
      );

      setIsTransferDrawerOpen(
        false,
      );

      await loadInventory();
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la transferencia.",
      );
    } finally {
      setIsTransferSubmitting(
        false,
      );
    }
  }

  function openStockConfiguration(
    stock: StockRecord,
  ) {
    if (
      !stock.stockId ||
      !permissions.canEdit
    ) {
      return;
    }

    setConfigurationStock(
      stock,
    );

    setConfigurationMinimum(
      String(
        stock.minimumQuantity,
      ),
    );

    setConfigurationMaximum(
      stock.maximumQuantity !==
        null
        ? String(
          stock.maximumQuantity,
        )
        : "",
    );

    setConfigurationReorderPoint(
      stock.reorderPoint !==
        null
        ? String(
          stock.reorderPoint,
        )
        : "",
    );

    setConfigurationBinLocation(
      stock.binLocation ?? "",
    );

    setConfigurationError(null);
  }

  async function handleStockConfigurationSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setConfigurationError(null);

    if (
      !configurationStock
        ?.stockId
    ) {
      setConfigurationError(
        "No fue posible identificar la existencia.",
      );
      return;
    }

    const minimum =
      Number(
        configurationMinimum,
      );

    const maximum =
      configurationMaximum
        ? Number(
          configurationMaximum,
        )
        : undefined;

    const reorderPoint =
      configurationReorderPoint
        ? Number(
          configurationReorderPoint,
        )
        : undefined;

    if (
      !Number.isInteger(minimum) ||
      minimum < 0
    ) {
      setConfigurationError(
        "La existencia mínima debe ser un entero igual o mayor que cero.",
      );
      return;
    }

    if (
      maximum !== undefined &&
      (
        !Number.isInteger(
          maximum,
        ) ||
        maximum < minimum
      )
    ) {
      setConfigurationError(
        "La existencia máxima debe ser un entero igual o mayor que la mínima.",
      );
      return;
    }

    if (
      reorderPoint !==
      undefined &&
      (
        !Number.isInteger(
          reorderPoint,
        ) ||
        reorderPoint < 0 ||
        (
          maximum !==
          undefined &&
          reorderPoint > maximum
        )
      )
    ) {
      setConfigurationError(
        "El punto de reorden debe ser válido y no superar la existencia máxima.",
      );
      return;
    }

    try {
      setIsConfigurationSubmitting(
        true,
      );

      const response =
        await fetch(
          "/api/crm/inventory/stocks",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              stockId:
                configurationStock
                  .stockId,

              minimumQuantity:
                minimum,

              maximumQuantity:
                maximum,

              reorderPoint,

              binLocation:
                configurationBinLocation.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
        MovementWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible guardar la configuración.",
        );
      }

      setSuccessMessage(
        result.message ??
        "La configuración fue actualizada correctamente.",
      );

      setConfigurationStock(
        null,
      );

      await loadInventory();
    } catch (error) {
      setConfigurationError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la configuración.",
      );
    } finally {
      setIsConfigurationSubmitting(
        false,
      );
    }
  }

    function hasOpenReplenishmentRequest(
    stockId: string | null,
  ) {
    if (!stockId) {
      return false;
    }

    return replenishmentRequests.some(
      (request) =>
        request.status !==
          "Cancelada" &&
        request.status !==
          "Recibida" &&
        request.items.some(
          (item) =>
            item.stockId ===
            stockId,
        ),
    );
  }

    async function createReplenishmentRequest(
    stock: StockRecord,
    quantity: number,
  ) {
    if (
      !stock.stockId ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setReplenishmentError(
        "No fue posible determinar la cantidad de reposición.",
      );
      return;
    }

    try {
      setReplenishmentError(null);
      setReplenishmentMessage(null);

      setRequestingStockIds(
        (currentIds) => [
          ...currentIds,
          stock.stockId as string,
        ],
      );

      const response =
        await fetch(
          "/api/crm/inventory/replenishment",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              currency:
                stock.currency,

              notes:
                "Solicitud generada desde las sugerencias de reposición.",

              items: [
                {
                  stockId:
                    stock.stockId,

                  quantity,
                },
              ],
            }),
          },
        );

      const payload =
        (await response.json()) as
          ReplenishmentResponse;

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.error ??
          "No fue posible crear la solicitud de reposición.",
        );
      }

      setReplenishmentMessage(
        payload.message ??
        "La solicitud de reposición fue creada correctamente.",
      );

      await loadInventory();
    } catch (requestError) {
      setReplenishmentError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible crear la solicitud de reposición.",
      );
    } finally {
      setRequestingStockIds(
        (currentIds) =>
          currentIds.filter(
            (stockId) =>
              stockId !==
              stock.stockId,
          ),
      );
    }
  }

  function openMovementDrawer(
    stock?: StockRecord,
    type: MovementType =
      "Entrada",
    suggestedQuantity?: number,
  ) {
    const preferredBranchId =
      stock?.branchId ??
      branchFilter ??
      primaryBranchId ??
      "";

    const preferredLocation =
      stock
        ? activeLocations.find(
          (item) =>
            item.value ===
            stock.locationId,
        )
        : activeLocations.find(
          (item) =>
            item.branchId ===
            preferredBranchId &&
            item.isDefault,
        ) ??
        activeLocations.find(
          (item) =>
            item.branchId ===
            preferredBranchId,
        ) ??
        activeLocations[0];

    const nextLocationId =
      stock?.locationId ??
      preferredLocation?.value ??
      "";

    const nextBranchId =
      stock?.branchId ??
      preferredLocation
        ?.branchId ??
      "";

    setMovementType(type);

    setMovementBranchId(
      nextBranchId,
    );

    setMovementLocationId(
      nextLocationId,
    );

    setMovementProductId(
      stock?.productId ?? "",
    );

    setMovementQuantity(
      type === "Ajuste" &&
        stock
        ? String(stock.quantity)
        : type === "Entrada" &&
            suggestedQuantity !==
              undefined
          ? String(
              suggestedQuantity,
            )
          : "",
    );

    setMovementUnitCost(
      type === "Entrada" &&
        permissions.canViewCost &&
        stock?.lastUnitCost !==
        null &&
        stock?.lastUnitCost !==
        undefined
        ? String(
          stock.lastUnitCost,
        )
        : "",
    );

    setMovementReason(
      type === "Entrada"
        ? "Recepción de inventario"
        : type === "Salida"
          ? "Salida de inventario"
          : "Ajuste de inventario",
    );

    setMovementReference("");
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeMovementDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setFormError(null);
  }

  function handleMovementProductChange(
    productId: string,
  ) {
    setMovementProductId(
      productId,
    );

    const stock =
      stocks.find(
        (item) =>
          item.locationId ===
          movementLocationId &&
          item.productId ===
          productId,
      );

    setMovementUnitCost(
      movementType ===
        "Entrada" &&
        permissions.canViewCost &&
        stock?.lastUnitCost !==
        null &&
        stock?.lastUnitCost !==
        undefined
        ? String(
          stock.lastUnitCost,
        )
        : "",
    );
  }

  function handleMovementLocationChange(
    locationId: string,
  ) {
    setMovementLocationId(
      locationId,
    );

    const selectedLocation =
      activeLocations.find(
        (item) =>
          item.value ===
          locationId,
      );

    setMovementBranchId(
      selectedLocation
        ?.branchId ??
      "",
    );

    const stock =
      stocks.find(
        (item) =>
          item.locationId ===
          locationId &&
          item.productId ===
          movementProductId,
      );

    setMovementUnitCost(
      movementType ===
        "Entrada" &&
        permissions.canViewCost &&
        stock?.lastUnitCost !==
        null &&
        stock?.lastUnitCost !==
        undefined
        ? String(
          stock.lastUnitCost,
        )
        : "",
    );
  }

  function handleMovementBranchChange(
    branchId: string,
  ) {
    setMovementBranchId(
      branchId,
    );

    const nextLocation =
      activeLocations.find(
        (item) =>
          item.branchId ===
          branchId &&
          item.isDefault,
      ) ??
      activeLocations.find(
        (item) =>
          item.branchId ===
          branchId,
      );

    handleMovementLocationChange(
      nextLocation?.value ??
      "",
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    if (
      !movementLocationId ||
      !movementProductId
    ) {
      setFormError(
        "Selecciona la ubicación y el producto.",
      );
      return;
    }

    const parsedQuantity =
      Number(movementQuantity);

    if (
      !Number.isInteger(
        parsedQuantity,
      ) ||
      parsedQuantity < 0 ||
      (
        movementType !==
        "Ajuste" &&
        parsedQuantity === 0
      )
    ) {
      setFormError(
        movementType === "Ajuste"
          ? "La existencia final debe ser un número entero igual o mayor que cero."
          : "La cantidad debe ser un número entero mayor que cero.",
      );
      return;
    }

    const parsedUnitCost =
      movementUnitCost
        ? Number(
          movementUnitCost,
        )
        : undefined;

    if (
      movementType ===
      "Entrada" &&
      permissions.canManage &&
      (
        parsedUnitCost ===
        undefined ||
        !Number.isFinite(
          parsedUnitCost,
        ) ||
        parsedUnitCost < 0
      )
    ) {
      setFormError(
        "Captura un costo unitario válido para la entrada.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await fetch(
          "/api/crm/inventory/movements",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              branchId:
                movementBranchId ||
                undefined,

              locationId:
                movementLocationId,

              productId:
                movementProductId,
              type: movementType,
              quantity:
                parsedQuantity,
              unitCost:
                movementType ===
                  "Entrada" &&
                  permissions.canManage
                  ? parsedUnitCost
                  : undefined,
              reason:
                movementReason.trim() ||
                undefined,
              reference:
                movementReference.trim() ||
                undefined,
            }),
          },
        );

      const result =
        (await response.json()) as
        MovementWriteResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
          "No fue posible registrar el movimiento.",
        );
      }

      setSuccessMessage(
        result.message ??
        "El movimiento fue registrado correctamente.",
      );

      setIsDrawerOpen(false);
      await loadInventory();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el movimiento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const summaryCards = [
    {
      label: "Existencia total",
      value:
        summary.totalUnits.toLocaleString(
          "es-MX",
        ),
      detail:
        `${summary.availableUnits.toLocaleString("es-MX")} unidades disponibles`,
      className:
        "from-blue-700 to-cyan-500",
    },
    {
      label: "Valor del inventario",
      value:
        summary.inventoryValue !==
          null
          ? formatMoney(
            summary.inventoryValue,
          )
          : "Restringido",
      detail:
        summary.inventoryValue !==
          null
          ? "Valor contable a costo promedio"
          : "Requiere permiso para consultar costos",
      className:
        "from-slate-950 to-slate-700",
    },
    {
      label: "Unidades reservadas",
      value:
        summary.reservedUnits.toLocaleString(
          "es-MX",
        ),
      detail:
        "Comprometidas comercialmente",
      className:
        "from-violet-700 to-indigo-500",
    },
    {
      label: "Alertas de stock",
      value:
        (
          summary.lowStock +
          summary.outOfStock
        ).toLocaleString(
          "es-MX",
        ),
      detail:
        `${summary.lowStock} bajas · ${summary.outOfStock} agotadas`,
      className:
        "from-amber-600 to-orange-500",
    },
  ];

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Operación comercial"
          title="Inventarios"
          description="Controla existencias, disponibilidad, mínimos y movimientos por sucursal desde un solo lugar."
          action={
            <div className="flex flex-wrap gap-3">
              {permissions.canManage && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setIsLocationsDrawerOpen(
                      true,
                    )
                  }
                >
                  Administrar ubicaciones
                </Button>
              )}

              {permissions.canEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    openTransferDrawer()
                  }
                >
                  Transferir inventario
                </Button>
              )}

              {permissions.canCreate && (
                <Button
                  type="button"
                  variant="secondary"
                  className="border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100"
                  onClick={() =>
                    openReservationDrawer()
                  }
                >
                  Reservar inventario
                </Button>
              )}

              {permissions.canCreate && (
                <Button
                  type="button"
                  onClick={() =>
                    openMovementDrawer()
                  }
                >
                  Registrar movimiento
                </Button>
              )}
            </div>
          }
        />

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm">
            {successMessage}
          </div>
        )}

        {pageError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm">
            {pageError}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(
            (card) => (
              <article
                key={card.label}
                className={[
                  "overflow-hidden rounded-[26px] bg-gradient-to-br p-5 text-white shadow-lg",
                  card.className,
                ].join(" ")}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  {card.label}
                </p>

                <p className="mt-4 text-3xl font-black tracking-tight">
                  {card.value}
                </p>

                {card.label ===
                  "Alertas de stock" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                      onClick={() => {
                        setActiveView(
                          "stocks",
                        );

                        setStatusFilter(
                          "Bajo",
                        );

                        window.setTimeout(
                          () =>
                            document
                              .getElementById(
                                "inventory-detail-table",
                              )
                              ?.scrollIntoView({
                                behavior:
                                  "smooth",

                                block:
                                  "start",
                              }),
                          0,
                        );
                      }}
                    >
                      {summary.lowStock} bajas
                    </button>

                    <button
                      type="button"
                      className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                      onClick={() => {
                        setActiveView(
                          "stocks",
                        );

                        setStatusFilter(
                          "Agotado",
                        );

                        window.setTimeout(
                          () =>
                            document
                              .getElementById(
                                "inventory-detail-table",
                              )
                              ?.scrollIntoView({
                                behavior:
                                  "smooth",

                                block:
                                  "start",
                              }),
                          0,
                        );
                      }}
                    >
                      {summary.outOfStock} agotadas
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/75">
                    {card.detail}
                  </p>
                )}
              </article>
            ),
          )}
        </section>

        <section
          id="inventory-detail-table"
          className="scroll-mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
            {activeView ===
              "stocks" &&
              inventoryProductTypes.length >
                0 && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Tipo de inventario
                  </p>

                  {inventoryProductTypes.length <=
                  5 ? (
                    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        className={[
                          "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
                          productTypeFilter ===
                          ""
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100",
                        ].join(" ")}
                        onClick={() => {
                          setProductTypeFilter(
                            "",
                          );
                          setCategoryFilter(
                            "",
                          );
                        }}
                      >
                        Todos
                      </button>

                      {inventoryProductTypes.map(
                        (productType) => (
                          <button
                            key={
                              productType.id
                            }
                            type="button"
                            className={[
                              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
                              productTypeFilter ===
                              productType.id
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100",
                            ].join(" ")}
                            onClick={() => {
                              setProductTypeFilter(
                                productType.id,
                              );
                              setCategoryFilter(
                                "",
                              );
                            }}
                          >
                            {
                              productType.name
                            }
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <select
                      value={
                        productTypeFilter
                      }
                      className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      onChange={(
                        event,
                      ) => {
                        setProductTypeFilter(
                          event.target.value,
                        );
                        setCategoryFilter(
                          "",
                        );
                      }}
                    >
                      <option value="">
                        Todos los tipos
                      </option>

                      {inventoryProductTypes.map(
                        (productType) => (
                          <option
                            key={
                              productType.id
                            }
                            value={
                              productType.id
                            }
                          >
                            {
                              productType.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </div>
              )}

            <div className="flex flex-col gap-4">
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    activeView ===
                      "stocks"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setActiveView(
                      "stocks",
                    )
                  }
                >
                  Existencias
                </button>

                <button
                  type="button"
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    activeView ===
                      "movements"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setActiveView(
                      "movements",
                    )
                  }
                >
                  Kardex
                </button>

                <button
                  type="button"
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    activeView ===
                      "reservations"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setActiveView(
                      "reservations",
                    )
                  }
                >
                  Reservas
                  {reservations.filter(
                    (reservation) =>
                      reservation.status ===
                      "Activa",
                  ).length > 0 && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                        {
                          reservations.filter(
                            (reservation) =>
                              reservation.status ===
                              "Activa",
                          ).length
                        }
                      </span>
                    )}
                </button>

                <button
                  type="button"
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    activeView ===
                      "replenishment"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setActiveView(
                      "replenishment",
                    )
                  }
                >
                  Reposición
                  {replenishmentSuggestions.length >
                    0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      {
                        replenishmentSuggestions.length
                      }
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={[
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    activeView ===
                      "counts"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  onClick={() =>
                    setActiveView(
                      "counts",
                    )
                  }
                >
                  Conteos físicos
                </button>

                {permissions.canManage && (
                  <button
                    type="button"
                    className={[
                      "rounded-lg px-4 py-2 text-sm font-semibold transition",
                      activeView ===
                        "audit"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100",
                    ].join(" ")}
                    onClick={() =>
                      setActiveView(
                        "audit",
                      )
                    }
                  >
                    Auditoría
                  </button>
                )}
              </div>

              {activeView !==
                "counts" &&
                activeView !==
                  "audit" && (
                <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <input
                  type="search"
                  value={search}
                  placeholder="Buscar producto, código..."
                  className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                />

                <select
                  value={branchFilter}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  onChange={(event) =>
                    setBranchFilter(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Todas las sucursales
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.value}
                        value={branch.value}
                      >
                        {branch.label}
                      </option>
                    ),
                  )}
                </select>

                {activeView ===
                  "stocks" && (
                    <select
                      value={
                        categoryFilter
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                      onChange={(
                        event,
                      ) =>
                        setCategoryFilter(
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        Todas las categorías
                      </option>

                      {inventoryCategories.map(
                        (category) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        ),
                      )}
                    </select>
                  )}

                {activeView ===
                  "stocks" && (
                    <select
                      value={statusFilter}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                      onChange={(
                        event,
                      ) =>
                        setStatusFilter(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Todos los estados
                      </option>
                      <option value="Disponible">
                        Disponible
                      </option>
                      <option value="Bajo">
                        Stock bajo
                      </option>
                      <option value="Agotado">
                        Agotado
                      </option>
                    </select>
                  )}
                {activeView ===
                  "reservations" && (
                    <select
                      value={
                        reservationStatusFilter
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                      onChange={(
                        event,
                      ) =>
                        setReservationStatusFilter(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Todos los estados
                      </option>

                      <option value="Activa">
                        Activas
                      </option>

                      <option value="Consumida">
                        Entregadas
                      </option>

                      <option value="Liberada">
                        Liberadas
                      </option>

                      <option value="Cancelada">
                        Canceladas
                      </option>

                      <option value="Vencida">
                        Vencidas
                      </option>
                    </select>
                  )}

                {activeView ===
                  "movements" && (
                    <select
                      value={
                        movementTypeFilter
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                      onChange={(
                        event,
                      ) =>
                        setMovementTypeFilter(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Todos los movimientos
                      </option>

                      {Array.from(
                        new Set(
                          movements.map(
                            (movement) =>
                              movement.type,
                          ),
                        ),
                      )
                        .sort(
                          (
                            first,
                            second,
                          ) =>
                            first.localeCompare(
                              second,
                              "es-MX",
                            ),
                        )
                        .map(
                          (
                            movementTypeOption,
                          ) => (
                            <option
                              key={
                                movementTypeOption
                              }
                              value={
                                movementTypeOption
                              }
                            >
                              {
                                movementTypeOption
                              }
                            </option>
                          ),
                        )}
                    </select>
                  )}
                </div>
              )}
            </div>
          </header>

          {activeView ===
            "reservations" &&
            linkedDealReservationId && (
              <div className="flex flex-col gap-3 border-b border-blue-200 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Reservas de la oportunidad seleccionada
                  </p>

                  <p className="mt-1 text-xs text-blue-700">
                    Confirma la entrega de cada modelo para descontar la existencia y registrar su salida en el Kardex.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {!visibleReservations.some(
                    (reservation) =>
                      reservation.status ===
                      "Activa",
                  ) &&
                    visibleReservations.some(
                      (reservation) =>
                        reservation.status ===
                        "Liberada" ||
                        reservation.status ===
                        "Cancelada" ||
                        reservation.status ===
                        "Vencida",
                    ) && (
                      <Button
                        type="button"
                        disabled={
                          isReactivatingReservations
                        }
                        onClick={() =>
                          void handleReactivateReservations()
                        }
                      >
                        {isReactivatingReservations
                          ? "Reactivando..."
                          : "Reactivar reservas"}
                      </Button>
                    )}

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setLinkedDealReservationId(
                        null,
                      );

                      window.history.replaceState(
                        {},
                        "",
                        "/crm/inventarios",
                      );
                    }}
                  >
                    Ver todas las reservas
                  </Button>
                </div>
              </div>
            )}

          {activeView ===
            "audit" &&
            permissions.canManage ? (
            <div className="p-5 sm:p-6">
              <InventoryAuditWorkspace />
            </div>
          ) : activeView ===
            "replenishment" ? (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Sugerencias de reposición
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Modelos cuya disponibilidad alcanzó el punto de reorden o la existencia mínima.
                  </p>
                </div>

                <p className="text-sm font-semibold text-amber-700">
                  {
                    replenishmentSuggestions.length
                  }{" "}
                  sugerencia(s)
                </p>
              </div>

              {replenishmentMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
                  {
                    replenishmentMessage
                  }
                </div>
              )}

              {replenishmentError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  {
                    replenishmentError
                  }
                </div>
              )}

              <DataraTableScroll>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Modelo",
                        "Ubicación",
                        "Disponible",
                        "Punto de reorden",
                        "Objetivo",
                        "Compra sugerida",
                        ...(permissions.canViewCost
                          ? [
                              "Costo estimado",
                            ]
                          : []),
                        "Acciones",
                      ].map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {replenishmentSuggestions.map(
                      (suggestion) => (
                        <tr
                          key={
                            suggestion.id
                          }
                          className="transition hover:bg-amber-50/40"
                        >
                          <td className="min-w-60 px-5 py-4">
                            <p className="font-bold text-slate-950">
                              {
                                suggestion.productName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {suggestion.productCode ??
                                "Sin código"}
                            </p>
                          </td>

                          <td className="min-w-56 px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {
                                suggestion.locationLabel
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                suggestion.branchName
                              }
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-lg font-black text-red-700">
                            {
                              suggestion.availableQuantity
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                            {
                              suggestion.triggerQuantity
                            }
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">
                            {suggestion.requiresMaximum
                              ? "Sin máximo"
                              : suggestion.targetQuantity}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            {suggestion.requiresMaximum ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                Configura un máximo
                              </span>
                            ) : (
                              <span className="text-lg font-black text-blue-700">
                                {
                                  suggestion.suggestedQuantity
                                }
                              </span>
                            )}
                          </td>

                          {permissions.canViewCost && (
                            <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                              {suggestion.requiresMaximum ||
                              suggestion.averageUnitCost ===
                                null
                                ? "—"
                                : formatMoney(
                                    suggestion.suggestedQuantity *
                                      suggestion.averageUnitCost,
                                    suggestion.currency,
                                  )}
                            </td>
                          )}

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex min-w-max items-center gap-2">
                              {permissions.canManage &&
                                !suggestion.requiresMaximum &&
                                suggestion.suggestedQuantity >
                                  0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={
                                    hasOpenReplenishmentRequest(
                                      suggestion.stockId,
                                    ) ||
                                    (
                                      suggestion.stockId !==
                                        null &&
                                      requestingStockIds.includes(
                                        suggestion.stockId,
                                      )
                                    )
                                  }
                                  onClick={() =>
                                    void createReplenishmentRequest(
                                      suggestion,
                                      suggestion.suggestedQuantity,
                                    )
                                  }
                                >
                                  {hasOpenReplenishmentRequest(
                                    suggestion.stockId,
                                  )
                                    ? "Solicitud pendiente"
                                    : suggestion.stockId !==
                                        null &&
                                      requestingStockIds.includes(
                                        suggestion.stockId,
                                      )
                                      ? "Generando..."
                                      : "Generar solicitud"}
                                </Button>
                              )}

                              {permissions.canCreate &&
                                !suggestion.requiresMaximum &&
                                suggestion.suggestedQuantity >
                                  0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    openMovementDrawer(
                                      suggestion,
                                      "Entrada",
                                      suggestion.suggestedQuantity,
                                    )
                                  }
                                >
                                  Registrar entrada
                                </Button>
                              )}

                              {permissions.canEdit && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    openStockConfiguration(
                                      suggestion,
                                    )
                                  }
                                >
                                  Configurar niveles
                                </Button>
                              )}

                              {!permissions.canCreate &&
                                !permissions.canEdit && (
                                <span className="text-sm text-slate-400">
                                  Solo consulta
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>

                {replenishmentSuggestions.length ===
                  0 && (
                  <div className="px-6 py-20 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      No hay reposiciones pendientes
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Las existencias están por encima de sus puntos de reorden.
                    </p>
                  </div>
                )}
              </DataraTableScroll>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h3 className="font-bold text-slate-950">
                    Solicitudes generadas
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Solicitudes internas preparadas para su futura integración con compras o ERP.
                  </p>
                </header>

                <DataraTableScroll>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-white">
                      <tr>
                        {[
                          "Referencia",
                          "Fecha",
                          "Destino",
                          "Partidas",
                          "Estado",
                          "Integración",
                          ...(permissions.canViewCost
                            ? [
                                "Total estimado",
                              ]
                            : []),
                        ].map(
                          (header) => (
                            <th
                              key={
                                header
                              }
                              className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                            >
                              {
                                header
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {replenishmentRequests.map(
                        (request) => (
                          <tr
                            key={
                              request.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="font-bold text-slate-950">
                                {
                                  request.reference
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {request.requestedByName ??
                                  "Usuario"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                              {formatDate(
                                request.requestedAt,
                              )}
                            </td>

                            <td className="min-w-56 px-5 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {Array.from(
                                  new Set(
                                    request.items.map(
                                      (item) =>
                                        item.locationLabel,
                                    ),
                                  ),
                                ).join(", ")}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  request.branchLabel
                                }
                              </p>
                            </td>

                            <td className="min-w-72 px-5 py-4">
                              {request.items.map(
                                (item) => (
                                  <p
                                    key={
                                      item.id
                                    }
                                    className="text-sm text-slate-700"
                                  >
                                    {
                                      item.requestedQuantity
                                    }{" "}
                                    ×{" "}
                                    {
                                      item.productName
                                    }{" "}
                                    ·{" "}
                                    {
                                      item.locationLabel
                                    }
                                  </p>
                                ),
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                {
                                  request.status
                                }
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                {
                                  request.syncStatus
                                }
                              </span>
                            </td>

                            {permissions.canViewCost && (
                              <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">
                                {formatMoney(
                                  request.items.reduce(
                                    (
                                      total,
                                      item,
                                    ) =>
                                      total +
                                      (
                                        item.totalCost ??
                                        0
                                      ),
                                    0,
                                  ),
                                  request.currency,
                                )}
                              </td>
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>

                  {replenishmentRequests.length ===
                    0 && (
                    <div className="px-6 py-12 text-center">
                      <p className="font-bold text-slate-800">
                        Todavía no hay solicitudes de reposición
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Usa “Generar solicitud” en una sugerencia para crear la primera.
                      </p>
                    </div>
                  )}
                </DataraTableScroll>
              </section>
            </div>
          ) : activeView ===
            "counts" ? (
            <div className="p-5 sm:p-6">
              <InventoryCountsWorkspace
                locations={locations}
                canCreate={
                  permissions.canCreate
                }
                canEdit={
                  permissions.canEdit
                }
                onInventoryChanged={
                  loadInventory
                }
              />
            </div>
          ) : isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Cargando inventario...
                </p>
              </div>
            </div>
          ) : activeView ===
            "stocks" ? (
            <DataraTableScroll>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      {
                        label:
                          productSingularLabel,
                        field:
                          "productName" as
                          StockSortField,
                      },
                      {
                        label:
                          "Existencia total",
                        field:
                          "quantity" as
                          StockSortField,
                      },
                      {
                        label: "Reservado",
                        field:
                          "reservedQuantity" as
                          StockSortField,
                      },
                      {
                        label: "Disponible",
                        field:
                          "availableQuantity" as
                          StockSortField,
                      },
                      {
                        label: "Ubicaciones",
                        field:
                          "locationCount" as
                          StockSortField,
                      },
                      {
                        label: "Estado",
                        field:
                          "status" as
                          StockSortField,
                      },
                      {
                        label: "Valor",
                        field:
                          "inventoryValue" as
                          StockSortField,
                      },
                      {
                        label: "Detalle",
                        field: null,
                      },
                    ].map(
                      (header) => (
                        <th
                          key={
                            header.label
                          }
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {header.field ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 transition hover:text-slate-950"
                              onClick={() =>
                                handleStockSort(
                                  header.field,
                                )
                              }
                            >
                              {
                                header.label
                              }

                              {stockSortField ===
                                header.field && (
                                  <span className="text-blue-600">
                                    {stockSortDirection ===
                                      "asc"
                                      ? "↑"
                                      : "↓"}
                                  </span>
                                )}
                            </button>
                          ) : (
                            header.label
                          )}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleStocks.map(
                    (record) => {
                      const isExpanded =
                        expandedProductIds.includes(
                          record.productId,
                        );

                      return (
                        <Fragment
                          key={
                            record.productId
                          }
                        >
                          <tr className="transition hover:bg-slate-50">
                            <td className="min-w-64 px-5 py-4">
                              <p className="font-semibold text-slate-950">
                                {
                                  record.productName
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {record.productCode ??
                                  "Sin código"}

                                {record.category
                                  ? ` · ${record.category}`
                                  : ""}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xl font-black text-slate-950">
                              {
                                record.quantity
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-violet-700">
                              {
                                record.reservedQuantity
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xl font-black text-blue-700">
                              {
                                record.availableQuantity
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {
                                  record.locationCount
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {record.locationCount ===
                                  1
                                  ? "ubicación con existencias"
                                  : "ubicaciones con existencias"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                  getStatusClassName(
                                    record.status,
                                  ),
                                ].join(
                                  " ",
                                )}
                              >
                                {
                                  record.status
                                }
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                              {record.inventoryValue !==
                                null
                                ? formatMoney(
                                  record.inventoryValue,
                                  record.currency,
                                )
                                : "Restringido"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  toggleProductLocations(
                                    record.productId,
                                  )
                                }
                              >
                                {isExpanded
                                  ? "Ocultar ubicaciones"
                                  : "Ver ubicaciones"}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/80">
                              <td
                                colSpan={8}
                                className="px-5 py-5"
                              >
                                <div className="mb-4 flex items-center justify-between gap-4">
                                  <div>
                                    <p className="font-bold text-slate-950">
                                      Distribución por ubicación
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                      Existencias y parámetros operativos de cada sucursal o bodega.
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                  {record.locations
                                    .filter(
                                      (
                                        locationStock,
                                      ) =>
                                        locationStock.quantity >
                                        0,
                                    )
                                    .map(
                                      (
                                        locationStock,
                                      ) => (
                                        <article
                                          key={
                                            locationStock.id
                                          }
                                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                        >
                                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                              <p className="font-bold text-slate-950">
                                                {
                                                  locationStock.locationLabel
                                                }
                                              </p>

                                              <p className="mt-1 text-sm text-slate-500">
                                                {
                                                  locationStock.branchName
                                                }
                                                {" · "}
                                                {
                                                  locationStock.locationType
                                                }
                                              </p>

                                              <p className="mt-1 text-xs text-slate-400">
                                                {locationStock.binLocation
                                                  ? `Posición: ${locationStock.binLocation}`
                                                  : "Sin posición física"}
                                              </p>
                                            </div>

                                            <span
                                              className={[
                                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                                getStatusClassName(
                                                  locationStock.status,
                                                ),
                                              ].join(
                                                " ",
                                              )}
                                            >
                                              {
                                                locationStock.status
                                              }
                                            </span>
                                          </div>

                                          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            <div className="rounded-xl bg-slate-100 p-3">
                                              <p className="text-xs uppercase tracking-wider text-slate-500">
                                                Existencia
                                              </p>

                                              <p className="mt-1 text-lg font-black text-slate-950">
                                                {
                                                  locationStock.quantity
                                                }
                                              </p>
                                            </div>

                                            <div className="rounded-xl bg-violet-50 p-3">
                                              <p className="text-xs uppercase tracking-wider text-violet-600">
                                                Reservado
                                              </p>

                                              <p className="mt-1 text-lg font-black text-violet-700">
                                                {
                                                  locationStock.reservedQuantity
                                                }
                                              </p>
                                            </div>

                                            <div className="rounded-xl bg-blue-50 p-3">
                                              <p className="text-xs uppercase tracking-wider text-blue-600">
                                                Disponible
                                              </p>

                                              <p className="mt-1 text-lg font-black text-blue-700">
                                                {
                                                  locationStock.availableQuantity
                                                }
                                              </p>
                                            </div>

                                            <div className="rounded-xl bg-amber-50 p-3">
                                              <p className="text-xs uppercase tracking-wider text-amber-600">
                                                Mínimo
                                              </p>

                                              <p className="mt-1 text-lg font-black text-amber-700">
                                                {
                                                  locationStock.minimumQuantity
                                                }
                                              </p>
                                            </div>
                                          </div>

                                          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                            {permissions.canCreate && (
                                              <>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  onClick={() =>
                                                    openMovementDrawer(
                                                      locationStock,
                                                      "Entrada",
                                                    )
                                                  }
                                                >
                                                  Entrada
                                                </Button>

                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="secondary"
                                                  disabled={
                                                    locationStock.availableQuantity <=
                                                    0
                                                  }
                                                  onClick={() =>
                                                    openMovementDrawer(
                                                      locationStock,
                                                      "Salida",
                                                    )
                                                  }
                                                >
                                                  Salida
                                                </Button>
                                              </>
                                            )}

                                            {permissions.canEdit && (
                                              <>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="secondary"
                                                  disabled={
                                                    locationStock.availableQuantity <=
                                                    0 ||
                                                    activeLocations.length <
                                                    2
                                                  }
                                                  className="border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100"
                                                  onClick={() =>
                                                    openTransferDrawer(
                                                      locationStock,
                                                    )
                                                  }
                                                >
                                                  Transferir
                                                </Button>

                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  variant="secondary"
                                                  className="border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100"
                                                  onClick={() =>
                                                    openMovementDrawer(
                                                      locationStock,
                                                      "Ajuste",
                                                    )
                                                  }
                                                >
                                                  Ajustar
                                                </Button>

                                                {locationStock.stockId && (
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    className="border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-400 hover:bg-slate-200"
                                                    onClick={() =>
                                                      openStockConfiguration(
                                                        locationStock,
                                                      )
                                                    }
                                                  >
                                                    Configurar
                                                  </Button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </article>
                                      ),
                                    )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    },
                  )}
                </tbody>
              </table>

              {visibleStocks.length ===
                0 && (
                  <div className="px-6 py-20 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      No encontramos existencias
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Cambia los filtros o registra el primer movimiento.
                    </p>
                  </div>
                )}
            </DataraTableScroll>
          ) : activeView ===
            "movements" ? (
            <DataraTableScroll>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      {
                        label: "Fecha",
                        field:
                          "createdAt" as
                          MovementSortField,
                      },
                      {
                        label: "Movimiento",
                        field:
                          "type" as
                          MovementSortField,
                      },
                      {
                        label:
                          productSingularLabel,
                        field:
                          "productName" as
                          MovementSortField,
                      },
                      {
                        label: "Ubicación",
                        field:
                          "locationName" as
                          MovementSortField,
                      },
                      {
                        label: "Sucursal",
                        field:
                          "branchName" as
                          MovementSortField,
                      },
                      {
                        label: "Cantidad",
                        field:
                          "quantity" as
                          MovementSortField,
                      },
                      {
                        label: "Anterior",
                        field:
                          "previousQuantity" as
                          MovementSortField,
                      },
                      {
                        label: "Resultado",
                        field:
                          "resultingQuantity" as
                          MovementSortField,
                      },
                      {
                        label: "Motivo",
                        field:
                          "reason" as
                          MovementSortField,
                      },
                      {
                        label: "Referencia",
                        field:
                          "reference" as
                          MovementSortField,
                      },
                      {
                        label: "Realizado por",
                        field:
                          "performedByName" as
                          MovementSortField,
                      },
                    ].map(
                      (header) => (
                        <th
                          key={
                            header.label
                          }
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 transition hover:text-slate-950"
                            onClick={() =>
                              handleMovementSort(
                                header.field,
                              )
                            }
                          >
                            {
                              header.label
                            }

                            {movementSortField ===
                              header.field && (
                                <span className="text-blue-600">
                                  {movementSortDirection ===
                                    "asc"
                                    ? "↑"
                                    : "↓"}
                                </span>
                              )}
                          </button>
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleMovements.map(
                    (movement) => (
                      <tr
                        key={movement.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            movement.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              getMovementClassName(
                                movement.type,
                              ),
                            ].join(" ")}
                          >
                            {movement.type}
                          </span>
                        </td>

                        <td className="min-w-56 px-5 py-4">
                          <p className="font-semibold text-slate-950">
                            {
                              movement.productName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {movement.productCode ??
                              "Sin código"}
                          </p>
                        </td>

                        <td className="min-w-52 px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {movement.locationName ??
                              "Sin ubicación"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Ubicación de inventario
                          </p>
                        </td>

                        <td className="min-w-48 px-5 py-4 text-sm text-slate-700">
                          {
                            movement.branchName
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-950">
                          {movement.quantity >
                            0
                            ? "+"
                            : ""}
                          {
                            movement.quantity
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {
                            movement.previousQuantity
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-blue-700">
                          {
                            movement.resultingQuantity
                          }
                        </td>

                        <td className="min-w-52 px-5 py-4 text-sm text-slate-600">
                          {movement.reason ??
                            "Sin motivo"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {movement.reference ??
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {movement.performedByName ??
                            "Usuario"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              {visibleMovements.length ===
                0 && (
                  <div className="px-6 py-20 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      Aún no hay movimientos
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Las entradas, salidas y ajustes aparecerán aquí.
                    </p>
                  </div>
                )}
            </DataraTableScroll>
          ) : (
            <DataraTableScroll>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Fecha",
                      productSingularLabel,
                      "Ubicación",
                      "Cliente / referencia",
                      "Cantidad",
                      "Estado",
                      "Vencimiento",
                      "Acciones",
                    ].map(
                      (header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleReservations.map(
                    (reservation) => {
                      const isUpdating =
                        reservationBeingUpdated ===
                        reservation.id;

                      const reservationGroupId =
                        reservation.sourceType ===
                          "Oportunidad" &&
                          reservation.sourceId
                          ? reservation.sourceId
                          : null;

                      const relatedReservations =
                        reservationGroupId
                          ? visibleReservations.filter(
                            (
                              relatedReservation,
                            ) =>
                              relatedReservation.sourceType ===
                              "Oportunidad" &&
                              relatedReservation.sourceId ===
                              reservationGroupId,
                          )
                          : [
                            reservation,
                          ];

                      const relatedReservationCount =
                        relatedReservations.length;

                      const isReservationGroup =
                        Boolean(
                          reservationGroupId,
                        ) &&
                        relatedReservationCount >
                        1;

                      const isFirstGroupReservation =
                        !isReservationGroup ||
                        relatedReservations[0]
                          ?.id ===
                        reservation.id;

                      const isReservationGroupExpanded =
                        reservationGroupId
                          ? expandedReservationGroupIds.includes(
                            reservationGroupId,
                          )
                          : false;

                      const groupQuantity =
                        relatedReservations.reduce(
                          (
                            total,
                            relatedReservation,
                          ) =>
                            total +
                            relatedReservation.quantity,
                          0,
                        );

                      const activeGroupReservations =
                        relatedReservations.filter(
                          (
                            relatedReservation,
                          ) =>
                            relatedReservation.status ===
                            "Activa",
                        ).length;

                      const deliveredGroupReservations =
                        relatedReservations.filter(
                          (
                            relatedReservation,
                          ) =>
                            relatedReservation.status ===
                            "Consumida",
                        ).length;

                      const releasedGroupReservations =
                        relatedReservations.filter(
                          (
                            relatedReservation,
                          ) =>
                            relatedReservation.status ===
                            "Liberada",
                        ).length;

                      const cancelledGroupReservations =
                        relatedReservations.filter(
                          (
                            relatedReservation,
                          ) =>
                            relatedReservation.status ===
                            "Cancelada",
                        ).length;

                      const expiredGroupReservations =
                        relatedReservations.filter(
                          (
                            relatedReservation,
                          ) =>
                            relatedReservation.status ===
                            "Vencida",
                        ).length;

                      const groupStatusLabel =
                        activeGroupReservations ===
                          relatedReservationCount
                          ? `${activeGroupReservations} partida(s) activa(s) · ${groupQuantity} unidad(es)`
                          : deliveredGroupReservations ===
                              relatedReservationCount
                            ? `${deliveredGroupReservations} partida(s) entregada(s) · ${groupQuantity} unidad(es)`
                            : releasedGroupReservations ===
                                relatedReservationCount
                              ? `${releasedGroupReservations} partida(s) liberada(s) · ${groupQuantity} unidad(es)`
                              : cancelledGroupReservations ===
                                  relatedReservationCount
                                ? `${cancelledGroupReservations} partida(s) cancelada(s) · ${groupQuantity} unidad(es)`
                                : expiredGroupReservations ===
                                    relatedReservationCount
                                  ? `${expiredGroupReservations} partida(s) vencida(s) · ${groupQuantity} unidad(es)`
                                  : "Estados mixtos";

                      const groupStatusClassName =
                        activeGroupReservations ===
                          relatedReservationCount
                          ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                          : deliveredGroupReservations ===
                              relatedReservationCount
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : cancelledGroupReservations ===
                                relatedReservationCount
                              ? "bg-red-50 text-red-700 ring-red-600/20"
                              : expiredGroupReservations ===
                                  relatedReservationCount
                                ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                : "bg-slate-100 text-slate-700 ring-slate-500/20";

                      const isGroupUpdating =
                        reservationGroupId
                          ? reservationGroupBeingUpdated ===
                          reservationGroupId
                          : false;

                      const statusClassName =
                        reservation.status ===
                          "Activa"
                          ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                          : reservation.status ===
                            "Consumida"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : reservation.status ===
                              "Cancelada"
                              ? "bg-red-50 text-red-700 ring-red-600/20"
                              : "bg-slate-100 text-slate-700 ring-slate-500/20";

                      return (
                        <Fragment
                          key={
                            reservation.id
                          }
                        >
                          {isReservationGroup &&
                            isFirstGroupReservation && (
                              <tr className="bg-blue-50/70">
                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                  {formatDate(
                                    relatedReservations[0]
                                      .createdAt,
                                  )}
                                </td>

                                <td className="min-w-64 px-5 py-4">
                                  <p className="font-black text-slate-950">
                                    {relatedReservationCount} modelos reservados
                                  </p>

                                  <p className="mt-1 max-w-72 truncate text-xs text-slate-500">
                                    {relatedReservations
                                      .map(
                                        (
                                          relatedReservation,
                                        ) =>
                                          relatedReservation.productName,
                                      )
                                      .join(
                                        " · ",
                                      )}
                                  </p>
                                </td>

                                <td className="min-w-64 px-5 py-4">
                                  <p className="font-semibold text-slate-800">
                                    {
                                      new Set(
                                        relatedReservations.map(
                                          (
                                            relatedReservation,
                                          ) =>
                                            relatedReservation.locationId,
                                        ),
                                      ).size
                                    }{" "}
                                    ubicación(es)
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Abre el grupo para consultar cada modelo.
                                  </p>
                                </td>

                                <td className="min-w-60 px-5 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {reservation.customerName ??
                                      "Sin cliente"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {reservation.sourceReference ??
                                      "Sin referencia"}
                                  </p>

                                  <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
                                    Oportunidad
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-lg font-black text-violet-700">
                                  {
                                    groupQuantity
                                  }
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <span
                                    className={[
                                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                      groupStatusClassName,
                                    ].join(" ")}
                                  >
                                    {
                                      groupStatusLabel
                                    }
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                  {reservation.expiresAt
                                    ? formatDate(
                                      reservation.expiresAt,
                                    )
                                    : "Sin vencimiento"}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <div className="flex min-w-max items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        reservationGroupId &&
                                        toggleReservationGroup(
                                          reservationGroupId,
                                        )
                                      }
                                    >
                                      {isReservationGroupExpanded
                                        ? "Ocultar modelos"
                                        : `Ver ${relatedReservationCount} modelos`}
                                    </Button>

                                    {activeGroupReservations >
                                      0 &&
                                      permissions.canEdit &&
                                      reservationGroupId && (
                                        <div className="flex flex-nowrap items-center gap-2">
                                          {reservationSettings.allowExtensions && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="secondary"
                                              disabled={
                                                isGroupUpdating
                                              }
                                              className="border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                                              onClick={() =>
                                                openGroupExtensionDrawer(
                                                  reservationGroupId,
                                                )
                                              }
                                            >
                                              Extender todas
                                            </Button>
                                          )}
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={
                                              isGroupUpdating
                                            }
                                            onClick={() =>
                                              void handleReservationGroupAction(
                                                reservationGroupId,
                                                "Entregar",
                                              )
                                            }
                                          >
                                            {isGroupUpdating
                                              ? "Procesando..."
                                              : "Confirmar todas"}
                                          </Button>

                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            disabled={
                                              isGroupUpdating
                                            }
                                            onClick={() =>
                                              void handleReservationGroupAction(
                                                reservationGroupId,
                                                "Liberar",
                                              )
                                            }
                                          >
                                            Liberar todas
                                          </Button>

                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="danger"
                                            disabled={
                                              isGroupUpdating
                                            }
                                            onClick={() =>
                                              void handleReservationGroupAction(
                                                reservationGroupId,
                                                "Cancelar",
                                              )
                                            }
                                          >
                                            Cancelar todas
                                          </Button>
                                        </div>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            )}

                          {(
                            !isReservationGroup ||
                            isReservationGroupExpanded
                          ) && (
                              <tr
                                className={[
                                  "transition hover:bg-slate-50",
                                  isReservationGroup
                                    ? "bg-blue-50/20"
                                    : "",
                                ].join(" ")}
                              >
                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                  {formatDate(
                                    reservation.createdAt,
                                  )}
                                </td>

                                <td className="min-w-64 px-5 py-4">
                                  <p className="font-semibold text-slate-950">
                                    {
                                      reservation.productName
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {reservation.productCode ??
                                      "Sin código"}
                                  </p>
                                </td>

                                <td className="min-w-64 px-5 py-4">
                                  <p className="font-semibold text-slate-800">
                                    {
                                      reservation.locationLabel
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      reservation.branchLabel
                                    }
                                  </p>
                                </td>

                                <td className="min-w-60 px-5 py-4">
                                  <p className="font-semibold text-slate-800">
                                    {reservation.customerName ??
                                      "Sin cliente"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {reservation.sourceReference ??
                                      "Sin referencia"}
                                  </p>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                      {
                                        reservation.sourceType
                                      }
                                    </span>

                                    {reservation.sourceType ===
                                      "Oportunidad" &&
                                      relatedReservationCount >
                                      1 && (
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-600/15">
                                          Grupo de{" "}
                                          {
                                            relatedReservationCount
                                          } modelos
                                        </span>
                                      )}
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-lg font-black text-violet-700">
                                  {
                                    reservation.quantity
                                  }
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <span
                                    className={[
                                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                                      statusClassName,
                                    ].join(" ")}
                                  >
                                    {reservation.status ===
                                      "Consumida"
                                      ? "Entregada"
                                      : reservation.status}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                  {reservation.expiresAt
                                    ? formatDate(
                                      reservation.expiresAt,
                                    )
                                    : "Sin vencimiento"}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  {reservation.status ===
                                    "Activa" &&
                                    permissions.canEdit ? (
                                    <div className="flex min-w-max flex-nowrap items-center gap-2">
                                      {reservationSettings.allowExtensions && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          disabled={
                                            isUpdating
                                          }
                                          className="border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                                          onClick={() =>
                                            openExtensionDrawer(
                                              reservation,
                                            )
                                          }
                                        >
                                          Extender
                                        </Button>
                                      )}

                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={
                                          isUpdating
                                        }
                                        onClick={() =>
                                          void handleReservationAction(
                                            reservation,
                                            "Consumir",
                                          )
                                        }
                                      >
                                        Confirmar entrega
                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={
                                          isUpdating
                                        }
                                        onClick={() =>
                                          void handleReservationAction(
                                            reservation,
                                            "Liberar",
                                          )
                                        }
                                      >
                                        Liberar
                                      </Button>

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        disabled={
                                          isUpdating
                                        }
                                        onClick={() =>
                                          void handleReservationAction(
                                            reservation,
                                            "Cancelar",
                                          )
                                        }
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-400">
                                      Sin acciones
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )}
                        </Fragment>
                      );
                    },
                  )}
                </tbody>
              </table>

              {visibleReservations.length ===
                0 && (
                  <div className="px-6 py-20 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      Aún no hay reservas
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Las unidades apartadas para clientes o documentos comerciales aparecerán aquí.
                    </p>
                  </div>
                )}
            </DataraTableScroll>
          )}
        </section>
      </div>

      {isLocationsDrawerOpen && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Cerrar ubicaciones"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() =>
              setIsLocationsDrawerOpen(
                false,
              )
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Configuración de inventario
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Ubicaciones y bodegas
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Administra sucursales con inventario y bodegas independientes.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={
                    openNewLocationForm
                  }
                >
                  Nueva ubicación
                </Button>

                <button
                  type="button"
                  aria-label="Cerrar"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                  onClick={() =>
                    setIsLocationsDrawerOpen(
                      false,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-6 sm:p-8">
              {locations.map(
                (inventoryLocation) => (
                  <article
                    key={
                      inventoryLocation.value
                    }
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">
                            {
                              inventoryLocation.label
                            }
                          </h3>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {
                              inventoryLocation.type
                            }
                          </span>

                          {inventoryLocation.isDefault && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Predeterminada
                            </span>
                          )}

                          {!inventoryLocation.active && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Inactiva
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {inventoryLocation.branchLabel ??
                            "Bodega independiente"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {[
                            inventoryLocation.addressLine,
                            inventoryLocation.city,
                            inventoryLocation.state,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                            "Sin dirección registrada"}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            openEditLocationForm(
                              inventoryLocation,
                            )
                          }
                        >
                          Editar
                        </Button>

                        {permissions.canManage && (
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              inventoryLocation.active
                                ? "danger"
                                : "secondary"
                            }
                            onClick={() =>
                              handleToggleLocationActive(
                                inventoryLocation,
                              )
                            }
                          >
                            {inventoryLocation.active
                              ? "Desactivar"
                              : "Reactivar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ),
              )}

              {locations.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <p className="font-bold text-slate-800">
                    No hay ubicaciones registradas
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Crea la primera ubicación para comenzar a controlar existencias.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {isLocationFormOpen && (
        <div className="fixed inset-0 z-[130]">
          <button
            type="button"
            aria-label="Cerrar formulario de ubicación"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => {
              if (
                !isLocationSubmitting
              ) {
                setIsLocationFormOpen(
                  false,
                );
              }
            }}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Configuración de inventario
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {locationForm.id
                      ? "Editar ubicación"
                      : "Nueva ubicación"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Define dónde se almacenan y controlan las existencias.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isLocationSubmitting
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                  onClick={() =>
                    setIsLocationFormOpen(
                      false,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleLocationSubmit
              }
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
                {locationFormError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    {
                      locationFormError
                    }
                  </div>
                )}

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Información general
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Nombre *

                      <input
                        value={
                          locationForm.name
                        }
                        placeholder="Ej. Bodega central"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              name:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Código

                      <input
                        value={
                          locationForm.code
                        }
                        placeholder="Ej. BOD-CEN"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal uppercase text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              code:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Tipo *

                      <select
                        value={
                          locationForm.type
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              type:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      >
                        <option value="Bodega">
                          Bodega
                        </option>
                        <option value="Sucursal">
                          Sucursal
                        </option>
                        <option value="Patio">
                          Patio
                        </option>
                        <option value="Taller">
                          Taller
                        </option>
                        <option value="Tránsito">
                          Tránsito
                        </option>
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Sucursal relacionada

                      <select
                        value={
                          locationForm.branchId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              branchId:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      >
                        <option value="">
                          Bodega independiente
                        </option>

                        {branches.map(
                          (branch) => (
                            <option
                              key={
                                branch.value
                              }
                              value={
                                branch.value
                              }
                            >
                              {
                                branch.label
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                        Déjalo vacío cuando la bodega atienda a varias sucursales.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                      <input
                        type="checkbox"
                        checked={
                          locationForm.isDefault
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              isDefault:
                                event
                                  .target
                                  .checked,
                            }),
                          )
                        }
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Ubicación predeterminada
                        </span>
                        <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                          Se seleccionará automáticamente para esta sucursal.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                      <input
                        type="checkbox"
                        checked={
                          locationForm.active
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                        onChange={(
                          event,
                        ) =>
                          setLocationForm(
                            (current) => ({
                              ...current,
                              active:
                                event
                                  .target
                                  .checked,
                            }),
                          )
                        }
                      />

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Ubicación activa
                        </span>
                        <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                          Permite registrar movimientos y consultar existencias.
                        </span>
                      </span>
                    </label>
                  </div>
                </section>
              </div>

              <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isLocationSubmitting
                  }
                  onClick={() =>
                    setIsLocationFormOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isLocationSubmitting
                  }
                >
                  {isLocationSubmitting
                    ? "Guardando..."
                    : locationForm.id
                      ? "Guardar cambios"
                      : "Crear ubicación"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {isTransferDrawerOpen && (
        <div className="fixed inset-0 z-[116]">
          <button
            type="button"
            aria-label="Cerrar transferencia"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => {
              if (
                !isTransferSubmitting
              ) {
                setIsTransferDrawerOpen(
                  false,
                );
              }
            }}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Movimiento interno
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Transferir inventario
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Mueve existencias entre sucursales o bodegas conservando su costo y trazabilidad.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isTransferSubmitting
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                  onClick={() =>
                    setIsTransferDrawerOpen(
                      false,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleTransferSubmit
              }
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {transferError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    {transferError}
                  </div>
                )}

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Origen y destino
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Ubicación de origen *

                      <select
                        required
                        value={
                          transferSourceLocationId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          handleTransferSourceLocationChange(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona el origen
                        </option>

                        {activeLocations.map(
                          (
                            inventoryLocation,
                          ) => (
                            <option
                              key={
                                inventoryLocation.value
                              }
                              value={
                                inventoryLocation.value
                              }
                            >
                              {
                                inventoryLocation.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Ubicación de destino *

                      <select
                        required
                        value={
                          transferDestinationLocationId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setTransferDestinationLocationId(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona el destino
                        </option>

                        {transferDestinationLocations.map(
                          (
                            inventoryLocation,
                          ) => (
                            <option
                              key={
                                inventoryLocation.value
                              }
                              value={
                                inventoryLocation.value
                              }
                            >
                              {
                                inventoryLocation.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Existencias a transferir
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {productSingularLabel} *

                      <select
                        required
                        value={
                          transferProductId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) => {
                          setTransferProductId(
                            event.target.value,
                          );

                          setTransferQuantity(
                            "",
                          );

                          setTransferError(
                            null,
                          );
                        }}
                      >
                        <option value="">
                          Selecciona un{" "}
                          {productSingularLabel.toLowerCase()}
                        </option>

                        {stocks
                          .filter(
                            (stock) =>
                              stock.initialized &&
                              stock.locationId ===
                              transferSourceLocationId &&
                              stock.availableQuantity >
                              0,
                          )
                          .map(
                            (stock) => (
                              <option
                                key={
                                  stock.productId
                                }
                                value={
                                  stock.productId
                                }
                              >
                                {
                                  stock.productName
                                }
                                {" · "}
                                {
                                  stock.availableQuantity
                                }{" "}
                                disponibles
                              </option>
                            ),
                          )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Cantidad *

                      <input
                        type="number"
                        min="1"
                        max={
                          transferSourceStock
                            ?.availableQuantity
                        }
                        step="1"
                        required
                        value={
                          transferQuantity
                        }
                        placeholder="Unidades"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setTransferQuantity(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    {transferSourceStock && (
                      <div className="sm:col-span-2 grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Existencia
                          </p>

                          <p className="mt-1 text-xl font-black">
                            {
                              transferSourceStock.quantity
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Reservado
                          </p>

                          <p className="mt-1 text-xl font-black text-violet-300">
                            {
                              transferSourceStock.reservedQuantity
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Transferible
                          </p>

                          <p className="mt-1 text-xl font-black text-blue-300">
                            {
                              transferSourceStock.availableQuantity
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Trazabilidad
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Motivo

                      <input
                        value={
                          transferReason
                        }
                        placeholder="Motivo de la transferencia"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setTransferReason(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Referencia

                      <input
                        value={
                          transferReference
                        }
                        placeholder="Ej. Solicitud interna 104"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setTransferReference(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
                  La operación registrará una salida en el origen y una entrada en el destino con la misma referencia.
                </div>
              </div>

              <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isTransferSubmitting
                  }
                  onClick={() =>
                    setIsTransferDrawerOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isTransferSubmitting ||
                    !transferSourceStock
                  }
                >
                  {isTransferSubmitting
                    ? "Transfiriendo..."
                    : "Confirmar transferencia"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {configurationStock && (
        <div className="fixed inset-0 z-[115]">
          <button
            type="button"
            aria-label="Cerrar configuración"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => {
              if (
                !isConfigurationSubmitting
              ) {
                setConfigurationStock(
                  null,
                );
              }
            }}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Control de inventario
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Configurar existencia
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Define los niveles de control sin modificar las unidades existentes.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar"
                  disabled={
                    isConfigurationSubmitting
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                  onClick={() =>
                    setConfigurationStock(
                      null,
                    )
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleStockConfigurationSubmit
              }
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {configurationError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    {
                      configurationError
                    }
                  </div>
                )}

                <section className="rounded-[26px] bg-slate-950 p-5 text-white shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                    {productSingularLabel}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {
                      configurationStock.productName
                    }
                  </h3>

                  <p className="mt-2 text-sm text-slate-300">
                    {
                      configurationStock.locationLabel
                    }
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Existencia actual
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {
                          configurationStock.quantity
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Disponible
                      </p>

                      <p className="mt-1 text-2xl font-black text-blue-300">
                        {
                          configurationStock.availableQuantity
                        }
                      </p>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Niveles de inventario
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Estos valores generan alertas, pero no cambian las existencias.
                    </p>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Existencia mínima *

                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={
                          configurationMinimum
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setConfigurationMinimum(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Existencia máxima

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          configurationMaximum
                        }
                        placeholder="Sin límite"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setConfigurationMaximum(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Punto de reorden

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          configurationReorderPoint
                        }
                        placeholder="Nivel para volver a comprar"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setConfigurationReorderPoint(
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Posición física

                      <input
                        value={
                          configurationBinLocation
                        }
                        placeholder="Ej. Pasillo 2, nivel B"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setConfigurationBinLocation(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isConfigurationSubmitting
                  }
                  onClick={() =>
                    setConfigurationStock(
                      null,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isConfigurationSubmitting
                  }
                >
                  {isConfigurationSubmitting
                    ? "Guardando..."
                    : "Guardar configuración"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Cerrar movimiento"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={
              closeMovementDrawer
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    Control de inventario
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Registrar movimiento
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Actualiza la existencia y conserva la trazabilidad del cambio.
                  </p>
                </div>

                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:bg-slate-100"
                  onClick={
                    closeMovementDrawer
                  }
                >
                  ×
                </button>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    {formError}
                  </div>
                )}

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Tipo de movimiento
                    </h3>
                  </header>

                  <div className="grid gap-3 p-5 sm:grid-cols-3">
                    {(
                      [
                        "Entrada",
                        "Salida",
                        "Ajuste",
                      ] as MovementType[]
                    ).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={[
                          "rounded-2xl border px-4 py-4 text-sm font-bold transition",
                          movementType ===
                            type
                            ? "border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                        ].join(" ")}
                        onClick={() => {
                          setMovementType(
                            type,
                          );

                          setMovementReason(
                            type ===
                              "Entrada"
                              ? "Recepción de inventario"
                              : type ===
                                "Salida"
                                ? "Salida de inventario"
                                : "Ajuste de inventario",
                          );
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Existencia
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Ubicación *

                      <select
                        value={
                          movementLocationId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          handleMovementLocationChange(
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona una ubicación
                        </option>

                        {activeLocations.map(
                          (
                            inventoryLocation,
                          ) => (
                            <option
                              key={
                                inventoryLocation.value
                              }
                              value={
                                inventoryLocation.value
                              }
                            >
                              {
                                inventoryLocation.label
                              }
                              {" · "}
                              {
                                inventoryLocation.type
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      {productSingularLabel} *

                      <select
                        value={
                          movementProductId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          handleMovementProductChange(
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Selecciona {productSingularLabel.toLowerCase()}
                        </option>

                        {products.map(
                          (product) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {
                                product.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    {selectedStock && (
                      <div className="sm:col-span-2 grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Existencia
                          </p>
                          <p className="mt-1 text-xl font-black">
                            {
                              selectedStock.quantity
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Reservado
                          </p>
                          <p className="mt-1 text-xl font-black">
                            {
                              selectedStock.reservedQuantity
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Disponible
                          </p>
                          <p className="mt-1 text-xl font-black text-cyan-300">
                            {
                              selectedStock.availableQuantity
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    <label className="text-sm font-semibold text-slate-700">
                      {movementType ===
                        "Ajuste"
                        ? "Existencia final *"
                        : "Cantidad *"}

                      <input
                        type="number"
                        min={
                          movementType ===
                            "Ajuste"
                            ? 0
                            : 1
                        }
                        step="1"
                        value={
                          movementQuantity
                        }
                        placeholder={
                          movementType ===
                            "Ajuste"
                            ? "Nueva existencia"
                            : "Número de unidades"
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setMovementQuantity(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    {movementType ===
                      "Entrada" &&
                      permissions.canManage && (
                        <label className="text-sm font-semibold text-slate-700">
                          Costo unitario *

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              movementUnitCost
                            }
                            placeholder="Costo de adquisición"
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            onChange={(
                              event,
                            ) =>
                              setMovementUnitCost(
                                event.target
                                  .value,
                              )
                            }
                          />

                          <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                            Información privada para calcular el valor contable del inventario.
                          </span>
                        </label>
                      )}

                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Trazabilidad
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Motivo

                      <input
                        value={
                          movementReason
                        }
                        placeholder="Motivo del movimiento"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setMovementReason(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Referencia

                      <input
                        value={
                          movementReference
                        }
                        placeholder="Factura, orden o folio"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setMovementReference(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={
                    closeMovementDrawer
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Registrando..."
                    : "Registrar movimiento"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {isReservationDrawerOpen && (
        <div className="fixed inset-0 z-[140]">
          <button
            type="button"
            aria-label="Cerrar reserva"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={
              closeReservationDrawer
            }
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">
            <header className="flex items-start justify-between gap-6 border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Disponibilidad comercial
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Reservar inventario
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Aparta unidades disponibles sin modificar la existencia física.
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:border-violet-300 hover:text-violet-700"
                onClick={
                  closeReservationDrawer
                }
              >
                ×
              </button>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleReservationSubmit
              }
            >
              <div className="flex-1 space-y-5 overflow-y-auto p-6 sm:p-8">
                {reservationError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                    {reservationError}
                  </div>
                )}

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Inventario a reservar
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Oportunidad o trato

                      <select
                        value={
                          reservationDealId
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                        onChange={(
                          event,
                        ) =>
                          handleReservationDealChange(
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Reserva manual, sin oportunidad
                        </option>

                        {deals
                          .filter(
                            (deal) => {
                              const stage =
                                deal.stage
                                  .trim()
                                  .toLowerCase()
                                  .normalize(
                                    "NFD",
                                  )
                                  .replace(
                                    /[\u0300-\u036f]/g,
                                    "",
                                  );

                              const status =
                                deal.status
                                  .trim()
                                  .toLowerCase()
                                  .normalize(
                                    "NFD",
                                  )
                                  .replace(
                                    /[\u0300-\u036f]/g,
                                    "",
                                  );

                              return (
                                !stage.includes(
                                  "prospecto",
                                ) &&
                                !stage.includes(
                                  "contactado",
                                ) &&
                                !status.includes(
                                  "ganad",
                                ) &&
                                !status.includes(
                                  "perdid",
                                ) &&
                                !status.includes(
                                  "cancel",
                                )
                              );
                            },
                          )
                          .map(
                            (deal) => (
                              <option
                                key={deal.id}
                                value={deal.id}
                              >
                                {deal.name}
                                {deal.customerName
                                  ? ` · ${deal.customerName}`
                                  : ""}
                                {deal.itemsSummary
                                  ? ` · ${deal.itemsSummary}`
                                  : ""}
                                {` · ${deal.stage}`}
                              </option>
                            ),
                          )}
                      </select>

                      <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                        Al elegir una oportunidad se cargarán automáticamente el cliente, la sucursal, el modelo, la cantidad y la referencia disponibles.
                      </span>
                    </label>

                    {reservationDealId ? (
                      <div className="space-y-4 sm:col-span-2">
                        <div>
                          <h4 className="font-bold text-slate-950">
                            Modelos que se reservarán
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Se creará una reserva separada por modelo, agrupadas bajo la misma oportunidad.
                          </p>
                        </div>

                        {reservationDraftItems.length ===
                          0 ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
                            La oportunidad no contiene modelos válidos para reservar.
                          </div>
                        ) : (
                          reservationDraftItems.map(
                            (draftItem) => {
                              const selectedStock =
                                stocks.find(
                                  (stock) =>
                                    stock.initialized &&
                                    stock.productId ===
                                    draftItem.productId &&
                                    stock.locationId ===
                                    draftItem.locationId,
                                );

                              return (
                                <article
                                  key={
                                    draftItem.key
                                  }
                                  className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4"
                                >
                                  <div className="flex flex-col gap-4">
                                    <div>
                                      <p className="font-bold text-slate-950">
                                        {
                                          draftItem.productName
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Cantidad solicitada en la oportunidad:{" "}
                                        {
                                          draftItem.requestedQuantity
                                        }
                                      </p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        Ubicación *

                                        <select
                                          value={
                                            draftItem.locationId
                                          }
                                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                                          onChange={(
                                            event,
                                          ) =>
                                            setReservationDraftItems(
                                              (
                                                currentItems,
                                              ) =>
                                                currentItems.map(
                                                  (
                                                    currentItem,
                                                  ) =>
                                                    currentItem.key ===
                                                      draftItem.key
                                                      ? {
                                                        ...currentItem,

                                                        locationId:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                      : currentItem,
                                                ),
                                            )
                                          }
                                        >
                                          <option value="">
                                            Selecciona una ubicación
                                          </option>

                                          {stocks
                                            .filter(
                                              (
                                                stock,
                                              ) =>
                                                stock.initialized &&
                                                stock.productId ===
                                                draftItem.productId &&
                                                stock.availableQuantity >
                                                0 &&
                                                activeLocations.some(
                                                  (
                                                    inventoryLocation,
                                                  ) =>
                                                    inventoryLocation.value ===
                                                    stock.locationId,
                                                ),
                                            )
                                            .map(
                                              (
                                                stock,
                                              ) => {
                                                const inventoryLocation =
                                                  activeLocations.find(
                                                    (
                                                      locationOption,
                                                    ) =>
                                                      locationOption.value ===
                                                      stock.locationId,
                                                  );

                                                return (
                                                  <option
                                                    key={
                                                      stock.locationId
                                                    }
                                                    value={
                                                      stock.locationId
                                                    }
                                                  >
                                                    {inventoryLocation
                                                      ?.label ??
                                                      stock.locationLabel}
                                                    {` · ${stock.availableQuantity} disponibles`}
                                                  </option>
                                                );
                                              },
                                            )}
                                        </select>
                                      </label>

                                      <label className="text-sm font-semibold text-slate-700">
                                        Cantidad *

                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          value={
                                            draftItem.quantity
                                          }
                                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                                          onChange={(
                                            event,
                                          ) =>
                                            setReservationDraftItems(
                                              (
                                                currentItems,
                                              ) =>
                                                currentItems.map(
                                                  (
                                                    currentItem,
                                                  ) =>
                                                    currentItem.key ===
                                                      draftItem.key
                                                      ? {
                                                        ...currentItem,

                                                        quantity:
                                                          event
                                                            .target
                                                            .value,
                                                      }
                                                      : currentItem,
                                                ),
                                            )
                                          }
                                        />
                                      </label>
                                    </div>

                                    {selectedStock && (
                                      <div className="flex flex-wrap gap-3 text-xs font-semibold">
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                                          Existencia:{" "}
                                          {
                                            selectedStock.quantity
                                          }
                                        </span>

                                        <span className="rounded-full bg-white px-3 py-1 text-violet-700 ring-1 ring-violet-200">
                                          Reservado:{" "}
                                          {
                                            selectedStock.reservedQuantity
                                          }
                                        </span>

                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                                          Disponible:{" "}
                                          {
                                            selectedStock.availableQuantity
                                          }
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </article>
                              );
                            },
                          )
                        )}
                      </div>
                    ) : (
                      <>
                        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                          Ubicación *

                          <select
                            value={
                              reservationLocationId
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                            onChange={(
                              event,
                            ) => {
                              setReservationLocationId(
                                event.target
                                  .value,
                              );

                              setReservationProductId(
                                "",
                              );
                            }}
                          >
                            <option value="">
                              Selecciona una ubicación
                            </option>

                            {activeLocations.map(
                              (
                                inventoryLocation,
                              ) => (
                                <option
                                  key={
                                    inventoryLocation.value
                                  }
                                  value={
                                    inventoryLocation.value
                                  }
                                >
                                  {
                                    inventoryLocation.label
                                  }
                                  {inventoryLocation.branchLabel
                                    ? ` · ${inventoryLocation.branchLabel}`
                                    : " · Bodega independiente"}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                          {productSingularLabel} *

                          <select
                            value={
                              reservationProductId
                            }
                            disabled={
                              !reservationLocationId
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
                            onChange={(
                              event,
                            ) =>
                              setReservationProductId(
                                event.target
                                  .value,
                              )
                            }
                          >
                            <option value="">
                              Selecciona {productSingularLabel.toLowerCase()}
                            </option>

                            {stocks
                              .filter(
                                (stock) =>
                                  stock.initialized &&
                                  stock.locationId ===
                                  reservationLocationId &&
                                  stock.availableQuantity >
                                  0,
                              )
                              .sort(
                                (
                                  first,
                                  second,
                                ) =>
                                  first.productName.localeCompare(
                                    second.productName,
                                    "es-MX",
                                  ),
                              )
                              .map(
                                (stock) => (
                                  <option
                                    key={
                                      stock.productId
                                    }
                                    value={
                                      stock.productId
                                    }
                                  >
                                    {
                                      stock.productName
                                    }
                                    {stock.productCode
                                      ? ` (${stock.productCode})`
                                      : ""}
                                    {` · ${stock.availableQuantity} disponibles`}
                                  </option>
                                ),
                              )}
                          </select>
                        </label>

                        {reservationLocationId &&
                          reservationProductId &&
                          (() => {
                            const selectedStock =
                              stocks.find(
                                (stock) =>
                                  stock.initialized &&
                                  stock.locationId ===
                                  reservationLocationId &&
                                  stock.productId ===
                                  reservationProductId,
                              );

                            return selectedStock ? (
                              <div className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:col-span-2 sm:grid-cols-3">
                                <div>
                                  <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Existencia
                                  </p>

                                  <p className="mt-1 text-xl font-black">
                                    {
                                      selectedStock.quantity
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Ya reservado
                                  </p>

                                  <p className="mt-1 text-xl font-black text-violet-300">
                                    {
                                      selectedStock.reservedQuantity
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Disponible
                                  </p>

                                  <p className="mt-1 text-xl font-black text-emerald-300">
                                    {
                                      selectedStock.availableQuantity
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : null;
                          })()}

                        <label className="text-sm font-semibold text-slate-700">
                          Cantidad *

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={
                              reservationQuantity
                            }
                            placeholder="Unidades"
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                            onChange={(
                              event,
                            ) =>
                              setReservationQuantity(
                                event.target
                                  .value,
                              )
                            }
                          />
                        </label>
                      </>
                    )}

                    <label className="text-sm font-semibold text-slate-700">
                      Vencimiento *

                      <input
                        type="datetime-local"
                        required
                        value={
                          reservationExpiresAt
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                        onChange={(
                          event,
                        ) =>
                          setReservationExpiresAt(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <h3 className="font-bold text-slate-950">
                      Cliente y referencia
                    </h3>
                  </header>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Cliente

                      <input
                        value={
                          reservationCustomerName
                        }
                        placeholder="Nombre del cliente"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                        onChange={(
                          event,
                        ) =>
                          setReservationCustomerName(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700">
                      Referencia

                      <input
                        value={
                          reservationReference
                        }
                        placeholder="Cotización, apartado o folio"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                        onChange={(
                          event,
                        ) =>
                          setReservationReference(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Notas

                      <textarea
                        rows={4}
                        value={
                          reservationNotes
                        }
                        placeholder="Información adicional de la reserva"
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                        onChange={(
                          event,
                        ) =>
                          setReservationNotes(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isReservationSubmitting
                  }
                  onClick={
                    closeReservationDrawer
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isReservationSubmitting
                  }
                >
                  {isReservationSubmitting
                    ? "Reservando..."
                    : reservationDealId
                      ? `Crear ${reservationDraftItems.filter(
                        (item) =>
                          item.selected,
                      ).length
                      } reserva(s)`
                      : "Crear reserva"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {extensionReservation && (
        <div className="fixed inset-0 z-[160]">
          <button
            type="button"
            aria-label="Cerrar extensión"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={
              closeExtensionDrawer
            }
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <form
              className="flex h-full flex-col"
              onSubmit={
                handleExtensionSubmit
              }
            >
              <header className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                      Reserva activa
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      Extender vencimiento
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Modifica la fecha límite sin cambiar la existencia ni las unidades reservadas.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Cerrar"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:border-blue-300 hover:text-blue-700"
                    onClick={
                      closeExtensionDrawer
                    }
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto p-6 sm:p-8">
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reserva
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-950">
                    {
                      extensionReservation.productName
                    }
                  </p>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500">
                        Cliente
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {extensionReservation.customerName ??
                          "Sin cliente"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Referencia
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {extensionReservation.sourceReference ??
                          "Sin referencia"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Vencimiento actual
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {extensionReservation.expiresAt
                          ? formatDate(
                            extensionReservation.expiresAt,
                          )
                          : "Sin vencimiento"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">
                        Cantidad reservada
                      </p>

                      <p className="mt-1 font-semibold text-violet-700">
                        {
                          extensionReservation.quantity
                        }
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Nueva fecha y hora *

                      <input
                        type="datetime-local"
                        required
                        value={
                          extensionExpiresAt
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setExtensionExpiresAt(
                            event.target.value,
                          )
                        }
                      />

                      <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                        La nueva fecha debe ser posterior al vencimiento actual y respetar el máximo configurado.
                      </span>
                    </label>

                    <label className="block text-sm font-semibold text-slate-700">
                      Motivo de la extensión *

                      <textarea
                        rows={4}
                        required
                        value={
                          extensionReason
                        }
                        placeholder="Explica por qué se amplía la reserva"
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        onChange={(
                          event,
                        ) =>
                          setExtensionReason(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                {extensionError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {extensionError}
                  </div>
                )}
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    reservationBeingUpdated ===
                      extensionReservation.id ||
                    (
                      Boolean(
                        extensionReservationGroupId,
                      ) &&
                      reservationGroupBeingUpdated ===
                        extensionReservationGroupId
                    )
                  }
                  onClick={
                    closeExtensionDrawer
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    reservationBeingUpdated ===
                      extensionReservation.id ||
                    (
                      Boolean(
                        extensionReservationGroupId,
                      ) &&
                      reservationGroupBeingUpdated ===
                        extensionReservationGroupId
                    )
                  }
                >
                  {reservationBeingUpdated ===
                    extensionReservation.id ||
                  (
                    Boolean(
                      extensionReservationGroupId,
                    ) &&
                    reservationGroupBeingUpdated ===
                      extensionReservationGroupId
                  )
                    ? "Guardando..."
                    : extensionReservationGroupId
                      ? "Extender todas"
                      : "Guardar extensión"}
                </Button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}