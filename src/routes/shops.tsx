import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { ProductCard, type Product } from "@/components/ProductCard";

export const Route = createFileRoute("/shops")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Boutiques locales — Allô Marché Global" },
      { name: "description", content: "Découvrez les boutiques indépendantes de votre ville." },
      { property: "og:title", content: "Boutiques locales — Allô Marché Global" },
      { property: "og:description", content: "Les commerces de votre ville et leurs produits locaux." },
    ],
  }),
  component: Shops,
});

type Shop = { id: string; shop_name: string; city: string; description: string | null; products: Product[] };

function Shops() {
  const { city } = useStore();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from("shops").select("*, products(*)").eq("city", city).eq("shop_status", "active")
      .then(({ data, error }) => { if (active) { setShops((data as unknown as Shop[]) ?? []); setFailed(!!error); setLoading(false); } });
    return () => { active = false; };
  }, [city]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> Boutiques livrant à {city}</p>
      <h1 className="mt-1 text-4xl">Boutiques locales</h1>
      <div className="mt-10 space-y-14">
        {!loading && shops.map((s) => (
          <section key={s.id}>
            <h2 className="text-2xl">{s.shop_name}</h2>
            <p className="text-muted-foreground">{s.description}</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
               {s.products.filter((p) => !p.is_amazon_affiliate && p.city_target === city).map((p) => <ProductCard key={p.id} p={{ ...p, shops: { shop_name: s.shop_name } }} />)}
            </div>
          </section>
        ))}
        {loading ? <p className="text-muted-foreground">Chargement des boutiques…</p> : failed ? <p className="text-destructive">Les boutiques sont indisponibles. Veuillez réessayer.</p> : shops.length === 0 && <p className="text-muted-foreground">Aucune boutique à {city} pour le moment.</p>}
      </div>
    </div>
  );
}
