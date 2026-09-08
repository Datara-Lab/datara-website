"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { isTrackedWebsitePath, type WebsiteEventName } from "@/lib/website/analytics";
import { browserDeclinesAnalytics, readWebsiteConsent, setWebsiteConsent, subscribeWebsiteConsent, trackWebsiteEvent, trackWebsitePageView } from "@/lib/website/analytics-client";

export default function WebsiteAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeWebsiteConsent, readWebsiteConsent, () => null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const lastClick = useRef(0);
  const active = isTrackedWebsitePath(pathname);
  const browserOptOut = consent === "rejected" && browserDeclinesAnalytics();

  useEffect(() => {
    if (!active || consent !== "accepted") return;
    trackWebsitePageView();
    function click(event: MouseEvent) {
      if (!(event.target instanceof Element) || Date.now() - lastClick.current < 700) return;
      const explicit = event.target.closest<HTMLElement>("[data-analytics-action]");
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      let name: Exclude<WebsiteEventName, "form_submit"> | null = null;
      let target: string | null = null;
      if (explicit?.dataset.analyticsAction === "quote_click") { name = "quote_click"; target = explicit.dataset.analyticsTarget ?? null; }
      else if (anchor) {
        const url = new URL(anchor.href, location.href);
        if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") name = "whatsapp_click";
        else if (url.origin === location.origin && url.hash === "#contacto") name = "contact_click";
        else if (url.origin === location.origin && ["/cloud", "/catalogo/crm", "/sitios-web"].includes(url.pathname)) name = "product_click";
      }
      if (name) { lastClick.current = Date.now(); trackWebsiteEvent(name, target); }
    }
    document.addEventListener("click", click, { capture: true });
    return () => document.removeEventListener("click", click, { capture: true });
  }, [active, consent, pathname]);

  if (!active) return null;
  const showChoices = consent === null || preferencesOpen;
  return <>
    {showChoices && <section aria-label="Preferencias de medición" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:bottom-6 sm:flex sm:items-center sm:gap-6">
      <div className="flex-1"><p className="text-sm font-semibold text-slate-950">¿Nos ayudas a mejorar Datara?</p>
        <p className="mt-1 text-sm leading-5 text-slate-600">Podemos medir visitas y clics sin guardar tu nombre, correo ni IP. Es opcional. <Link href="/legal/cookies" className="text-blue-700 underline">Cómo funciona</Link></p>
        {browserOptOut && <p className="mt-2 text-xs text-slate-500">La medición está desactivada por la preferencia de privacidad de tu navegador.</p>}
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        <Button type="button" size="sm" variant="secondary" onClick={() => { setWebsiteConsent("rejected"); setPreferencesOpen(false); }}>No aceptar</Button>
        <Button type="button" size="sm" disabled={browserOptOut} onClick={() => { setWebsiteConsent("accepted"); setPreferencesOpen(false); }}>Aceptar medición</Button>
      </div>
    </section>}
    <div className="border-t border-slate-100 bg-white px-5 py-3 text-center">
      <button type="button" className="text-xs text-slate-500 underline underline-offset-4" onClick={() => setPreferencesOpen(true)}>Preferencias de medición</button>
    </div>
  </>;
}
