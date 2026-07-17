type CheckboxProps = {
  label: string;
};

export default function Checkbox({
  label,
}: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">

      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300"
      />

      <span className="text-sm text-slate-600">
        {label}
      </span>

    </label>
  );
}