import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useStore } from "@/lib/store";
import { paymentMethodLabel } from "@/lib/payments";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },{ title: "Mes commandes — Allô Marché Global" }, { property: "og:title", content: "Mes commandes — Allô Marché Global" }, { property: "og:description", content: "Retrouvez vos commandes locales et leur historique." }, { name: "description", content: "Retrouvez vos commandes locales et leur historique." }] }),
  component: Orders,
});

type Order = { id: string; total_amount: number; payment_status: string; payment_provider: string | null; shipping_address: string | null; created_at: string; items: { title: string; quantity: number }[] };

function Orders() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("client_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as unknown as Order[]) ?? []));
  }, [user]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <h1 className="font-sans text-2xl font-bold md:text-4xl">Mes commandes</h1>
      <div className="mt-8 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border bg-card p-4 sm:p-5">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
              <Badge className="whitespace-normal">{o.payment_status === "paid" ? `Payée · ${paymentMethodLabel(o.payment_provider)}` : o.payment_status === "pending" ? "En attente de paiement" : o.payment_status}</Badge>
            </div>
            <p className="mt-2 break-words">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm"><span className="min-w-0 break-words text-muted-foreground">{o.shipping_address}</span><strong className="shrink-0">{fmt(Number(o.total_amount))}</strong></div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-muted-foreground">Vous n’avez pas encore de commande.</p>}
      </div>
    </div>
  );
}
