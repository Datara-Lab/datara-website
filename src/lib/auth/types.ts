export type DataraProduct =
  | "crm"
  | "analytics"
  | "cloud";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "manage";

export type ProductAccessResult = {
  allowed: boolean;
  product: DataraProduct;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
};

export type ModulePermissionResult = {
  allowed: boolean;
  product: DataraProduct;
  moduleId: string;
  action: PermissionAction;
  roleId: string | null;
};

export type AuthorizationContext = {
  tenantId: string;
  memberId: string;
  clerkUserId: string;
};