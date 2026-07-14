import CardCatalog from "../../components/CardCatalog";
import { cards } from "../../data/card-series-generated";

export default function CardPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <CardCatalog
          cards={cards}
        />
      </div>
    </main>
  );
}