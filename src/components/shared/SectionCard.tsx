import { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

      {(title || subtitle || action) && (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            {subtitle && (
              <p className="text-sm font-semibold text-blue-600">
                {subtitle}
              </p>
            )}

            {title && (
              <h3 className="mt-1 text-2xl font-bold text-slate-950">
                {title}
              </h3>
            )}

          </div>

          {action}

        </div>
      )}

      {children}

    </section>
  );
}