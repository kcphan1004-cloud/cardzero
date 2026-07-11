import Hero from "../components/Hero";
import FeatureSection from "../components/FeatureSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <FeatureSection />
    </main>
  );
}