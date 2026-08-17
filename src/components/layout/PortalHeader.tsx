"use client";

import {
  UserButton,
} from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

import OrganizationSelector from "./OrganizationSelector";

export default function PortalHeader() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <Image
            src="/logos/lab-icon.png"
            alt="Datara Workspace"
            width={48}
            height={48}
            priority
            className="h-11 w-11 shrink-0 object-contain"
          />

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-950">
              Datara Workspace
            </p>

            <p className="truncate text-sm text-slate-500">
              {user?.tenantName ?? "Datara"}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-4">
          <OrganizationSelector />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>

            <p className="text-xs capitalize text-slate-500">
              {user?.role}
            </p>
          </div>

          <UserButton
            showName={false}
            appearance={{
              elements: {
                avatarBox: "h-10 w-10",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
