import { buildCfdi40Xml } from "../src/lib/fiscal/cfdi40";

const xml = buildCfdi40Xml({
  idempotencyKey: "test:cfdi40:001",
  series: "A",
  folio: "1001",
  issuedAt: "2026-08-28T12:30:00-06:00",
  expeditionPostalCode: "06600",
  currency: "mxn",
  paymentMethod: "PUE",
  paymentForm: "03",
  issuer: {
    taxId: "EKU9003173C9",
    legalName: "ESCUELA KEMPER URGATE",
    taxRegime: "601",
    postalCode: "06600",
  },
  receiver: {
    taxId: "XAXX010101000",
    legalName: "PUBLICO EN GENERAL",
    taxRegime: "616",
    postalCode: "06600",
    cfdiUse: "S01",
  },
  concepts: [
    {
      internalId: "MOTO-001",
      productServiceCode: "25101801",
      unitCode: "H87",
      quantity: 1,
      description: "Motocicleta de prueba",
      unitAmount: 100000,
      discountAmount: 5000,
      taxObject: "02",
      transferredTaxes: [
        {
          tax: "002",
          factorType: "Tasa",
          rateOrFee: 0.16,
        },
      ],
    },
  ],
  metadata: {},
});

const expectedFragments = [
  'Version="4.0"',
  'Fecha="2026-08-28T12:30:00"',
  'SubTotal="100000.00"',
  'Descuento="5000.00"',
  'Total="110200.00"',
  'ClaveProdServ="25101801"',
  'ClaveUnidad="H87"',
  'Base="95000.00"',
  'TasaOCuota="0.160000"',
  'Importe="15200.00"',
];

for (const fragment of expectedFragments) {
  if (!xml.includes(fragment)) {
    throw new Error(`El XML no contiene ${fragment}.`);
  }
}

console.log(xml);
console.log("DATARA_CFDI40_GENERATOR_TEST_VALIDATED=1");
