import { serviceCatalogItems } from "../schema";
import { parseServiceCatalogValues } from "../../lib/commercial/service-catalog-validation";

const products = [
  {
    itemKey: "landing-page", name: "Landing Page", oneTimePrice: "4990.00", monthlyPrice: "390.00", icon: "layout",
    shortDescription: "Ideal para campañas, promociones, nuevos servicios y presencia digital rápida.",
    features: ["Diseño profesional", "Adaptable a celular", "Formulario de contacto", "WhatsApp", "Redes sociales", "SEO básico", "Analítica"],
  },
  {
    itemKey: "sitio-empresarial", name: "Sitio Empresarial", oneTimePrice: "8990.00", monthlyPrice: "590.00", icon: "building",
    shortDescription: "Una presencia digital profesional para presentar tu empresa, servicios y generar prospectos.",
    features: ["Inicio", "Nosotros", "Servicios", "Contacto", "Formularios", "Testimonios o galería", "SEO básico", "Analítica"],
    recommended: true, badge: "Más popular",
  },
  {
    itemKey: "catalogo-digital", name: "Catálogo Digital", oneTimePrice: "12990.00", monthlyPrice: "790.00", icon: "catalog",
    shortDescription: "Muestra tus productos o servicios en un catálogo profesional y administrable.",
    features: ["Sitio empresarial", "Catálogo", "Categorías", "Fichas de productos", "Búsqueda y filtros", "Solicitud de cotización", "WhatsApp", "Analítica"],
  },
  {
    itemKey: "sitio-con-reservas", name: "Sitio con Reservas", oneTimePrice: "15990.00", monthlyPrice: "990.00", icon: "calendar",
    shortDescription: "Permite que tus clientes consulten servicios y reserven directamente desde tu sitio.",
    features: ["Sitio empresarial", "Servicios", "Profesionales", "Disponibilidad", "Reservaciones", "Confirmaciones", "Preparado para integración con Agenda Datara"],
  },
  {
    itemKey: "tienda-en-linea", name: "Tienda en Línea", oneTimePrice: "19990.00", monthlyPrice: "1290.00", icon: "shopping-bag",
    shortDescription: "Vende tus productos directamente desde tu propia tienda en línea.",
    features: ["Catálogo", "Carrito", "Checkout", "Pagos", "Pedidos", "Clientes", "Correos de confirmación", "Preparado para integraciones Datara"],
  },
  {
    itemKey: "desarrollo-a-medida", name: "Desarrollo a medida", oneTimePrice: null, monthlyPrice: null, icon: "code",
    shortDescription: "Creamos portales, plataformas e integraciones adaptadas a los procesos de tu empresa.",
    features: ["Desarrollo personalizado", "Integraciones", "Portales privados", "Automatizaciones", "Bases de datos", "APIs", "Soluciones empresariales"],
    requiresQuote: true,
  },
];

export const websiteCatalogSeed = products.map((product, index) => parseServiceCatalogValues({
  category: "website", description: null, pricePrefix: "Desde", monthlyLabel: "/ mes", currency: "mxn",
  recommended: false, badge: null, requiresQuote: false, ctaLabel: "Solicitar cotización",
  active: true, sortOrder: (index + 1) * 10, ...product,
}));

export async function seedServiceCatalog(db: typeof import("../index").db) {
  // Existing records are deliberately preserved, including edits and inactive products.
  return db.insert(serviceCatalogItems).values(websiteCatalogSeed).onConflictDoNothing({
    target: [serviceCatalogItems.category, serviceCatalogItems.itemKey],
  }).returning({ id: serviceCatalogItems.id });
}
