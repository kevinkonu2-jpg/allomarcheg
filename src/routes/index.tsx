import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Globe, Search, Store, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import hero from "@/assets/hero-market.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Allô Marché Global — Local shops & global picks" },
      { name: "description", content: "Shop local city stores in Paris, Boston and Lomé, plus curated Amazon products shipped worldwide." },
      { property: "og:title", content: "Allô Marché Global" },
      { property: "og:description", content: "Local city shops and curated global products in one marketplace." },
    ],
  }),
  component: Index,
});

function Index() {
  const { city } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [source, setSource] = useState("all");

  useEffect(() => {
    supabase.from("products").select("*, shops(shop_name)").order("created_at").then(({ data }) => setProducts((data as Product[]) ?? []));
  }, []);

  const visible = useMemo(() => products.filter((p) => {
    if (!p.is_amazon_affiliate && p.city_target !== city) return false;
    if (source === "local" && p.is_amazon_affiliate) return false;
    if (source === "amazon" && !p.is_amazon_affiliate) return false;
    if (cat !== "All" && p.category !== cat) return false;
    return !q || (p.title + " " + (p.description ?? "")).toLowerCase().includes(q.toLowerCase());
  }), [products, city, q, cat, source]);
  const cats = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Open-air market stall with spices, fabrics and flowers" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">Delivering to {city}</p>
          <h1 className="max-w-2xl text-4xl font-semibold text-primary-foreground md:text-6xl">The world's market, <em className="text-accent">around the corner.</em></h1>
          <p className="mt-4 max-w-xl text-primary-foreground/80">Local shops from your city, hand-picked Amazon finds and global shipping — in one basket.</p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[{ i: Truck, t: "Global shipping" }, { i: Globe, t: "Curated Amazon picks" }, { i: Store, t: "Local city shops" }].map(({ i: I, t }) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-background/10 px-3 py-2 text-sm text-primary-foreground backdrop-blur"><I className="h-4 w-4 text-accent" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl">Catalog</h2>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={source} onValueChange={(v) => v && setSource(v)} variant="outline" size="sm">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="local">Local · {city}</ToggleGroupItem>
            <ToggleGroupItem value="amazon">Amazon</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-sm transition-colors ${cat === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {visible.length === 0 && <p className="py-16 text-center text-muted-foreground">No products match your filters.</p>}
      </section>
    </div>
  );
}
