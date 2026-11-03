import { z } from "zod";

export const checkoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive().max(999) })).min(1).max(100),
  shipping: z.string().trim().min(3).max(1000),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// A future gateway starts payment against this pending order, never a browser total.
export type PendingCheckout = { orderId: string; paymentStatus: "pending" };

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["tmoney", "wave", "mtn_momo", "airtel_money", "moncash"]),
  reference: z.string().trim().min(6).max(120),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
