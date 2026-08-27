"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readSheet,
} from "read-excel-file/browser";
import writeXlsxFile, {
  type Sheet,
} from "write-excel-file/browser";

import dataValidation, {
  type DataValidationRule,
  type DataValidationSheetOptions,
} from "@onparallel/write-excel-file-data-validation";

type Entity = "leads" | "customers" | "catalog";
type RowStatus = "valid" | "duplicate" | "error";
type RowResult = {
  rowNumber: number;
  status: RowStatus;
  errors: string[];
  data: Record<string, unknown>;
};
type Summary = {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  importedRows?: number;
};
type Job = {
  id: string;
  entityType: Entity;
  fileName: string;
  status: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  performedByName: string;
  createdAt: string;
};
type CatalogOption = {
  key: string;
  name: string;
  categories: string[];
};
type Field = {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
  example: string | number | boolean;
};

const entityLabels: Record<Entity, string> = {
  leads: "Prospectos",
  customers: "Clientes",
  catalog: "Catálogo",
};

const baseFields: Record<Entity, Field[]> = {
  leads: [
    { key: "firstName", label: "Nombre", required: true, aliases: ["nombre", "first name"], example: "Ana" },
    { key: "lastName", label: "Apellidos", aliases: ["apellido", "apellidos", "last name"], example: "López" },
    { key: "email", label: "Correo", aliases: ["correo", "email", "correo electrónico"], example: "ana@empresa.com" },
    { key: "phone", label: "Teléfono", aliases: ["telefono", "teléfono", "phone"], example: "5555550101" },
    { key: "mobile", label: "Celular", aliases: ["celular", "movil", "móvil", "mobile"], example: "5555550102" },
    { key: "company", label: "Empresa", aliases: ["empresa", "compañía", "company"], example: "Empresa Ejemplo" },
    { key: "source", label: "Origen", aliases: ["origen", "fuente", "source"], example: "Referido" },
    { key: "status", label: "Estado", aliases: ["estado", "estatus", "status"], example: "Nuevo" },
    { key: "branchCode", label: "Código de sucursal", aliases: ["sucursal", "codigo sucursal", "código de sucursal"], example: "MATRIZ" },
    { key: "commercialConsent", label: "Consentimiento comercial", aliases: ["consentimiento", "consentimiento comercial"], example: true },
    { key: "notes", label: "Notas", aliases: ["notas", "observaciones"], example: "Solicitó información" },
  ],
  customers: [
    { key: "customerType", label: "Tipo", required: true, aliases: ["tipo", "tipo cliente"], example: "Persona" },
    { key: "name", label: "Nombre", aliases: ["nombre", "first name"], example: "Ana" },
    { key: "lastName", label: "Apellidos", aliases: ["apellido", "apellidos"], example: "López" },
    { key: "companyName", label: "Empresa", aliases: ["empresa", "razón comercial"], example: "Empresa Ejemplo" },
    { key: "legalName", label: "Razón social", aliases: ["razon social", "razón social"], example: "Empresa Ejemplo, S.A. de C.V." },
    { key: "taxId", label: "RFC", aliases: ["rfc", "tax id"], example: "XAXX010101000" },
    { key: "email", label: "Correo", aliases: ["correo", "email"], example: "compras@empresa.com" },
    { key: "phone", label: "Teléfono", aliases: ["telefono", "teléfono", "phone"], example: "5555550101" },
    { key: "mobile", label: "Celular", aliases: ["celular", "movil", "móvil"], example: "5555550102" },
    { key: "status", label: "Estado", aliases: ["estado", "estatus"], example: "Activo" },
    { key: "addressLine", label: "Dirección", aliases: ["direccion", "dirección", "domicilio"], example: "Av. Ejemplo 100" },
    { key: "city", label: "Ciudad", aliases: ["ciudad", "municipio"], example: "Cuautitlán Izcalli" },
    { key: "state", label: "Entidad", aliases: ["entidad", "estado domicilio"], example: "Estado de México" },
    { key: "postalCode", label: "Código postal", aliases: ["codigo postal", "código postal", "cp"], example: "54700" },
    { key: "country", label: "País", aliases: ["pais", "país"], example: "MX" },
    { key: "branchCode", label: "Código de sucursal", aliases: ["sucursal", "codigo sucursal"], example: "MATRIZ" },
    { key: "commercialConsent", label: "Consentimiento comercial", aliases: ["consentimiento", "consentimiento comercial"], example: true },
    { key: "notes", label: "Notas", aliases: ["notas", "observaciones"], example: "Cliente importado" },
  ],
  catalog: [
    { key: "name", label: "Nombre", required: true, aliases: ["nombre", "producto", "servicio"], example: "Servicio de diagnóstico" },
    { key: "code", label: "Código", required: true, aliases: ["codigo", "código", "sku"], example: "SRV-001" },
    { key: "productType", label: "Tipo de elemento", required: true, aliases: ["tipo", "tipo de elemento", "product type"], example: "Servicio" },
    { key: "description", label: "Descripción", aliases: ["descripcion", "descripción"], example: "Diagnóstico general" },
    { key: "category", label: "Categoría", aliases: ["categoria", "categoría"], example: "Servicios" },
    { key: "unitPrice", label: "Precio unitario", aliases: ["precio", "precio unitario"], example: 750 },
    { key: "currency", label: "Moneda", aliases: ["moneda", "currency"], example: "MXN" },
    { key: "active", label: "Activo", aliases: ["activo", "active"], example: true },
  ],
};

