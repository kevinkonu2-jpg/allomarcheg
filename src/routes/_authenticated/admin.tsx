import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Package, ShoppingCart, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Allô Marché Global" }, { name: "description", content: "Admin back-office." }] }),
  component: Admin,
});

type Stats = { revenue: number; orders: number; vendors: number; affiliates: number };
type WalletT = { admin_id: string; share_percent: number; total_earned: number; available_balance: number; withdrawn_amount: number };

function Admin() {
  const { user, isAdmin } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallets, setWallets] = useState<WalletT[]>([]);
  const [orders, setOrders] = useState<{ id: string; total_amount: number; platform_commission: number; created_at: string; shipping_address: string | null }[]>([]);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    const [s, w, o] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.from("admin_wallets").select("*"),
      supabase.from("orders").select("id,total_amount,platform_commission,created_at,shipping_address").order("created_at", { ascending: false }).limit(10),
    ]);
    if (s.data) setStats(s.data as unknown as Stats);
    setWallets((w.data as WalletT[]) ?? []);
    setOrders(o.data ?? []);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (!isAdmin) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-3xl">Admins only</h1><p className="mt-2 text-muted-foreground">Your account doesn't have admin access.</p></div>;

  const mine = wallets.find((w) => w.admin_id === user?.id);
  const withdraw = async () => {
    const n = Number(amount);
    const { error } = await supabase.rpc("request_withdrawal", { _amount: n });
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal of ${fmt(n)} requested`);
    setAmount("");
    load();
    return undefined;
  };

  const cards = [
    { l: "Total revenue", v: fmt(Number(stats?.revenue ?? 0)), i: Banknote },
    { l: "Total orders", v: stats?.orders ?? 0, i: ShoppingCart },
    { l: "Active vendors", v: stats?.vendors ?? 0, i: Store },
    { l: "Affiliate products", v: stats?.affiliates ?? 0, i: Package },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl">Back-office</h1>
        <Button variant="outline" asChild><Link to="/">Make a test purchase</Link></Button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ l, v, i: I }) => (
          <div key={l} className="rounded-xl border bg-card p-5 shadow-card">
            <I className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{l}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-primary p-6 text-primary-foreground shadow-card">
          <p className="flex items-center gap-2 text-sm opacity-80"><Wallet className="h-4 w-4" /> My wallet · {mine?.share_percent ?? 0}% share</p>
          <p className="mt-3 font-display text-4xl">{fmt(Number(mine?.available_balance ?? 0))}</p>
          <p className="text-sm opacity-80">available</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div><p className="opacity-70">Total earned</p><p className="font-semibold">{fmt(Number(mine?.total_earned ?? 0))}</p></div>
            <div><p className="opacity-70">Withdrawn</p><p className="font-semibold">{fmt(Number(mine?.withdrawn_amount ?? 0))}</p></div>
          </div>
          <div className="mt-5 flex gap-2">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="bg-background text-foreground" />
            <Button variant="accent" onClick={withdraw} disabled={!amount}>Withdraw</Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h2 className="text-xl">Admin wallets</h2>
          <p className="text-sm text-muted-foreground">Each admin earns their share of the 10% platform commission.</p>
          <Table className="mt-3">
            <TableHeader><TableRow><TableHead>Admin</TableHead><TableHead>Share</TableHead><TableHead>Earned</TableHead><TableHead>Available</TableHead><TableHead>Withdrawn</TableHead></TableRow></TableHeader>
            <TableBody>
              {wallets.map((w) => (
                <TableRow key={w.admin_id}>
                  <TableCell>{w.admin_id === user?.id ? "You" : w.admin_id.slice(0, 8)}</TableCell>
                  <TableCell>{w.share_percent}%</TableCell>
                  <TableCell>{fmt(Number(w.total_earned))}</TableCell>
                  <TableCell>{fmt(Number(w.available_balance))}</TableCell>
                  <TableCell>{fmt(Number(w.withdrawn_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-10 rounded-xl border bg-card p-6">
        <h2 className="text-xl">Recent orders</h2>
        <Table className="mt-3">
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ship to</TableHead><TableHead>Total</TableHead><TableHead>Commission</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{o.shipping_address}</TableCell>
                <TableCell>{fmt(Number(o.total_amount))}</TableCell>
                <TableCell>{fmt(Number(o.platform_commission))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
