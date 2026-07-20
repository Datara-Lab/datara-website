"use client";

import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import type { ReactNode } from "react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import type { NavigationItem } from "@/lib/navigation";

type ProductTheme =
  | "analytics"
  | "crm";

type AppShellProps = {
  children: ReactNode;
  product: ProductTheme;
  productName: string;
  productLogo: string;
  navigation: NavigationItem[];
};

const productStyles: Record<
  ProductTheme,
  {
    activeItem: string;
    eyebrow: string;
  }
> = {
  analytics: {
    activeItem:
      "bg-blue-50 text-blue-700",
    eyebrow: "text-blue-600",
  },
  crm: {
    activeItem:
      "bg-emerald-50 text-emerald-700",
    eyebrow: "text-emerald-600",
  },
};

export default function AppShell({
  children,
  product,
  productName,
  productLogo,
  navigation,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const styles = productStyles[product];

  function isNavigationItemActive(
    href: string,
  ) {
    if (href === `/${product}`) {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              router.push("/portal")
            }
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <Image
              src={productLogo}
              alt={productName}
              width={48}
              height={48}
              priority
              className="h-11 w-11 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">
                {productName}
              </p>

              <p className="truncate text-sm text-slate-500">
                {user?.tenantName ??
                  "Datara"}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user?.firstName}{" "}
                {user?.lastName}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {user?.role}
              </p>
            </div>

            <UserButton
              showName={false}
              appearance={{
                elements: {
                  avatarBox:
                    "h-10 w-10",
                },
              }}
            />
          </div>
        </div>

        <nav className="border-t border-slate-200 px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {navigation.map((item) => {
              const isActive =
                isNavigationItemActive(
                  item.href,
                );

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      item.href,
                    )
                  }
                  className={[
                    "min-h-11 rounded-xl px-3 py-2 text-center text-xs font-semibold transition sm:text-sm",
                    isActive
                      ? product ===
                        "analytics"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="grid min-h-[calc(100vh-80px)] lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-20 hidden h-[calc(100vh-80px)] self-start border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1.5">
              {navigation.map(
                (item) => {
                  const isActive =
                    isNavigationItemActive(
                      item.href,
                    );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          item.href,
                        )
                      }
                      className={[
                        "flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold transition",
                        isActive
                          ? styles.activeItem
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                },
              )}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() =>
                router.push("/portal")
              }
            >
              Volver al portal
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}