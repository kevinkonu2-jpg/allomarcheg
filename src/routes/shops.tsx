import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { ProductCard, type Product } from "@/components/ProductCard";

export const Route = createFileRoute("/shops")({
  head: () => ({
    meta: [
      { title: "Local shops — Allô Marché Global" },
      { name: "description", content: "Browse independent shops in your delivery city." },
      { property: "og:title", content: "Local shops — Allô Marché Global" },
      { property: "og:description", content: "Independent city shops delivering locally." },
    ],
  }),
  component: Shops,
});

type Shop = { id: string; shop_name: string; city: string; description: string | null; products: Product[] };

function Shops() {
  const { city } = useStore();
  const [shops, setShops] = useState<Shop[]>([]);
  useEffect(() => {
    supabase.from("shops").select("*, products(*)").eq("city", city).eq("shop_status", "active")
      .then(({ data }) => setShops((data as unknown as Shop[]) ?? []));
  }, [city]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> Showing shops that deliver in {city}</p>
      <h1 className="mt-1 text-4xl">Local shops</h1>
      <div className="mt-10 space-y-14">
        {shops.map((s) => (
          <section key={s.id}>
            <h2 className="text-2xl">{s.shop_name}</h2>
            <p className="text-muted-foreground">{s.description}</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {s.products.map((p) => <ProductCard key={p.id} p={{ ...p, shops: { shop_name: s.shop_name } }} />)}
            </div>
          </section>
        ))}
        {shops.length === 0 && <p className="text-muted-foreground">No shops in {city} yet.</p>}
      </div>
    </div>
  );
}
