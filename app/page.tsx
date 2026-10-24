import Footer from "@/components/landing/Footer";
import Gallery from "@/components/landing/Gallery";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Marquee from "@/components/landing/Marquee";
import Problem from "@/components/landing/Problem";
import WhatWeGrade from "@/components/landing/WhatWeGrade";
import WhoItsFor from "@/components/landing/WhoItsFor";

export default function Home() {
  return (
    <main className="bg-night text-bone">
      <Hero />
      <Problem />
      <Marquee />
      <WhatWeGrade />
      <WhoItsFor />
      <Gallery />
      <HowItWorks />
      <Footer />
    </main>
  );
}
