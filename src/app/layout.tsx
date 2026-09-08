import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import { AuthProvider } from "@/contexts/AuthContext";

import "./globals.css";
import WebsiteAnalytics from "@/components/WebsiteAnalytics";
import { websiteUrl } from "@/lib/website/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(websiteUrl),
  robots: { index: false, follow: false },
  title:
    "Datara Lab | Analytics, CRM & Cloud",
  description:
    "Construimos soluciones de Analytics, CRM y Cloud para empresas que quieren crecer mediante datos.",
  icons: {
    icon: "/logos/lab-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={[
        geistSans.variable,
        geistMono.variable,
      ].join(" ")}
    >
      <body className="antialiased">
        <ClerkProvider
          afterSignOutUrl="/login"
          signInFallbackRedirectUrl="/portal"
          signUpFallbackRedirectUrl="/portal"
        >
          <AuthProvider>
            {children}
            <WebsiteAnalytics />
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}