const motorcycleCatalogFields: Field[] = [
  { key: "modelYear", label: "Año del modelo", aliases: ["año", "ano", "año modelo"], example: 2026 },
  { key: "colors", label: "Colores disponibles", aliases: ["colores", "colores disponibles"], example: "Negro, rojo, blanco" },
  { key: "engine", label: "Motor", aliases: ["motor"], example: "4 tiempos, monocilíndrico, DOHC" },
  { key: "displacement", label: "Cilindrada", aliases: ["cilindrada", "cc"], example: "449 cc" },
  { key: "power", label: "Potencia", aliases: ["potencia", "hp"], example: "50 HP a 9,500 rpm" },
  { key: "coolingSystem", label: "Sistema de enfriamiento", aliases: ["enfriamiento", "sistema de enfriamiento"], example: "Refrigeración líquida" },
  { key: "transmission", label: "Transmisión", aliases: ["transmision", "transmisión"], example: "6 velocidades" },
  { key: "fuelCapacity", label: "Capacidad del tanque", aliases: ["tanque", "capacidad del tanque"], example: "14 litros" },
  { key: "loadCapacity", label: "Capacidad de carga", aliases: ["carga", "capacidad de carga"], example: "153 kg" },
  { key: "passengerCapacity", label: "Capacidad de pasajeros", aliases: ["pasajeros", "capacidad de pasajeros"], example: "2 personas" },
  { key: "warranty", label: "Garantía", aliases: ["garantia", "garantía"], example: "2 años o 40,000 km" },
];

