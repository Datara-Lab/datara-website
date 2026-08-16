export type ProductAccess =
  | "analytics"
  | "crm"
  | "cloud";

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "user";

export type UserIndustry =
  | "motorcycle_dealership"
  | "automotive_dealership"
  | "veterinary"
  | "real_estate"
  | "retail"
  | "professional_services"
  | "other";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  industry:
    | UserIndustry
    | null;
  products: ProductAccess[];
};