import { z } from "zod";

export const TOGO_DELIVERY_CITIES = ["Lomé", "Tsévié", "Aného", "Kpalimé", "Atakpamé", "Sokodé", "Kara", "Dapaong"] as const;
export const phoneSchema = z.string().trim().transform((s) => s.replace(/[\s().-]/g, "")).refine((s) => /^\+?[0-9]{8,15}$/.test(s), "Saisissez un numéro de téléphone valide (8 à 15 chiffres).");
export const deliverySchema = z.object({
  fullName: z.string().trim().min(3, "Renseignez le nom complet.").max(120),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5, "Renseignez une adresse précise.").max(500),
  phone: phoneSchema,
});
export type DeliveryDetails = z.infer<typeof deliverySchema>;
export function eligibleDeliveryCity(catalogCity: string, deliveryCity: string) {
  return catalogCity === "Lomé" ? TOGO_DELIVERY_CITIES.some((c) => c === deliveryCity) : catalogCity === deliveryCity;
}

export const checkoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive().max(999) })).min(1).max(100),
  shipping: z.string().trim().min(3).max(1000),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export const localCheckoutSchema = z.object({ items: checkoutSchema.shape.items, catalogCity: z.enum(["Paris", "Boston", "Lomé"]), delivery: deliverySchema }).refine((d) => eligibleDeliveryCity(d.catalogCity, d.delivery.city), "Ville de livraison non desservie.");

// A future gateway starts payment against this pending order, never a browser total.
export type PendingCheckout = { orderId: string; paymentStatus: "pending" };

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
   method: z.enum(["tmoney", "flooz", "wave", "mtn_momo", "airtel_money", "moncash"]),
   accountPhone: phoneSchema,
   confirmed: z.literal(true),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
