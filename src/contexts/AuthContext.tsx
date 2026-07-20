"use client";

import {
  useAuth as useClerkAuth,
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";

import type {
  ProductAccess,
  User,
  UserRole,
} from "@/types/user";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

type AuthProviderProps = {
  children: ReactNode;
};

function normalizeRole(
  role?: string | null,
): UserRole {
  switch (role) {
    case "org:admin":
      return "admin";

    case "org:manager":
      return "manager";

    default:
      return "user";
  }
}

function getProductAccess(
  metadata: unknown,
): ProductAccess[] {
  if (
    typeof metadata !== "object" ||
    metadata === null
  ) {
    return [];
  }

  const products = (
    metadata as {
      products?: unknown;
    }
  ).products;

  if (!Array.isArray(products)) {
    return [];
  }

  return products.filter(
    (
      product,
    ): product is ProductAccess =>
      product === "crm" ||
      product === "analytics" ||
      product === "cloud",
  );
}

function SignedInAuthProvider({
  children,
}: AuthProviderProps) {
  const { user: clerkUser } = useUser();

  const {
    organization,
    membership,
    isLoaded: isOrganizationLoaded,
  } = useOrganization();

  const {
    isLoaded: isOrganizationListLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const {
    openSignIn,
    signOut,
  } = useClerk();

  const firstMembership =
    userMemberships.data?.[0] ?? null;

  useEffect(() => {
    if (
      organization ||
      !isOrganizationListLoaded ||
      !setActive ||
      !firstMembership
    ) {
      return;
    }

    void setActive({
      organization:
        firstMembership.organization.id,
    });
  }, [
    organization,
    isOrganizationListLoaded,
    setActive,
    firstMembership,
  ]);

  const resolvedOrganization =
    organization ??
    firstMembership?.organization ??
    null;

  const resolvedRole =
    membership?.role ??
    firstMembership?.role ??
    null;

  const isLoading =
    !clerkUser ||
    !isOrganizationLoaded ||
    !isOrganizationListLoaded ||
    userMemberships.isLoading;

  const user = useMemo<User | null>(() => {
    if (
      !clerkUser ||
      !resolvedOrganization
    ) {
      return null;
    }

    return {
      id: clerkUser.id,

      firstName:
        clerkUser.firstName ??
        clerkUser.username ??
        "Usuario",

      lastName:
        clerkUser.lastName ?? "",

      email:
        clerkUser.primaryEmailAddress
          ?.emailAddress ?? "",

      role: normalizeRole(
        resolvedRole,
      ),

      tenantId:
        resolvedOrganization.slug ??
        resolvedOrganization.id,

      tenantName:
        resolvedOrganization.name,

      products: getProductAccess(
        resolvedOrganization.publicMetadata,
      ),
    };
  }, [
    clerkUser,
    resolvedOrganization,
    resolvedRole,
  ]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        isAuthenticated:
          Boolean(user),
        isLoading,

        login: () => {
          void openSignIn({
            forceRedirectUrl:
              "/portal",
          });
        },

        logout: () => {
          void signOut({
            redirectUrl: "/login",
          });
        },
      }),
      [
        user,
        isLoading,
        openSignIn,
        signOut,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

function SignedOutAuthProvider({
  children,
}: AuthProviderProps) {
  const {
    openSignIn,
    signOut,
  } = useClerk();

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,

        login: () => {
          void openSignIn({
            forceRedirectUrl:
              "/portal",
          });
        },

        logout: () => {
          void signOut({
            redirectUrl: "/login",
          });
        },
      }),
      [
        openSignIn,
        signOut,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const {
    isLoaded,
    isSignedIn,
  } = useClerkAuth();

  const {
    openSignIn,
    signOut,
  } = useClerk();

  const loadingValue =
    useMemo<AuthContextValue>(
      () => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,

        login: () => {
          void openSignIn({
            forceRedirectUrl:
              "/portal",
          });
        },

        logout: () => {
          void signOut({
            redirectUrl: "/login",
          });
        },
      }),
      [
        openSignIn,
        signOut,
      ],
    );

  if (!isLoaded) {
    return (
      <AuthContext.Provider
        value={loadingValue}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  if (!isSignedIn) {
    return (
      <SignedOutAuthProvider>
        {children}
      </SignedOutAuthProvider>
    );
  }

  return (
    <SignedInAuthProvider>
      {children}
    </SignedInAuthProvider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider.",
    );
  }

  return context;
}