import { normalizeScannedCode } from "../src/lib/qr/runtime";

const token = "123e4567-e89b-42d3-a456-426614174000";
const cases = [
  [`DT${"A".repeat(18)}\r\n`, { displayCode: `DT${"A".repeat(18)}` }],
  [`]C1DT${"B".repeat(18)}\r`, { displayCode: `DT${"B".repeat(18)}` }],
  [`https://demo.datara-lab.com/q/${token}\n`, { publicToken: token }],
  [`]Q3https://demo.datara-lab.com/q/${token}\r`, { publicToken: token }],
] as const;

for (const [input, expected] of cases) {
  const result = normalizeScannedCode(input);
  if ("displayCode" in expected && result.displayCode !== expected.displayCode) {
    throw new Error(`No se normalizó el Código 128: ${JSON.stringify(input)}`);
  }
  if ("publicToken" in expected && result.publicToken !== expected.publicToken) {
    throw new Error(`No se normalizó el QR: ${JSON.stringify(input)}`);
  }
}

console.log("DATARA_QR_SCANNER_NORMALIZATION_VERIFIED=1");
