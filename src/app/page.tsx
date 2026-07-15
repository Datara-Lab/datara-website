import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Products from "@/components/Products";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Products />
        <CTA />
      </main>

      <Footer />
    </>
  );
}