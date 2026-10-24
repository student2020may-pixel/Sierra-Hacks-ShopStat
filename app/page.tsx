import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HiddenReportCard from "@/components/landing/HiddenReportCard";
import HowItWorks from "@/components/landing/HowItWorks";
import Problem from "@/components/landing/Problem";
import WhoItsFor from "@/components/landing/WhoItsFor";

export default function Home() {
  return (
    <main>
      <Hero />
      <Problem />
      <HiddenReportCard />
      <HowItWorks />
      <WhoItsFor />
      <Footer />
    </main>
  );
}
