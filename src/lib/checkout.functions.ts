import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { localCheckoutSchema, paymentSchema, type PendingCheckout } from "@/lib/checkout";

export const submitLocalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => localCheckoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<PendingCheckout> => {
    const result = await context.supabase.rpc("submit_delivery_order", { _items: data.items, _catalog_city: data.catalogCity, _delivery: data.delivery });
    if (result.error || !result.data) throw new Error("Impossible d’enregistrer cette commande. Vérifiez les articles et la ville de livraison.");
    const order = await context.supabase.from("orders").select("total_amount").eq("id", result.data).single();
    if (order.error || !order.data) throw new Error("Commande créée. Retrouvez-la dans Mes commandes pour reprendre le paiement.");
    return { orderId: result.data, paymentStatus: "pending", total: Number(order.data.total_amount) };
  });

export const confirmLocalPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => paymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("simulate_order_payment", { _order_id: data.orderId, _method: data.method, _phone: data.accountPhone, _confirmed: data.confirmed });
    if (result.error) throw new Error("Le paiement n’a pas pu être confirmé. Votre commande reste en attente.");
    return { orderId: data.orderId, paymentStatus: "paid" as const };
  });
