type EmailUsage = {
  used: number;
  limit: number;
  available: number | null;
  atLimit: boolean;
};

export function EmailUsageCard({ usage }: { usage: EmailUsage }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">
            Correos comerciales este mes
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-600">
            Se contabilizan cotizaciones y automatizaciones enviadas desde el
            CRM.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
          {usage.limit > 0
            ? `${usage.used} de ${usage.limit}`
            : `${usage.used} enviados`}
        </span>
      </div>

      {usage.limit > 0 ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className={[
                "h-full rounded-full transition-all",
                usage.atLimit
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500",
              ].join(" ")}
              style={{
                width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
              }}
            />
          </div>

          <p className="mt-3 text-xs font-bold text-slate-600">
            {usage.atLimit
              ? "Límite alcanzado. Contrata una expansión para continuar enviando."
              : `${usage.available ?? 0} correos disponibles hasta el próximo mes.`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs font-bold text-slate-600">
          Esta contratación conserva capacidad de correo sin límite configurado.
        </p>
      )}
    </div>
  );
}

type StorageUsage = {
  usedGb: number;
  limitGb: number;
  availableGb: number | null;
  percentage: number | null;
  atLimit: boolean;
};

export function StorageUsageCard({ usage }: { usage: StorageUsage }) {
  return (
    <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">Almacenamiento</p>

          <p className="mt-1 text-xs font-semibold text-slate-600">
            Incluye documentos, imágenes de productos y logotipo empresarial.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm">
          {usage.limitGb > 0
            ? `${usage.usedGb} de ${usage.limitGb} GB`
            : `${usage.usedGb} GB usados`}
        </span>
      </div>

      {usage.limitGb > 0 ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-100">
            <div
              className={[
                "h-full rounded-full transition-all",
                usage.atLimit
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600",
              ].join(" ")}
              style={{
                width: `${usage.percentage ?? 0}%`,
              }}
            />
          </div>

          <p className="mt-3 text-xs font-bold text-slate-600">
            {usage.atLimit
              ? "Límite alcanzado. Elimina archivos o contrata almacenamiento adicional."
              : `${usage.availableGb ?? 0} GB disponibles.`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs font-bold text-slate-600">
          Esta contratación conserva almacenamiento sin límite configurado.
        </p>
      )}
    </div>
  );
}
