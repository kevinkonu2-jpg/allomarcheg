import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { matchesCity, validWithdrawal } from "@/lib/marketplace";
import { StoreProvider, useStore } from "@/lib/store";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { sub: null, subscription: { unsubscribe() {} } } }) } } }));

describe("City eligibility", () => {
  it("keeps Amazon products visible in Paris, Boston and Lomé", () => {
    for (const city of ["Paris", "Boston", "Lomé"]) expect(matchesCity({ is_amazon_affiliate: true, city_target: null }, city)).toBe(true);
  });
  it("shows Paris local items only in Paris", () => {
    expect(matchesCity({ is_amazon_affiliate: false, city_target: "Paris" }, "Paris")).toBe(true);
    expect(matchesCity({ is_amazon_affiliate: false, city_target: "Paris" }, "Boston")).toBe(false);
  });
  it("restores Boston and its basket without overwriting them on mount", async () => {
    localStorage.clear();
    localStorage.setItem("amg_city", "Boston");
    localStorage.setItem("amg_cart", JSON.stringify([{ product_id: "coffee", title: "Café", price: 18, image_url: null, city: "Boston", quantity: 2 }]));
    let store: ReturnType<typeof useStore> | undefined;
    function Probe() { store = useStore(); return null; }
    const view = render(<StoreProvider><Probe /></StoreProvider>);
    await waitFor(() => expect(store?.city).toBe("Boston"));
    expect(store?.cart[0]?.quantity).toBe(2);
    expect(JSON.parse(localStorage.getItem("amg_cart") ?? "[]")[0].quantity).toBe(2);
    act(() => { store?.setCity("Paris"); });
    expect(store?.cart).toEqual([]);
    expect(localStorage.getItem("amg_city")).toBe("Paris");
    view.unmount();
  });
});

describe("Withdrawals", () => {
  it("allows a positive amount within the individual's available balance", () => {
    expect(validWithdrawal(1.25, 2)).toBe(true);
    expect(validWithdrawal(2, 2)).toBe(true);
    expect(validWithdrawal(2.01, 2)).toBe(false);
  });
  it("rejects zero, negative, non-finite and sub-cent amounts", () => {
    for (const amount of [0, -1, NaN, Infinity, 0.001]) expect(validWithdrawal(amount, 100)).toBe(false);
  });
});