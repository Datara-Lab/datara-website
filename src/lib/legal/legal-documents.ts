export const legalBundleVersion =
  "1.0";

export const legalBundleEffectiveDate =
  "2026-08-15";

export type LegalDocumentKey =
  | "saas-contract"
  | "terms"
  | "privacy"
  | "dpa"
  | "retention"
  | "cookies";

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  effectiveDate: string;
  viewUrl: string;
  requiredAtCheckout: boolean;
};

export const legalDocuments:
  LegalDocument[] = [
    {
      key: "saas-contract",
      title:
        "Contrato de prestación de servicios SaaS",
      shortTitle:
        "Contrato SaaS",
      description:
        "Condiciones aplicables a la prestación, disponibilidad, contratación y uso de los productos Datara.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/saas-contract",
      requiredAtCheckout: true,
    },
    {
      key: "terms",
      title:
        "Términos y Condiciones",
      shortTitle:
        "Términos",
      description:
        "Reglas generales de acceso, uso, contratación, pagos, renovación y cancelación.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/terms",
      requiredAtCheckout: true,
    },
    {
      key: "privacy",
      title:
        "Aviso de Privacidad Integral",
      shortTitle:
        "Privacidad",
      description:
        "Identidad del responsable, datos tratados, finalidades y medios para ejercer derechos ARCO.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/privacy",
      requiredAtCheckout: true,
    },
    {
      key: "dpa",
      title:
        "Acuerdo de Tratamiento de Datos",
      shortTitle:
        "DPA",
      description:
        "Obligaciones aplicables cuando Datara procesa datos personales por cuenta de una organización.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/dpa",
      requiredAtCheckout: true,
    },
    {
      key: "retention",
      title:
        "Política de Conservación y Eliminación",
      shortTitle:
        "Conservación",
      description:
        "Criterios de conservación, bloqueo, eliminación, anonimización y respaldos.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/retention",
      requiredAtCheckout: false,
    },
    {
      key: "cookies",
      title:
        "Política de Cookies",
      shortTitle:
        "Cookies",
      description:
        "Uso de cookies necesarias y condiciones para activar tecnologías no esenciales.",
      version:
        legalBundleVersion,
      effectiveDate:
        legalBundleEffectiveDate,
      viewUrl:
        "/legal/cookies",
      requiredAtCheckout: false,
    },
  ];

export const checkoutLegalDocuments =
  legalDocuments.filter(
    (document) =>
      document.requiredAtCheckout,
  );
