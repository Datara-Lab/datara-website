type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
};

export default function MetricCard({
  label,
  value,
  change,
}: MetricCardProps) {
  const isPositive = change?.trim().startsWith("+");

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>

      {change && (
        <p
          className={[
            "mt-3 text-sm font-semibold",
            isPositive ? "text-emerald-600" : "text-red-600",
          ].join(" ")}
        >
          {change}
        </p>
      )}
    </article>
  );
}