import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, useStore } from "@/lib/store";

export type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_amazon_affiliate: boolean;
  affiliate_link: string | null;
  city_target: string | null;
  shops?: { shop_name: string } | null;
};

export function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useStore();
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        <Badge className="absolute left-3 top-3" variant={p.is_amazon_affiliate ? "default" : "secondary"}>
          {p.is_amazon_affiliate ? "Amazon pick" : p.city_target}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.category}{p.shops ? ` · ${p.shops.shop_name}` : ""}</p>
        <h3 className="font-display text-lg leading-tight">{p.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-semibold">{fmt(Number(p.price))}</span>
          {p.is_amazon_affiliate ? (
            <Button variant="amazon" size="sm" asChild>
              <a href={p.affiliate_link ?? "#"} target="_blank" rel="noopener noreferrer sponsored">Buy on Amazon <ExternalLink /></a>
            </Button>
          ) : (
            <Button size="sm" onClick={() => {
              const ok = addToCart({ product_id: p.id, title: p.title, price: Number(p.price), image_url: p.image_url, city: p.city_target ?? "" });
              ok ? toast.success("Added to cart") : toast.error(`Only deliverable in ${p.city_target}`);
            }}><Plus /> Add</Button>
          )}
        </div>
      </div>
    </article>
  );
}
