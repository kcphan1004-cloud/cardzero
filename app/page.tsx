// CardZero homepage sections
import Hero from "../components/Hero";
import FeatureSection from "../components/FeatureSection";
import FeaturedDecks from "../components/FeaturedDecks";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <FeatureSection />
      <FeaturedDecks />
    </main>
  );
}