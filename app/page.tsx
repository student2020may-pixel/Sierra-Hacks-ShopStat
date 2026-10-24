import Footer from "@/components/landing/Footer";
import Gallery from "@/components/landing/Gallery";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import WhoItsFor from "@/components/landing/WhoItsFor";

export default function Home() {
  return (
    <main className="bg-night text-bone">
      <Hero />
      <Problem />
      <Gallery />
      <WhoItsFor />
      <Footer />
    </main>
  );
}
