import { promotionsModule } from "@/config/crm/modules/promotions";
import { petPromotionBenefits } from "@/lib/crm/pet-commercial-policy";
import type { CRMModuleConfig } from "@/types/crm-config";

export function createPetPromotionsModule(): CRMModuleConfig {
  return {
    ...promotionsModule,
    description: "Promociones para servicios, productos y paquetes de mascotas.",
    searchFields: promotionsModule.searchFields?.filter(key => key !== "paymentMethod"),
    fields: promotionsModule.fields.map(field => {
      if (["availableMonths", "minimumDownPayment", "paymentMethod"].includes(field.key)) return {
        ...field, required: false, showInForm: false, showInTable: false, showInFilters: false,
        description: "Campo comercial heredado; no se utiliza para nuevas promociones Pets.",
      };
      if (field.key === "benefitType") return {...field, options:petPromotionBenefits.map(value=>({value,label:value}))};
      if (field.key === "promotionGroup") return {...field, options:["Condición comercial","Servicio","Regalo","Otro"].map(value=>({value,label:value}))};
      if (field.key === "customerType") return {...field,label:"Tipo de tutor",description:"Aplicar a todos los tutores, nuevos o recurrentes."};
      if (field.key === "applicableProducts") return {...field,label:"Servicios, productos o paquetes",description:"Selecciona los elementos del catálogo a los que aplica la promoción."};
      return {...field};
    }),
  };
}
