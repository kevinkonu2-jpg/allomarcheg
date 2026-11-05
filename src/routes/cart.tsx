import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalCheckout } from "@/components/LocalCheckout";
import { fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Votre panier — Allô Marché Global" },
      { name: "description", content: "Retrouvez vos articles et validez votre commande locale." },
      { property: "og:title", content: "Votre panier — Allô Marché Global" },
      { property: "og:description", content: "Retrouvez vos articles et validez votre commande locale." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { cart, updateQty, clearCart, user, city } = useStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const navigate = useNavigate();
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <h1 className="font-sans text-2xl font-bold md:text-4xl">Votre panier</h1>
      <p className="text-sm text-muted-foreground">Livraison à {city}</p>
      {cart.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Votre panier est vide. <Link to="/" className="text-primary underline">Découvrir le catalogue</Link></p>
      ) : (
        <>
          <ul className="mt-6 divide-y border-y">
            {cart.map((i) => (
              <li key={i.product_id} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
                <div className="size-16 overflow-hidden rounded-md bg-muted">{i.image_url && <img src={i.image_url} alt={i.title} className="h-full w-full object-cover" />}</div>
                <div className="min-w-0"><p className="break-words font-medium">{i.title}</p><p className="text-sm text-muted-foreground">{fmt(i.price)}</p></div>
                <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                  <Button size="icon" variant="outline" onClick={() => updateQty(i.product_id, i.quantity - 1)} aria-label="Diminuer la quantité"><Minus /></Button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => updateQty(i.product_id, i.quantity + 1)} aria-label="Augmenter la quantité"><Plus /></Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-3">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="text-lg">Total <strong>{fmt(total)}</strong></span>
              <Button variant="accent" size="lg" className="w-full whitespace-normal sm:w-auto" onClick={() => { if (user) setCheckoutOpen(true); else void navigate({ to: "/auth" }); }}>{user ? "Passer la commande" : "Se connecter pour commander"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">Paiement mobile money simulé : aucun montant réel n’est débité.</p>
          </div>
        </>
      )}
      {checkoutOpen && <LocalCheckout open={checkoutOpen} onOpenChange={setCheckoutOpen} city={city} total={total} items={cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))} onCreated={clearCart} onPaid={() => { void navigate({ to: "/orders" }); }} />}
    </div>
  );
}
