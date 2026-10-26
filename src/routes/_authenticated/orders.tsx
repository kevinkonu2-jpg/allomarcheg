import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My orders — Allô Marché Global" }, { name: "description", content: "Your order history." }] }),
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
      <h1 className="text-4xl">My orders</h1>
      <div className="mt-8 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
              <Badge>{o.payment_status}</Badge>
            </div>
            <p className="mt-2">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}</p>
            <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{o.shipping_address}</span><strong>{fmt(Number(o.total_amount))}</strong></div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
