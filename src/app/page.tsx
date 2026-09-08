import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Products from "@/components/Products";

import { websiteMetadata, websiteUrl } from "@/lib/website/seo";

export const metadata = websiteMetadata("/");

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@graph": [
            { "@type": "Organization", "@id": `${websiteUrl}/#organization`, name: "Datara Lab", url: websiteUrl, logo: `${websiteUrl}/logos/lab-icon.png` },
            { "@type": "WebSite", "@id": `${websiteUrl}/#website`, name: "Datara Lab", url: websiteUrl, inLanguage: "es-MX", publisher: { "@id": `${websiteUrl}/#organization` } },
          ],
        }).replace(/</g, "\u003c") }} />
        <Hero />
        <Products />
        <CTA />
      </main>

      <Footer />
    </>
  );
}