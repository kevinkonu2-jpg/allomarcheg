import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSchema, paymentSchema, type PendingCheckout } from "@/lib/checkout";

export const submitLocalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<PendingCheckout> => {
    const result = await context.supabase.rpc("place_order", { _items: data.items, _shipping: data.shipping });
    if (result.error || !result.data) throw new Error("Impossible d’enregistrer cette commande. Vérifiez les articles et la ville de livraison.");
    return { orderId: result.data, paymentStatus: "pending" };
  });

export const confirmLocalPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("pay_order", { _order_id: data.orderId, _payment_method: data.method, _reference: data.reference });
    if (result.error) throw new Error("Le paiement n’a pas pu être confirmé. Votre commande reste en attente.");
    return { orderId: data.orderId, paymentStatus: "paid" as const };
  });
