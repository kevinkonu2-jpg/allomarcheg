import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, useStore } from "@/lib/store";
import { productImage } from "@/lib/product-images";
import { safeAffiliateUrl } from "@/lib/marketplace";

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
  const affiliateUrl = safeAffiliateUrl(p.affiliate_link);
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-card">
      <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[4/3]">
        {p.image_url && <img src={productImage(p.image_url)} alt={p.title} loading="lazy" width={800} height={600} className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 sm:p-4">
        <Badge className="mb-1 w-fit whitespace-normal px-1.5 text-[9px] sm:text-[10px]" variant={p.is_amazon_affiliate ? "amazon" : "local"}>
          {p.is_amazon_affiliate ? "Partenaire Amazon" : `Boutique Locale · ${p.city_target}`}
        </Badge>
        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{p.category}{p.shops ? ` · ${p.shops.shop_name}` : ""}</p>
        <h3 className="min-h-10 break-words font-sans text-sm font-semibold leading-5 sm:text-base">{p.title}</h3>
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{p.description}</p>
        <div className="mt-auto flex flex-col gap-3 pt-4">
          <span className="font-semibold">{fmt(Number(p.price))}</span>
          {p.is_amazon_affiliate ? (
            affiliateUrl ? <Button variant="amazon" size="sm" asChild className="w-full gap-1 whitespace-normal px-1.5 text-[11px] leading-4 sm:text-xs">
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored"><span>Acheter sur Amazon</span><ExternalLink className="size-3" /></a>
            </Button> : <Button variant="amazon" size="sm" disabled className="whitespace-normal">Lien indisponible</Button>
          ) : (
            <Button variant="local" size="sm" className="w-full gap-1 whitespace-normal px-1.5 text-[11px] leading-4 sm:text-xs" onClick={() => {
              const ok = addToCart({ product_id: p.id, title: p.title, price: Number(p.price), image_url: productImage(p.image_url) ?? null, city: p.city_target ?? "" });
              ok ? toast.success("Article ajouté au panier") : toast.error(`Livraison uniquement à ${p.city_target}`);
            }}><Plus className="size-3" /><span>Ajouter au panier</span></Button>
          )}
        </div>
      </div>
    </article>
  );
}
