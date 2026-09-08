import { ImageResponse } from "next/og";

export const alt = "Datara Lab — Todo tu negocio conectado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "72px", background: "linear-gradient(125deg, #0f172a, #155eef 65%, #18b8a9)", color: "white" }}>
    <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>DATARA LAB</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", fontSize: 66, lineHeight: 1.1, maxWidth: 920, fontWeight: 700 }}>Todo tu negocio conectado.</div>
      <div style={{ display: "flex", fontSize: 32 }}>Cada decisión, más clara.</div>
    </div>
    <div style={{ display: "flex", fontSize: 24 }}>CRM · Cloud · Analytics · Sitios Web</div>
  </div>, size);
}
