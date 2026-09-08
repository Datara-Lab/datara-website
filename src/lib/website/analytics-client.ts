"use client";

import { classifyWebsiteSource, isTrackedWebsitePath, type WebsiteAnalyticsContext, type WebsiteEventName, type WebsiteSource } from "./analytics";

export const consentKey = "datara.website.analytics.consent.v1";
const sessionKey = "datara.website.analytics.session.v1";
const consentEvent = "datara:website-analytics-consent";
type Consent = "accepted" | "rejected" | null;
let memoryConsent: Consent = null;
let lastPageMarker: string | null = null;
let memorySession: { id: string; source: WebsiteSource; lastSeen: number; pageMarker?: string } | null = null;

export function browserDeclinesAnalytics() {
  return typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
}
export function readWebsiteConsent(): Consent {
  if (typeof window === "undefined") return null;
  if (browserDeclinesAnalytics()) return "rejected";
  try {
    const value = localStorage.getItem(consentKey);
    return value === "accepted" || value === "rejected" ? value : memoryConsent;
  } catch { return memoryConsent; }
}
export function setWebsiteConsent(value: Exclude<Consent, null>) {
  memoryConsent = value;
  try { localStorage.setItem(consentKey, value); } catch { /* In-memory preference when storage is unavailable. */ }
  if (value === "rejected") {
    memorySession = null;
    lastPageMarker = null;
    try { sessionStorage.removeItem(sessionKey); } catch { /* No stored session. */ }
  }
  window.dispatchEvent(new Event(consentEvent));
}
export function subscribeWebsiteConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(consentEvent, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(consentEvent, callback); };
}

export function getWebsiteAnalyticsContext(): WebsiteAnalyticsContext | null {
  if (typeof window === "undefined" || readWebsiteConsent() !== "accepted" || !isTrackedWebsitePath(location.pathname)) return null;
  const now = Date.now();
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) memorySession = JSON.parse(stored);
  } catch { memorySession = null; }
  if (!memorySession || typeof memorySession.id !== "string" || !Number.isFinite(memorySession.lastSeen) || now - memorySession.lastSeen > 30 * 60 * 1000) {
    memorySession = { id: crypto.randomUUID(), lastSeen: now, source: classifyWebsiteSource(document.referrer, new URLSearchParams(location.search).get("utm_source"), location.hostname) };
  }
  memorySession.lastSeen = now;
  try { sessionStorage.setItem(sessionKey, JSON.stringify(memorySession)); } catch { /* Anonymous in-memory session. */ }
  return {
    sessionId: memorySession.id, source: memorySession.source, path: location.pathname, consent: true,
    device: innerWidth < 768 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop",
  };
}

export function trackWebsiteEvent(name: Exclude<WebsiteEventName, "form_submit">, target: string | null = null) {
  const context = getWebsiteAnalyticsContext();
  if (!context) return;
  const body = JSON.stringify({ ...context, id: crypto.randomUUID(), name, target });
  // Same-origin, small payload; analytics failures must never interrupt navigation or forms.
  try {
    if (navigator.sendBeacon?.("/api/public/website-events", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/public/website-events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* Best-effort measurement. */ }
}

// Module-scoped guard survives React strict-mode remounts and hydration changes.
// A document reload gets a new timeOrigin; SPA navigation updates the last path.
export function trackWebsitePageView() {
  if (!getWebsiteAnalyticsContext()) return;
  const marker = `${performance.timeOrigin}:${location.pathname}`;
  if (lastPageMarker === marker || memorySession?.pageMarker === marker) return;
  lastPageMarker = marker;
  if (memorySession) {
    memorySession.pageMarker = marker;
    try { sessionStorage.setItem(sessionKey, JSON.stringify(memorySession)); } catch { /* In-memory deduplication. */ }
  }
  trackWebsiteEvent("page_view");
}
