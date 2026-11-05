import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deliverySchema, eligibleDeliveryCity, phoneSchema, TOGO_DELIVERY_CITIES } from "@/lib/checkout";
import { confirmLocalPayment, submitLocalOrder } from "@/lib/checkout.functions";
import { PAYMENT_METHODS, paymentMethodLabel, type PaymentMethodId } from "@/lib/payments";
import { fmt } from "@/lib/store";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; city: string; total: number; items?: { product_id: string; quantity: number }[]; pendingOrder?: { id: string; total: number }; onCreated?: () => void; onPaid: () => void };

export function LocalCheckout({ open, onOpenChange, city, total, items, pendingOrder, onCreated, onPaid }: Props) {
  const [step, setStep] = useState(pendingOrder ? 1 : 0);
  const [delivery, setDelivery] = useState({ fullName: "", city, address: "", phone: "" });
  const [method, setMethod] = useState<PaymentMethodId | null>(null);
  const [accountPhone, setAccountPhone] = useState("");
  const [order, setOrder] = useState(pendingOrder);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const create = useServerFn(submitLocalOrder);
  const pay = useServerFn(confirmLocalPayment);
  const cities = city === "Lomé" ? [...TOGO_DELIVERY_CITIES] : [city];
  const next = async () => {
    setError("");
    if (step === 0) {
      const parsed = deliverySchema.safeParse(delivery);
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Coordonnées invalides.");
      if (!eligibleDeliveryCity(city, delivery.city)) return setError("Ville non desservie.");
      setAccountPhone(parsed.data.phone); setStep(1);
    } else if (step === 1) {
      if (!method) return setError("Choisissez un opérateur.");
      setStep(2);
    } else if (step === 2) {
      const parsed = phoneSchema.safeParse(accountPhone);
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Numéro invalide.");
      if (locked.current) return;
      locked.current = true; setBusy(true);
      try {
        setAccountPhone(parsed.data);
        if (!order) {
          const result = await create({ data: { items: items ?? [], catalogCity: city, delivery } });
          setOrder({ id: result.orderId, total }); onCreated?.();
        }
        setStep(3);
      } catch (e) { setError(e instanceof Error ? e.message : "Impossible de créer la commande."); }
      finally { locked.current = false; setBusy(false); }
    }
    return undefined;
  };
  const confirm = async () => {
    if (!order || !method || locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      await pay({ data: { orderId: order.id, method, accountPhone, confirmed: true } });
      toast.success(`Paiement simulé confirmé · ${paymentMethodLabel(method)}`);
      onOpenChange(false); onPaid();
    } catch (e) { setError(e instanceof Error ? e.message : "La commande reste en attente."); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}><DialogContent onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }} className="max-w-lg min-w-0">
    <DialogHeader><DialogTitle>Commande locale</DialogTitle><DialogDescription>Étape {step + 1} sur 4 · {['Livraison', 'Opérateur', 'Compte mobile', 'Confirmation'][step]}</DialogDescription></DialogHeader>
    <ol aria-label="Progression" className="grid grid-cols-4 gap-2">{[0,1,2,3].map((s) => <li key={s} className={`h-1 rounded-sm ${s <= step ? 'bg-primary' : 'bg-muted'}`} />)}</ol>
    <p className="border-b pb-3 text-sm text-muted-foreground">Simulation uniquement · aucun débit ni retrait réel</p>
    <form onSubmit={(e) => { e.preventDefault(); if (step === 3) void confirm(); else void next(); }} className="min-w-0 space-y-4">
      {step === 0 && <>
        <div className="space-y-2"><Label htmlFor="delivery-name">Nom complet</Label><Input id="delivery-name" autoComplete="name" value={delivery.fullName} onChange={(e) => setDelivery({ ...delivery, fullName: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="delivery-city">Ville de livraison</Label><Select value={delivery.city} onValueChange={(v) => setDelivery({ ...delivery, city: v })}><SelectTrigger id="delivery-city"><SelectValue /></SelectTrigger><SelectContent>{cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="delivery-address">Quartier et adresse précise</Label><Input id="delivery-address" autoComplete="street-address" value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="delivery-phone">Téléphone de livraison</Label><Input id="delivery-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+228 90 00 00 00" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} /></div>
      </>}
      {step === 1 && <fieldset className="space-y-2"><legend className="mb-2 font-semibold">Votre opérateur</legend><div role="radiogroup" aria-label="Opérateur" className="grid gap-2 sm:grid-cols-2">{PAYMENT_METHODS.map((m) => <Button key={m.id} type="button" role="radio" aria-checked={method === m.id} variant="outline" className={`h-auto min-h-12 justify-between whitespace-normal text-left ${method === m.id ? 'border-primary bg-secondary' : ''}`} onClick={() => setMethod(m.id)}><span>{m.label}<span className="block text-xs font-normal text-muted-foreground">{m.region}</span></span>{method === m.id && <Check className="shrink-0" />}</Button>)}</div></fieldset>}
      {step === 2 && <div className="space-y-2"><Label htmlFor="account-phone">Numéro du compte {paymentMethodLabel(method)}</Label><Input id="account-phone" type="tel" inputMode="tel" value={accountPhone} onChange={(e) => setAccountPhone(e.target.value)} /><p className="text-xs text-muted-foreground">Le compte mobile money utilisé pour cette simulation.</p></div>}
      {step === 3 && <div className="space-y-4 py-2"><Smartphone className="mx-auto size-12 text-primary" /><h2 className="text-center text-xl font-semibold">Confirmez la transaction sur votre téléphone avec votre code secret</h2><p className="text-center text-sm text-muted-foreground">Aucun message USSD réel n’est envoyé. Ne saisissez jamais votre code secret ici.</p><dl className="divide-y border-y text-sm"><div className="flex justify-between gap-3 py-3"><dt>Opérateur</dt><dd>{paymentMethodLabel(method)}</dd></div><div className="flex justify-between gap-3 py-3"><dt>Compte</dt><dd>{accountPhone}</dd></div><div className="flex justify-between gap-3 py-3"><dt>Montant</dt><dd className="font-semibold">{fmt(order?.total ?? total)}</dd></div></dl></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-2"><Button type="button" size="icon" variant="outline" aria-label="Étape précédente" disabled={busy || step === 0 || (Boolean(order) && step <= 1)} onClick={() => { setError(''); setStep(step - 1); }}><ArrowLeft /></Button><Button type="submit" variant="accent" className="h-auto min-h-12 whitespace-normal" disabled={busy}>{busy ? "Veuillez patienter…" : step === 3 ? "J’ai confirmé — simulation" : "Continuer"}</Button></div>
      {order && <p className="text-xs text-muted-foreground">Si vous fermez, la commande reste en attente dans « Mes commandes ».</p>}
    </form>
  </DialogContent></Dialog>;
}