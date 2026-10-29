import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Package, ShoppingCart, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { validWithdrawal } from "@/lib/marketplace";
import { Label } from "@/components/ui/label";
import { fmt, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Espace admin — Allô Marché Global" }, { name: "description", content: "Ventes, commissions et portefeuilles administrateurs." }, { property: "og:title", content: "Espace admin — Allô Marché Global" }, { property: "og:description", content: "Ventes, commissions et portefeuilles administrateurs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Admin,
});

type Stats = { revenue: number; commissions: number; orders: number; vendors: number; affiliates: number };
type WalletT = { admin_id: string; share_percent: number; total_earned: number; available_balance: number; withdrawn_amount: number };

function Admin() {
  const { user, isAdmin } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallets, setWallets] = useState<WalletT[]>([]);
  const [orders, setOrders] = useState<{ id: string; total_amount: number; platform_commission: number; created_at: string; shipping_address: string | null }[]>([]);
  const [amount, setAmount] = useState("");

  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [share, setShare] = useState("0");
  const [withdrawals, setWithdrawals] = useState<{ id: string; amount: number; status: string; created_at: string }[]>([]);

  const load = useCallback(async () => {
    const [s, w, o, r] = await Promise.all([
      supabase.rpc("admin_stats"),
      supabase.from("admin_wallets").select("*"),
      supabase.from("orders").select("id,total_amount,platform_commission,created_at,shipping_address").order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawals").select("id,amount,status,created_at").order("created_at", { ascending: false }),
    ]);
    if (s.error || w.error || o.error || r.error) toast.error("Impossible de charger les données administrateur.");
    setWithdrawals(r.data ?? []);
    if (s.data) setStats(s.data as unknown as Stats);
    setWallets((w.data as WalletT[]) ?? []);
    setOrders(o.data ?? []);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (!isAdmin) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-3xl">Accès réservé aux administrateurs</h1><p className="mt-2 text-muted-foreground">Votre compte ne dispose pas des droits administrateur.</p></div>;

  const mine = wallets.find((w) => w.admin_id === user?.id);
  const withdraw = async () => {
    const n = Number(amount);
    if (!validWithdrawal(n, Number(mine?.available_balance ?? 0))) return toast.error("Saisissez un montant positif, à deux décimales, dans la limite du solde disponible.");
    setBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", { _amount: n });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Retrait de ${fmt(n)} demandé`);
    setAmount("");
    await load();
    return undefined;
  };

  const promote = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("grant_admin", { _email: adminEmail, _share: Number(share) });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Accès administrateur accordé");
    setAdminEmail("");
    await load();
    return undefined;
  };

  const cards = [
    { l: "Total des ventes", v: fmt(Number(stats?.revenue ?? 0)), i: Banknote },
    { l: "Total des commissions", v: fmt(Number(stats?.commissions ?? 0)), i: ShoppingCart },
    { l: "Vendeurs actifs", v: stats?.vendors ?? 0, i: Store },
    { l: "Produits Amazon", v: stats?.affiliates ?? 0, i: Package },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl">Espace admin</h1>
        <Button variant="outline" asChild><Link to="/">Passer une commande démo</Link></Button>
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
          <p className="flex items-center gap-2 text-sm opacity-80"><Wallet className="h-4 w-4" /> Mon portefeuille admin · {mine?.share_percent ?? 0}% de part</p>
          <p className="mt-3 font-display text-4xl">{fmt(Number(mine?.available_balance ?? 0))}</p>
          <p className="text-sm opacity-80">Solde disponible</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div><p className="opacity-70">Total cumulé</p><p className="font-semibold">{fmt(Number(mine?.total_earned ?? 0))}</p></div>
            <div><p className="opacity-70">Retraits demandés</p><p className="font-semibold">{fmt(Number(mine?.withdrawn_amount ?? 0))}</p></div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (€)" aria-label="Montant du retrait" className="bg-background text-foreground" />
            <Button variant="accent" onClick={withdraw} disabled={busy || !validWithdrawal(Number(amount), Number(mine?.available_balance ?? 0))}>Demander un retrait</Button>
          </div>
          <p className="mt-3 text-xs opacity-80">Fonds de démonstration · Les demandes ne déclenchent pas de virement bancaire.</p>
        </div>
        <div className="border-t pt-6 lg:col-span-2">
          <h2 className="text-xl">Portefeuilles administrateurs</h2>
          <p className="text-sm text-muted-foreground">La commission de 10 % est répartie selon les parts des administrateurs.</p>
          <Table className="mt-3">
            <TableHeader><TableRow><TableHead>Administrateur</TableHead><TableHead>Part</TableHead><TableHead>Total cumulé</TableHead><TableHead>Disponible</TableHead><TableHead>Retraits demandés</TableHead></TableRow></TableHeader>
            <TableBody>
              {wallets.map((w) => (
                <TableRow key={w.admin_id}>
                  <TableCell>{w.admin_id === user?.id ? "Vous" : w.admin_id.slice(0, 8)}</TableCell>
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

      <section className="mt-10 border-t pt-6">
        <h2 className="text-xl">Accorder un accès administrateur</h2>
        <form onSubmit={promote} className="mt-4 flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2"><Label htmlFor="admin-email">E-mail du compte existant</Label><Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></div>
          <div className="space-y-2 sm:w-32"><Label htmlFor="admin-share">Part (%)</Label><Input id="admin-share" type="number" min="0" max="100" step="0.01" value={share} onChange={(e) => setShare(e.target.value)} required /></div>
          <Button type="submit" disabled={busy}>Accorder l’accès</Button>
        </form>
      </section>
      <section className="mt-10 border-t pt-6">
        <h2 className="text-xl">Mes demandes de retrait</h2>
        <Table className="mt-3"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Montant</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{withdrawals.map((r) => <TableRow key={r.id}><TableCell>{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell><TableCell>{fmt(Number(r.amount))}</TableCell><TableCell>{r.status === "requested" ? "Demandé" : r.status === "paid" ? "Versé" : r.status === "rejected" ? "Refusé" : "En traitement"}</TableCell></TableRow>)}</TableBody></Table>
        {!withdrawals.length && <p className="mt-3 text-sm text-muted-foreground">Aucune demande de retrait.</p>}
      </section>
      <div className="mt-10 border-t pt-6">
        <h2 className="text-xl">Commandes récentes</h2>
        <Table className="mt-3">
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Adresse de livraison</TableHead><TableHead>Total</TableHead><TableHead>Commission</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
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
