import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-200
        bg-white
        shadow-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}