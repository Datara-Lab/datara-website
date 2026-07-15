export type ProductAccess = "analytics" | "crm";

export type UserRole = "owner" | "admin" | "manager" | "user";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  products: ProductAccess[];
};