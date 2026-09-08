import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceCatalog from "@/components/commercial/ServiceCatalog";
import { getPublicServiceCatalog } from "@/lib/commercial/service-catalog-store";
import type { PublicServiceCatalogItem } from "@/lib/commercial/service-catalog";

export const dynamic = "force-dynamic";
import { websiteMetadata } from "@/lib/website/seo";
export const metadata = websiteMetadata("/sitios-web");

export default async function WebsitesPage() {
  let items: PublicServiceCatalogItem[] = [];
  let unavailable = false;
  try { items = await getPublicServiceCatalog("website"); }
  catch (error) { console.error("No fue posible cargar Sitios Web.", error); unavailable = true; }
  return <>
    <Navbar />
    <main>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold text-blue-600">Sitios Web</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Tu negocio merece algo más que una página web</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Diseñamos sitios profesionales preparados para atraer clientes, vender y conectarse con tu negocio.</p>
      </section>
      <ServiceCatalog items={items} categoryLabel="Sitios Web" unavailable={unavailable}>
    <section aria-labelledby="service-integrations-title" className="border-y border-slate-200/70 bg-white px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 id="service-integrations-title" className="text-2xl font-bold tracking-tight text-slate-950">Tu sitio conectado con tu negocio</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">Los sitios desarrollados por Datara pueden conectarse con CRM, agenda, inventario, ventas, automatizaciones y Analytics.</p>
        <ul className="mt-7 flex flex-wrap gap-3">
          {["Formulario → Prospecto", "Reserva → Agenda", "Compra → Venta", "Cliente → CRM", "Datos → Analytics"].map((example) => <li key={example} className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-medium text-blue-900">{example}</li>)}
        </ul>
      </div>
    </section>
      </ServiceCatalog>
    </main>
    <Footer />
  </>;
}
