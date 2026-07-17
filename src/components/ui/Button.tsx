import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type SharedProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type NativeButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ButtonProps = NativeButtonProps | LinkButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
  "bg-gradient-to-r from-blue-700 to-cyan-500 !text-white shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 hover:!text-white hover:shadow-xl",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  danger:
    "bg-red-600 text-white shadow-md hover:-translate-y-0.5 hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

function buildClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return [
    "inline-flex items-center justify-center rounded-xl font-normal transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    className,
    ...rest
  } = props;

  const finalClassName = buildClassName(variant, size, className);

  if ("href" in props && props.href) {
    return (
      <a className={finalClassName} {...(rest as LinkButtonProps)}>
        {children}
      </a>
    );
  }

  return (
    <button className={finalClassName} {...(rest as NativeButtonProps)}>
      {children}
    </button>
  );
}