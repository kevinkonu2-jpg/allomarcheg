export const CITIES = ["Paris", "Boston", "Lomé"] as const;
export const validCity = (value: unknown): value is string => typeof value === "string" && CITIES.some((city) => city === value);
export function matchesCity(product: { is_amazon_affiliate: boolean; city_target: string | null }, city: string) {
  return product.is_amazon_affiliate || product.city_target === city;
}
export function validWithdrawal(amount: number, available: number) {
  return Number.isFinite(amount) && amount > 0 && amount <= available && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
}