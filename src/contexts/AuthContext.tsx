"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import type { User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const mockUser: User = {
  id: "usr_001",
  firstName: "Paul",
  lastName: "Augdey",
  email: "paul@datara-lab.com",
  role: "admin",
  tenantId: "tenant_datara",
  tenantName: "Datara Lab",
  products: ["crm", 'analytics'],
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(mockUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: () => setUser(mockUser),
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }

  return context;
}