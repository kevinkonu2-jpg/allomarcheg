import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
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
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!address.trim()) return toast.error("Veuillez renseigner une adresse de livraison");
    setBusy(true);
    const { error } = await supabase.rpc("place_order", {
      _items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, title: i.title, price: i.price })),
      _shipping: `${address}, ${city}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    clearCart();
    toast.success("Commande enregistrée !");
    navigate({ to: "/orders" });
    return undefined;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">Votre panier</h1>
      <p className="text-sm text-muted-foreground">Livraison à {city}</p>
      {cart.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Votre panier is empty. <Link to="/" className="text-primary underline">Découvrir le catalogue</Link></p>
      ) : (
        <>
          <ul className="mt-8 divide-y rounded-xl border bg-card">
            {cart.map((i) => (
              <li key={i.product_id} className="flex items-center gap-4 p-4">
                {i.image_url && <img src={i.image_url} alt={i.title} className="h-16 w-16 rounded-md object-cover" />}
                <div className="flex-1"><p className="font-medium">{i.title}</p><p className="text-sm text-muted-foreground">{fmt(i.price)}</p></div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => updateQty(i.product_id, i.quantity - 1)} aria-label="Diminuer la quantité"><Minus /></Button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => updateQty(i.product_id, i.quantity + 1)} aria-label="Augmenter la quantité"><Plus /></Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-3">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`Adresse de livraison à ${city}`} />
            <div className="flex items-center justify-between">
              <span className="text-lg">Total <strong>{fmt(total)}</strong></span>
              <Button variant="accent" size="lg" disabled={busy} onClick={checkout}>{user ? "Valider la commande" : "Se connecter pour commander"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">Commande de démonstration : aucun paiement réel ne sera débité.</p>
          </div>
        </>
      )}
    </div>
  );
}
