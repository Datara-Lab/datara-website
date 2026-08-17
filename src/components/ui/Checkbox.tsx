import type {
  InputHTMLAttributes,
  ReactNode,
} from "react";

type CheckboxProps =
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type"
  > & {
    label: ReactNode;
    description?: ReactNode;
  };

export default function Checkbox({
  label,
  description,
  className = "",
  ...props
}: CheckboxProps) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3",
        props.disabled &&
          "cursor-not-allowed opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-700">
          {label}
        </span>

        {description ? (
          <span className="mt-1 block text-sm leading-5 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}