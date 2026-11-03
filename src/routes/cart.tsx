import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Minus, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmLocalPayment, submitLocalOrder } from "@/lib/checkout.functions";
import { PAYMENT_METHODS, paymentMethodLabel, type PaymentMethodId } from "@/lib/payments";
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
  const [method, setMethod] = useState<PaymentMethodId>("wave");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submitOrder = useServerFn(submitLocalOrder);
  const confirmPayment = useServerFn(confirmLocalPayment);
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!address.trim()) return toast.error("Veuillez renseigner une adresse de livraison");
    setBusy(true);
    try {
      const order = await submitOrder({ data: { items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })), shipping: `${address.trim()}, ${city}` } });
      await confirmPayment({ data: { orderId: order.orderId, method, reference: `DEMO-${crypto.randomUUID()}` } });
      clearCart();
      toast.success(`Paiement confirmé via ${paymentMethodLabel(method)}`);
      await navigate({ to: "/orders" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer la commande.");
    } finally { setBusy(false); }
    return undefined;
  };

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
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`Adresse de livraison à ${city}`} />
            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-semibold"><Smartphone className="size-4 text-primary" />Moyen de paiement mobile</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Moyen de paiement mobile">
                {PAYMENT_METHODS.map((m) => {
                  const selected = method === m.id;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={selected} onClick={() => setMethod(m.id)}
                      className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selected ? "border-primary bg-secondary font-semibold" : "bg-card hover:bg-secondary/60"}`}>
                      <span className="min-w-0 break-words">{m.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{m.region}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="text-lg">Total <strong>{fmt(total)}</strong></span>
              <Button variant="accent" size="lg" className="w-full whitespace-normal sm:w-auto" disabled={busy} onClick={checkout}>{busy ? "Paiement en cours…" : user ? `Payer avec ${paymentMethodLabel(method)}` : "Se connecter pour commander"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">Paiement mobile money simulé pour la démonstration : aucun montant réel n’est débité.</p>
          </div>
        </>
      )}
    </div>
  );
}
