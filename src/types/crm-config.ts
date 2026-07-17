export type CRMFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "checkbox"
  | "lookup";

export type CRMFieldOption = {
  label: string;
  value: string;
};

export type CRMFieldValidation = {
  minLength?: number;
  maxLength?: number;

  min?: number;
  max?: number;

  pattern?: string;
  message?: string;
};

export type CRMFormColumn =
  | 1
  | 2;

export type CRMFormSpan =
  | 1
  | 2;

export type CRMFieldConfig = {
  key: string;
  zohoApiName?: string;

  label: string;
  description?: string;
  placeholder?: string;

  type: CRMFieldType;

  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;

  defaultValue?:
    | string
    | number
    | boolean
    | string[]
    | null;

  options?: CRMFieldOption[];

  validation?: CRMFieldValidation;

  showInForm?: boolean;
  showInTable?: boolean;
  showInDetail?: boolean;
  showInFilters?: boolean;

  /*
   * Orden general anterior.
   *
   * Se conserva para compatibilidad con módulos
   * que todavía no utilizan secciones.
   */
  formOrder?: number;
  tableOrder?: number;
  detailOrder?: number;

  tableWidth?: string;

  /*
   * Layout dinámico del formulario.
   */
  formSectionId?: string;

  /*
   * Número de fila dentro de la sección.
   */
  formRow?: number;

  /*
   * Columna izquierda o derecha.
   */
  formColumn?: CRMFormColumn;

  /*
   * Permite que un campo ocupe ambas columnas.
   */
  formSpan?: CRMFormSpan;

  /*
   * Variante visual futura.
   *
   * Ejemplos:
   * - select estándar
   * - selector múltiple
   * - búsqueda de registros
   * - fecha compacta
   */
  formVariant?:
    | "default"
    | "compact"
    | "searchable"
    | "tags"
    | "readonly";
};

export type CRMModuleView =
  | "table"
  | "cards"
  | "pipeline"
  | "calendar"
  | "timeline";

export type CRMFormSectionConfig = {
  id: string;

  title: string;
  description?: string;

  order: number;

  visible?: boolean;

  /*
   * Por ahora trabajaremos con dos columnas,
   * como el layout de Zoho.
   */
  columns?: 1 | 2;
};

export type CRMModuleConfig = {
  id: string;
  zohoModuleApiName?: string;

  singularLabel: string;
  pluralLabel: string;

  description?: string;
  icon?: string;

  route: string;
  primaryView: CRMModuleView;

  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowExport?: boolean;

  searchFields?: string[];

  defaultSortField?: string;
  defaultSortDirection?: "asc" | "desc";

  /*
   * Secciones del formulario.
   *
   * Si no existen, DynamicForm utilizará
   * el layout plano anterior.
   */
  formSections?: CRMFormSectionConfig[];

  fields: CRMFieldConfig[];
};

export type CRMPipelineStage = {
  id: string;
  zohoValue?: string;

  label: string;
  description?: string;

  order: number;
  color?: string;

  probability?: number;

  isWon?: boolean;
  isLost?: boolean;
};

export type CRMPipelineConfig = {
  id: string;
  label: string;

  moduleId: string;
  stageFieldKey: string;

  stages: CRMPipelineStage[];
};

export type CRMNavigationStatus =
  | "active"
  | "coming-soon"
  | "hidden";

export type CRMNavigationRole =
  | "owner"
  | "admin"
  | "manager"
  | "user";

export type CRMNavigationItemConfig = {
  id: string;
  label: string;

  route?: string;
  moduleId?: string;

  sectionId: string;
  order: number;

  status?: CRMNavigationStatus;
  visible?: boolean;

  allowedRoles?: CRMNavigationRole[];
};

export type CRMNavigationSectionConfig = {
  id: string;
  label: string;

  order: number;

  visible?: boolean;

  allowedRoles?: CRMNavigationRole[];
};

export type CRMTenantConfig = {
  tenantId: string;
  tenantName: string;

  zohoOrganizationId?: string;

  modules: CRMModuleConfig[];
  pipelines?: CRMPipelineConfig[];

  navigationSections:
    CRMNavigationSectionConfig[];

  navigation:
    CRMNavigationItemConfig[];
};