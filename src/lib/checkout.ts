import { z } from "zod";

export const checkoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive().max(999) })).min(1).max(100),
  shipping: z.string().trim().min(3).max(1000),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// A future gateway starts payment against this pending order, never a browser total.
export type PendingCheckout = { orderId: string; paymentStatus: "pending" };