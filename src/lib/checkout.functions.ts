import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSchema, type PendingCheckout } from "@/lib/checkout";

export const submitLocalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<PendingCheckout> => {
    const result = await context.supabase.rpc("place_order", { _items: data.items, _shipping: data.shipping });
    if (result.error || !result.data) throw new Error("Impossible d’enregistrer cette commande. Vérifiez les articles et la ville de livraison.");
    return { orderId: result.data, paymentStatus: "pending" };
  });