import Image from "next/image";

type FloatingModuleProps = {
  icon: string;
  title: string;
  subtitle: string;
  rotation?: string;
};

export default function FloatingModule({
  icon,
  title,
  subtitle,
  rotation = "",
}: FloatingModuleProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-white/10
        bg-white/95
        p-5
        shadow-2xl
        backdrop-blur
        ${rotation}
      `}
    >
      <div className="flex items-center gap-4">

        <Image
          src={icon}
          alt={title}
          width={52}
          height={52}
        />

        <div>

          <h3 className="text-xl font-bold text-slate-900">
            {title}
          </h3>

          <p className="text-sm text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>
    </div>
  );
}