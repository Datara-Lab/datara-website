import { createCustomersModule } from "@/config/crm/modules/customers";
import type {
  CRMFieldConfig,
  CRMModuleConfig,
} from "@/types/crm-config";

type PetTerminology = Parameters<typeof createCustomersModule>[0];

const hiddenFields = new Set([
  "companyName",
  "productId",
  "sourceLeadId",
]);

export function createPetTutorsModule(
  terminology?: PetTerminology,
): CRMModuleConfig {
  const base = createCustomersModule(terminology);

  return {
    ...base,
    singularLabel: "Tutor",
    pluralLabel: "Tutores",
    description:
      "Personas responsables de las mascotas, sus datos de contacto y su relación con cada expediente.",
    searchFields: [
      "displayName",
      "petNames",
      "email",
      "phone",
      "mobile",
      "taxId",
      "status",
    ],
    formSections: [
      {
        id: "customer-information",
        title: "Datos del tutor",
        description: "Nombre y estado de la persona responsable.",
        order: 1,
        columns: 2,
      },
      {
        id: "related-pets",
        title: "Mascotas relacionadas",
        description:
          "Expedientes registrados bajo la responsabilidad de este tutor.",
        order: 2,
        columns: 1,
      },
      {
        id: "contact-information",
        title: "Contacto",
        description: "Medios para localizar al tutor cuando sea necesario.",
        order: 3,
        columns: 2,
      },
      {
        id: "address-information",
        title: "Dirección",
        description: "Domicilio principal del tutor.",
        order: 4,
        columns: 2,
      },
      {
        id: "commercial-information",
        title: "Atención y sucursal",
        description: "Sucursal y responsable que atienden al tutor.",
        order: 5,
        columns: 2,
      },
      {
        id: "fiscal-information",
        title: "Datos fiscales opcionales",
        description: "Información necesaria únicamente cuando el tutor requiera factura.",
        order: 6,
        columns: 2,
      },
      {
        id: "additional-information",
        title: "Notas y consentimiento",
        description: "Indicaciones útiles y autorización de contacto.",
        order: 7,
        columns: 2,
      },
    ],
    fields: [
      ...base.fields.map((field): CRMFieldConfig => {
        if (field.key === "displayName") {
          return {
            ...field,
            label: "Tutor",
            tableOrder: 1,
          };
        }

        if (field.key === "customerType") {
          return {
            ...field,
            defaultValue: "Persona",
            showInForm: false,
            showInTable: false,
            showInDetail: false,
            showInFilters: false,
          };
        }

        if (field.key === "status") {
          return {
            ...field,
            tableOrder: 3,
          };
        }

        if (field.key === "name") {
          return {
            ...field,
            label: "Nombre",
            placeholder: "Nombre del tutor",
            description: "",
            formRow: 1 as const,
            formColumn: 1 as const,
          };
        }

        if (field.key === "lastName") {
          return {
            ...field,
            formRow: 1 as const,
            formColumn: 2 as const,
          };
        }

        if (hiddenFields.has(field.key)) {
          return {
            ...field,
            showInForm: false,
            showInTable: false,
            showInDetail: false,
            showInFilters: false,
          };
        }

        return field;
      }),
      {
        key: "petNames",
        label: "Mascotas",
        type: "text",
        readOnly: true,
        defaultValue:
          "Guarda primero al tutor. Después ve a Mascotas > Expedientes, registra la mascota y selecciónalo como tutor responsable.",
        showInForm: true,
        showInTable: true,
        showInDetail: true,
        showInFilters: false,
        formSectionId: "related-pets",
        tableOrder: 2,
        detailOrder: 2,
        tableWidth: "240px",
      },
      {
        key: "petCount",
        label: "Número de mascotas",
        type: "number",
        readOnly: true,
        showInForm: false,
        showInTable: false,
        showInDetail: true,
        showInFilters: false,
        formSectionId: "related-pets",
        detailOrder: 3,
      },
    ],
  };
}
