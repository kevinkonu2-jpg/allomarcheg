import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },{ title: "Mes commandes — Allô Marché Global" }, { property: "og:title", content: "Mes commandes — Allô Marché Global" }, { property: "og:description", content: "Retrouvez vos commandes locales et leur historique." }, { name: "description", content: "Retrouvez vos commandes locales et leur historique." }] }),
  component: Orders,
});

type Order = { id: string; total_amount: number; payment_status: string; shipping_address: string | null; created_at: string; items: { title: string; quantity: number }[] };

function Orders() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("client_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as unknown as Order[]) ?? []));
  }, [user]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">Mes commandes</h1>
      <div className="mt-8 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</span>
              <Badge>{o.payment_status === "paid" ? "Payée" : o.payment_status === "pending" ? "En attente de paiement" : o.payment_status}</Badge>
            </div>
            <p className="mt-2">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</p>
            <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{o.shipping_address}</span><strong>{fmt(Number(o.total_amount))}</strong></div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-muted-foreground">Vous n’avez pas encore de commande.</p>}
      </div>
    </div>
  );
}
