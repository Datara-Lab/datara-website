type MetricTone = "positive" | "negative" | "neutral";

type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
  helperText?: string;
  tone?: MetricTone;
};

const toneStyles: Record<MetricTone, string> = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-slate-500",
};

export default function MetricCard({
  label,
  value,
  change,
  helperText,
  tone,
}: MetricCardProps) {
  const resolvedTone: MetricTone =
    tone ??
    (change?.trim().startsWith("+")
      ? "positive"
      : change?.trim().startsWith("-")
        ? "negative"
        : "neutral");

  return (
    <article className="flex min-h-[170px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-4 break-words text-3xl font-black tracking-tight text-slate-950">
          {value}
        </p>
      </div>

      {(change || helperText) && (
        <div className="mt-5">
          {change && (
            <p
              className={[
                "text-sm font-semibold",
                toneStyles[resolvedTone],
              ].join(" ")}
            >
              {change}
            </p>
          )}

          {helperText && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {helperText}
            </p>
          )}
        </div>
      )}
    </article>
  );
}