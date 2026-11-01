import { createFileRoute } from "@tanstack/react-router";
import { Globe, Store, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import hero from "@/assets/hero-market.jpg";
import { ProductCatalog } from "@/components/ProductCatalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Allô Marché Global — Boutiques locales et sélection Amazon" },
      { name: "description", content: "Découvrez les boutiques de Paris, Boston et Lomé et notre sélection Amazon." },
      { property: "og:title", content: "Allô Marché Global" },
      { property: "og:description", content: "Boutiques locales et sélection Amazon réunies dans un même marché." },
    ],
  }),
  component: Index,
});

function Index() {
  const { city } = useStore();
  return (
    <div>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Étal de marché avec épices, tissus et fleurs" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto max-w-7xl px-4 py-7 md:py-14">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">Livraison à {city}</p>
          <h1 className="max-w-2xl text-3xl font-semibold text-primary-foreground md:text-6xl">Allô Marché <em className="text-accent">Global</em></h1>
          <p className="mt-4 max-w-xl text-primary-foreground/80">Les boutiques de votre ville et une sélection Amazon, réunies dans votre marché.</p>
          <div className="mt-5 hidden max-w-2xl gap-3 md:grid md:grid-cols-3">
            {[{ i: Truck, t: "Sélection internationale" }, { i: Globe, t: "Sélection Amazon" }, { i: Store, t: "Boutiques locales" }].map(({ i: I, t }) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-background/10 px-3 py-2 text-sm text-primary-foreground backdrop-blur"><I className="h-4 w-4 text-accent" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <ProductCatalog />
    </div>
  );
}
