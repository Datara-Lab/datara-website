import { Check } from "lucide-react";

export default function FeatureList({ features }: { features: string[] }) {
  return <ul className="space-y-3 text-sm leading-6 text-slate-600">
    {features.map((feature) => <li key={feature} className="flex items-start gap-3">
      <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" />
      <span className="min-w-0 break-words">{feature}</span>
    </li>)}
  </ul>;
}
