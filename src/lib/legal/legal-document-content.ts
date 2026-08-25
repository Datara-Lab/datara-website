import cookies from "@/content/legal/cookies.json";
import dpa from "@/content/legal/dpa.json";
import privacy from "@/content/legal/privacy.json";
import retention from "@/content/legal/retention.json";
import saasContract from "@/content/legal/saas-contract.json";
import terms from "@/content/legal/terms.json";

import type {
  LegalDocumentKey,
} from "@/lib/legal/legal-documents";

export type LegalTextBlock = {
  type:
    | "title"
    | "heading"
    | "paragraph"
    | "list-item";
  text: string;
  level?: number;
};

export type LegalTableBlock = {
  type: "table";
  rows: string[][];
};

export type LegalContentBlock =
  | LegalTextBlock
  | LegalTableBlock;

export type LegalDocumentContent = {
  key: LegalDocumentKey;
  title: string;
  sourceFile: string;
  version: string;
  effectiveDate: string;
  blocks: LegalContentBlock[];
};

export const legalDocumentContent:
  Record<
    LegalDocumentKey,
    LegalDocumentContent
  > = {
    "saas-contract":
      saasContract as LegalDocumentContent,

    terms:
      terms as LegalDocumentContent,

    privacy:
      privacy as LegalDocumentContent,

    dpa:
      dpa as LegalDocumentContent,

    retention:
      retention as LegalDocumentContent,

    cookies:
      cookies as LegalDocumentContent,
  };
