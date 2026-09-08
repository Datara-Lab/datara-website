import { parseWebsiteEvent } from "@/lib/website/analytics";
import { getWebsiteTenant, saveWebsiteEvent } from "@/lib/website/analytics-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers });
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1" || /bot|crawler|spider/i.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415, headers });
  let event;
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400, headers });
    let bytes = 0;
    let body = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2048) { await reader.cancel(); return new Response(null, { status: 413, headers }); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    event = parseWebsiteEvent(JSON.parse(body));
  } catch { return new Response(null, { status: 400, headers }); }
  try {
    const tenant = await getWebsiteTenant();
    await saveWebsiteEvent(tenant.id, event);
    return new Response(null, { status: 204, headers });
  } catch {
    console.error("No fue posible registrar el evento de analítica web.");
    return new Response(null, { status: 503, headers });
  }
}
