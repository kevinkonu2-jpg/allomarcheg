export const PAYMENT_METHODS = [
  { id: "tmoney", label: "T-Money (Moov/Flooz)", region: "Togo" },
  { id: "wave", label: "Wave", region: "Afrique de l’Ouest" },
  { id: "mtn_momo", label: "MTN Mobile Money", region: "Afrique de l’Ouest" },
  { id: "airtel_money", label: "Airtel Money", region: "Afrique de l’Ouest" },
  { id: "moncash", label: "MonCash", region: "Haïti" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function validPaymentMethod(value: unknown): value is PaymentMethodId {
  return typeof value === "string" && PAYMENT_METHODS.some((m) => m.id === value);
}

export function paymentMethodLabel(value: string | null): string {
  return PAYMENT_METHODS.find((m) => m.id === value)?.label ?? value ?? "";
}
