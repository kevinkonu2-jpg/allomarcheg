import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Globe, Search, Store, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import hero from "@/assets/hero-market.jpg";
import { Button } from "@/components/ui/button";
import { matchesCity } from "@/lib/marketplace";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tout");
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*, shops(shop_name)").order("created_at").then(({ data, error }) => { setProducts((data as Product[]) ?? []); setFailed(!!error); setLoading(false); });
  }, []);

  const cats = ["Tout", ...Array.from(new Set(products.filter((p) => matchesCity(p, city) && (source === "all" || (source === "amazon" ? p.is_amazon_affiliate : !p.is_amazon_affiliate))).map((p) => p.category)))];
  const activeCat = cats.includes(cat) ? cat : "Tout";
  const visible = useMemo(() => products.filter((p) => {
    if (!matchesCity(p, city)) return false;
    if (source === "local" && p.is_amazon_affiliate) return false;
    if (source === "amazon" && !p.is_amazon_affiliate) return false;
    if (activeCat !== "Tout" && p.category !== activeCat) return false;
    return !q || (p.title + " " + (p.description ?? "")).toLowerCase().includes(q.toLowerCase());
  }), [products, city, q, activeCat, source]);
  useEffect(() => { setCat("Tout"); }, [city]);

  return (
    <div>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Étal de marché avec épices, tissus et fleurs" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-16">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">Livraison à {city}</p>
          <h1 className="max-w-2xl text-4xl font-semibold text-primary-foreground md:text-6xl">Allô Marché <em className="text-accent">Global</em></h1>
          <p className="mt-4 max-w-xl text-primary-foreground/80">Les boutiques de votre ville et une sélection Amazon, réunies dans votre marché.</p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[{ i: Truck, t: "Sélection internationale" }, { i: Globe, t: "Sélection Amazon" }, { i: Store, t: "Boutiques locales" }].map(({ i: I, t }) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-background/10 px-3 py-2 text-sm text-primary-foreground backdrop-blur"><I className="h-4 w-4 text-accent" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl">Catalogue</h2>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" className="pl-9" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={source} onValueChange={(v) => { if (v) { setSource(v); setCat("Tout"); } }} variant="outline" size="sm">
            <ToggleGroupItem value="all">Tout</ToggleGroupItem>
            <ToggleGroupItem value="local">Local · {city}</ToggleGroupItem>
            <ToggleGroupItem value="amazon">Amazon</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Button key={c} onClick={() => setCat(c)} size="sm" variant={activeCat === c ? "default" : "outline"}>{c}</Button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {loading ? <p className="py-12 text-center text-muted-foreground">Chargement des produits…</p> : failed ? <div className="py-12 text-center"><p className="text-destructive">Le catalogue est indisponible.</p><Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Réessayer</Button></div> : visible.length === 0 && <div className="py-12 text-center"><p className="text-muted-foreground">Aucun article trouvé à {city} pour cette sélection.</p><Button variant="outline" className="mt-3" onClick={() => { setQ(""); setCat("Tout"); setSource("all"); }}>Afficher tous les articles</Button></div>}
      </section>
    </div>
  );
}
