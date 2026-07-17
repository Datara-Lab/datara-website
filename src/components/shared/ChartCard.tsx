import type { ReactNode } from "react";

type ChartCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function ChartCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow && (
            <p className="text-sm font-semibold text-blue-600">
              {eyebrow}
            </p>
          )}

          <h3 className="mt-1 text-2xl font-bold text-slate-950">
            {title}
          </h3>

          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="mt-8">
        {children}
      </div>
    </section>
  );
}