import Hero from "../components/Hero";
import FeaturedDecks from "../components/FeaturedDecks";
import HomeVideoSection from "../components/HomeVideoSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <FeaturedDecks />
      <HomeVideoSection />
    </main>
  );
}
