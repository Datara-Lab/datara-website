type InsightTone = "positive" | "warning" | "danger" | "info";

export type Insight = {
  id: string;
  title: string;
  description: string;
  tone: InsightTone;
};

type InsightsCardProps = {
  title?: string;
  description?: string;
  insights: Insight[];
};

const toneStyles: Record<
  InsightTone,
  {
    dot: string;
    badge: string;
    label: string;
  }
> = {
  positive: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Positivo",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
    label: "Atención",
  },
  danger: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700",
    label: "Prioridad",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
    label: "Oportunidad",
  },
};

export default function InsightsCard({
  title = "Datara Intelligence",
  description = "La plataforma analizó automáticamente la información más reciente de tu empresa y detectó estos hallazgos.",
  insights,
}: InsightsCardProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-xl shadow-blue-950/15 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              {title}
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              {description}
            </p>
          </div>

          <span className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100 backdrop-blur">
            {insights.length} hallazgos
          </span>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => {
            const styles = toneStyles[insight.tone];

            return (
              <article
                key={insight.id}
                className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/15"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={[
                      "mt-1.5 h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]",
                      styles.dot,
                    ].join(" ")}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-white">
                        {insight.title}
                      </h3>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          styles.badge,
                        ].join(" ")}
                      >
                        {styles.label}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}