import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type Product } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import { matchesCity } from "@/lib/marketplace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProductCatalog() {
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
      <section className="mx-auto min-w-0 max-w-7xl px-4 py-6 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-sans text-2xl font-bold">Catalogue</h2>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" className="pl-9" />
          </div>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-3">
          <ToggleGroup type="single" value={source} onValueChange={(v) => { if (v) { setSource(v); setCat("Tout"); } }} variant="outline" size="sm" className="grid w-full grid-cols-3 sm:w-fit">
            <ToggleGroupItem value="all">Tout</ToggleGroupItem>
            <ToggleGroupItem value="local">Local · {city}</ToggleGroupItem>
            <ToggleGroupItem value="amazon">Amazon</ToggleGroupItem>
          </ToggleGroup>
          <div className="sm:hidden"><Select value={activeCat} onValueChange={setCat}><SelectTrigger aria-label="Catégorie de produits" className="bg-card"><span className="text-muted-foreground">Catégorie</span><SelectValue /></SelectTrigger><SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="hidden gap-2 sm:flex sm:flex-wrap">
            {cats.map((c) => (
              <Button key={c} onClick={() => setCat(c)} size="sm" variant={activeCat === c ? "default" : "outline"}>{c}</Button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {visible.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {loading ? <p className="py-12 text-center text-muted-foreground">Chargement des produits…</p> : failed ? <div className="py-12 text-center"><p className="text-destructive">Le catalogue est indisponible.</p><Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Réessayer</Button></div> : visible.length === 0 && <div className="py-12 text-center"><p className="text-muted-foreground">Aucun article trouvé à {city} pour cette sélection.</p><Button variant="outline" className="mt-3" onClick={() => { setQ(""); setCat("Tout"); setSource("all"); }}>Afficher tous les articles</Button></div>}
      </section>
  );
}