function getFields(
  entity: Entity,
  industry: string,
): Field[] {
  if (
    entity === "catalog" &&
    industry ===
      "motorcycle_dealership"
  ) {
    const commercialIndex =
      baseFields.catalog.findIndex(
        (field) =>
          field.key === "unitPrice",
      );

    return [
      ...baseFields.catalog.slice(
        0,
        commercialIndex,
      ),
      ...motorcycleCatalogFields,
      ...baseFields.catalog.slice(
        commercialIndex,
      ),
    ];
  }

  return baseFields[entity];
}

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export default function CRMImportCenter() {
  const [entity, setEntity] = useState<Entity>("leads");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RowResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [maximumRows, setMaximumRows] = useState(5000);
  const [industry, setIndustry] = useState("");
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function loadHistory() {
    const response = await fetch("/api/crm/imports", { cache: "no-store" });
    const result = await response.json() as { success: boolean; error?: string; data?: { jobs: Job[]; maximumRows: number; industry: string; catalogOptions: CatalogOption[] } };
    if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible consultar el Centro de carga.");
    setJobs(result.data.jobs);
    setMaximumRows(result.data.maximumRows);
    setIndustry(result.data.industry);
    setCatalogOptions(result.data.catalogOptions);
  }

  useEffect(() => {
    let active = true;

    void fetch(
      "/api/crm/imports",
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const result =
          await response.json() as {
            success: boolean;
            error?: string;
            data?: {
              jobs: Job[];
              maximumRows: number;
              industry: string;
              catalogOptions: CatalogOption[];
            };
          };

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.error ??
              "No fue posible consultar el Centro de carga.",
          );
        }

        if (active) {
          setJobs(result.data.jobs);
          setMaximumRows(
            result.data.maximumRows,
          );
          setIndustry(
            result.data.industry,
          );
          setCatalogOptions(
            result.data.catalogOptions,
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "No fue posible cargar el historial.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const mappedRows = useMemo(() => sourceRows.map((row) => Object.fromEntries(Object.entries(mapping).filter(([, header]) => header).map(([field, header]) => [field, row[headers.indexOf(header)] ?? null]))), [headers, mapping, sourceRows]);
  const activeFields = useMemo(
    () => getFields(
      entity,
      industry,
    ),
    [entity, industry],
  );

  function resetFile() {
    setFileName(""); setHeaders([]); setSourceRows([]); setMapping({}); setResults([]); setSummary(null); setConfirmed(false); setMessage(null);
  }

  async function handleFile(file: File) {
    setBusy(true); setMessage(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let matrix: unknown[][];

      if (extension === "csv") {
        matrix = parseCsv(
          await file.text(),
        );
      } else if (extension === "xlsx") {
        matrix =
          await readSheet(file) as
            unknown[][];
      } else {
        matrix = [];
      }
      if (!matrix.length) throw new Error("Selecciona un archivo XLSX o CSV con encabezados y datos.");
      const nextHeaders = matrix[0].map((cell) => String(cell ?? "").trim());
      if (new Set(nextHeaders.filter(Boolean)).size !== nextHeaders.filter(Boolean).length) throw new Error("Los encabezados del archivo no pueden estar duplicados.");
      const nextRows = matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
      if (!nextRows.length) throw new Error("El archivo no contiene filas para importar.");
      if (nextRows.length > maximumRows) throw new Error(`El archivo excede el máximo de ${maximumRows.toLocaleString("es-MX")} filas.`);
      const normalizedHeaders = nextHeaders.map(normalizeHeader);
      const automatic = Object.fromEntries(activeFields.map((field) => {
        const candidates = [field.label, field.key, ...field.aliases].map(normalizeHeader);
        const index = normalizedHeaders.findIndex((header) => candidates.includes(header));
        return [field.key, index >= 0 ? nextHeaders[index] : ""];
      }));
      setFileName(file.name); setHeaders(nextHeaders); setSourceRows(nextRows); setMapping(automatic); setResults([]); setSummary(null); setConfirmed(false);
    } finally { setBusy(false); }
  }

  async function submit(action: "validate" | "import") {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/crm/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, entity, fileName, rows: mappedRows }) });
      const result = await response.json() as { success: boolean; error?: string; message?: string; data?: { results?: RowResult[]; summary?: Summary } & Summary };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "No fue posible procesar el archivo.");
      if (action === "validate") { setResults(result.data.results ?? []); setSummary(result.data.summary ?? null); setConfirmed(false); }
      else { setSummary(result.data); setMessage(result.message ?? "Importación terminada."); setConfirmed(false); await loadHistory(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible procesar el archivo."); }
    finally { setBusy(false); }
  }

  function downloadReport() {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = ["Fila,Resultado,Detalle", ...results.map((row) => [row.rowNumber, row.status, row.errors.join(" | ")].map(escape).join(","))].join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })); link.download = `reporte-${entity}-${Date.now()}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  async function downloadTemplate() {
    const selectedFields = activeFields;
    const preferredCatalogOption =
      catalogOptions.find(
        (option) =>
          option.key === "model",
      ) ?? catalogOptions[0];
    const exampleByKey:
      Record<
        string,
        string |
        number |
        boolean |
        undefined
      > = {
      productType:
        preferredCatalogOption
          ?.name,
      category:
        preferredCatalogOption
          ?.categories[0],
    };
    const templateData = [
      selectedFields.map((field) => ({ value: field.label, fontWeight: "bold" as const, backgroundColor: "#2563EB", color: "#FFFFFF" })),
      selectedFields.map((field) => ({
        value:
          exampleByKey[field.key] ??
          field.example,
      })),
    ];
    const fileName =
      `plantilla-datara-${entity}${
        entity === "catalog" &&
        industry
          ? `-${industry}`
          : ""
      }.xlsx`;

    if (entity !== "catalog") {
      await writeXlsxFile(
        templateData,
      ).toFile(fileName);
      return;
    }

    const productTypeNames =
      catalogOptions.map(
        (option) => option.name,
      );
    const categoryNames =
      Array.from(
        new Set(
          catalogOptions.flatMap(
            (option) =>
              option.categories,
          ),
        ),
      );
    const optionsLength =
      Math.max(
        productTypeNames.length,
        categoryNames.length,
        1,
      );
    const optionsData = [
      [
        {
          value: "Tipos de elemento",
          fontWeight: "bold" as const,
          backgroundColor: "#DBEAFE",
        },
        {
          value: "Categorías",
          fontWeight: "bold" as const,
          backgroundColor: "#CFFAFE",
        },
      ],
      ...Array.from(
        {
          length: optionsLength,
        },
        (_, index) => [
          productTypeNames[index] ??
            null,
          categoryNames[index] ??
            null,
        ],
      ),
    ];
    const productTypeColumn =
      selectedFields.findIndex(
        (field) =>
          field.key ===
          "productType",
      ) + 1;
    const categoryColumn =
      selectedFields.findIndex(
        (field) =>
          field.key === "category",
      ) + 1;
    const validationRules:
      DataValidationRule[] = [
        {
          cellRange: {
            from: {
              row: 2,
              column:
                productTypeColumn,
            },
            to: {
              row: maximumRows + 1,
              column:
                productTypeColumn,
            },
          },
          validation: {
            type: "list",
            valuesRange:
              `'Opciones'!$A$2:$A$${productTypeNames.length + 1}`,
            allowBlank: false,
            inputTitle:
              "Tipo de elemento",
            input:
              "Selecciona una opción configurada en Datara.",
            errorTitle:
              "Tipo no válido",
            error:
              "Selecciona un tipo de la lista.",
          },
        },
      ];

    if (categoryNames.length > 0) {
      validationRules.push({
        cellRange: {
          from: {
            row: 2,
            column:
              categoryColumn,
          },
          to: {
            row: maximumRows + 1,
            column:
              categoryColumn,
          },
        },
        validation: {
          type: "list",
          valuesRange:
            `'Opciones'!$B$2:$B$${categoryNames.length + 1}`,
          allowBlank: false,
          inputTitle: "Categoría",
          input:
            "Selecciona una categoría configurada en Datara.",
          errorTitle:
            "Categoría no válida",
          error:
            "Selecciona una categoría de la lista.",
        },
      });
    }

    const mainSheet:
      Sheet<File | Blob | ArrayBuffer> &
      DataValidationSheetOptions = {
      sheet: "Carga",
      data: templateData,
      dataValidation:
        validationRules,
    };

    await writeXlsxFile(
      [
        mainSheet,
        {
          sheet: "Opciones",
          data: optionsData,
        },
      ],
      {
        features: [
          dataValidation,
        ],
      },
    ).toFile(
      fileName,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/crm/configuracion" className="text-sm font-bold text-blue-600 hover:text-blue-800">← Volver a configuración</Link>
        <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">Administración</p><h1 className="mt-2 text-3xl font-black text-slate-950">Centro de carga</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Importa información nueva desde Excel o CSV. Datara valida todo antes de guardar y nunca reemplaza registros existentes.</p></div>
          <button type="button" disabled={entity === "catalog" && (!industry || catalogOptions.length === 0)} onClick={() => void downloadTemplate()} className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">Descargar plantilla</button>
        </div>

        {message && <p className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-900">{message}</p>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">Información a importar<select value={entity} onChange={(event) => { setEntity(event.target.value as Entity); resetFile(); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-900"><option value="leads">Prospectos</option><option value="customers">Clientes</option><option value="catalog">Catálogo</option></select></label>
            <label className="md:col-span-2 text-sm font-bold text-slate-700">Archivo XLSX o CSV<input type="file" accept=".xlsx,.csv" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No fue posible leer el archivo.")); }} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-bold file:text-white" /></label>
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-500">Máximo {maximumRows.toLocaleString("es-MX")} filas. Sólo se crearán filas válidas; duplicados y errores se omitirán.</p>

          {headers.length > 0 && <div className="mt-8"><h2 className="text-xl font-black text-slate-950">Relaciona las columnas</h2><p className="mt-2 text-sm text-slate-600">Revisa la detección automática y corrige cualquier columna antes de validar.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{activeFields.map((field) => <label key={field.key} className="text-sm font-bold text-slate-700">{field.label}{field.required && <span className="text-red-600"> *</span>}<select value={mapping[field.key] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [field.key]: event.target.value })); setResults([]); setSummary(null); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900"><option value="">No importar</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><button type="button" disabled={busy || activeFields.filter((field) => field.required).some((field) => !mapping[field.key])} onClick={() => void submit("validate")} className="mt-7 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? "Validando…" : `Validar ${sourceRows.length.toLocaleString("es-MX")} filas`}</button></div>}
        </section>

        {summary && <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950">Resultado de la validación</h2><p className="mt-2 text-sm text-slate-600">Revisa el resultado antes de confirmar la importación.</p></div>{results.length > 0 && <button type="button" onClick={downloadReport} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Descargar reporte CSV</button>}</div><div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</p><p className="mt-2 text-2xl font-black text-slate-950">{summary.totalRows}</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Listas para importar</p><p className="mt-2 text-2xl font-black text-emerald-800">{summary.validRows}</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Duplicadas</p><p className="mt-2 text-2xl font-black text-amber-800">{summary.duplicateRows}</p></div><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Con errores</p><p className="mt-2 text-2xl font-black text-red-800">{summary.errorRows}</p></div></div>{results.length > 0 && <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead><tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Fila</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Detalle</th></tr></thead><tbody>{results.slice(0, 50).map((row) => <tr key={row.rowNumber} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-700">{row.rowNumber}</td><td className="px-4 py-3"><span className={row.status === "valid" ? "font-bold text-emerald-700" : row.status === "duplicate" ? "font-bold text-amber-700" : "font-bold text-red-700"}>{row.status === "valid" ? "Lista" : row.status === "duplicate" ? "Duplicada" : "Error"}</span></td><td className="px-4 py-3 text-slate-600">{row.errors.join(" · ") || "Sin observaciones"}</td></tr>)}</tbody></table>{results.length > 50 && <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">Se muestran las primeras 50 filas. Descarga el reporte para consultar el archivo completo.</p>}</div>}{results.length > 0 && summary.validRows > 0 && <div className="mt-7 border-t border-slate-200 pt-6"><label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" />Confirmo que revisé el resultado. Entiendo que se crearán {summary.validRows.toLocaleString("es-MX")} registros nuevos y que Datara omitirá los duplicados y las filas con errores.</label><button type="button" disabled={!confirmed || busy} onClick={() => void submit("import")} className="mt-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-black text-white hover:from-blue-700 hover:to-cyan-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300">{busy ? "Importando…" : `Importar ${summary.validRows.toLocaleString("es-MX")} registros`}</button></div>}</section>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><h2 className="text-xl font-black text-slate-950">Historial de cargas</h2>{jobs.length === 0 ? <p className="mt-4 text-sm text-slate-600">Todavía no hay importaciones registradas.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Archivo</th><th className="px-3 py-3">Contenido</th><th className="px-3 py-3">Importados</th><th className="px-3 py-3">Omitidos</th><th className="px-3 py-3">Administrador</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className="border-b border-slate-100"><td className="px-3 py-3 text-slate-600">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(job.createdAt))}</td><td className="px-3 py-3 font-semibold text-slate-900">{job.fileName}</td><td className="px-3 py-3 text-slate-600">{entityLabels[job.entityType]}</td><td className="px-3 py-3 font-bold text-emerald-700">{job.importedRows}</td><td className="px-3 py-3 text-amber-700">{job.duplicateRows + job.errorRows}</td><td className="px-3 py-3 text-slate-600">{job.performedByName}</td></tr>)}</tbody></table></div>}</section>
      </div>
    </main>
  );
}
