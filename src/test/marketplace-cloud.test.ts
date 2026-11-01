import { describe, expect, it } from "vitest";

const url = process.env['TEST_CLOUD_URL'];
const key = process.env['TEST_CLOUD_KEY'];
const token = process.env['TEST_CLOUD_TOKEN'];
const userId = process.env['TEST_CLOUD_USER'];
async function request(path: string, body?: unknown, authenticated = true) {
  const headers: Record<string, string> = { apikey: key ?? "", "Content-Type": "application/json" };
  if (authenticated && token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${url}/rest/v1/${path}`, { headers, method: body === undefined ? "GET" : "POST", body: body === undefined ? null : JSON.stringify(body) });
}

describe.skipIf(!url || !key || !token || !userId)("Live marketplace rules", () => {
  it("has at least six Amazon examples and two local examples per Paris and Boston", async () => {
    const response = await request("products?select=is_amazon_affiliate,city_target", undefined, false);
    expect(response.ok).toBe(true);
    const products = await response.json() as { is_amazon_affiliate: boolean; city_target: string | null }[];
    expect(products.filter((p) => p.is_amazon_affiliate).length).toBeGreaterThanOrEqual(6);
    for (const city of ["Paris", "Boston"]) expect(products.filter((p) => !p.is_amazon_affiliate && p.city_target === city).length).toBeGreaterThanOrEqual(2);
  });
  it("rejects invalid withdrawals without changing the admin's wallet", async () => {
    const path = `admin_wallets?select=available_balance,withdrawn_amount&admin_id=eq.${userId}`;
    const before = await (await request(path)).json();
    expect(before).toHaveLength(1);
    for (const amount of [0, -1, 0.001, null]) expect((await request("rpc/request_withdrawal", { _amount: amount })).ok).toBe(false);
    expect(await (await request(path)).json()).toEqual(before);
  });
  it("does not allow anonymous users to grant administrator access", async () => {
    expect((await request("rpc/grant_admin", { _email: "nobody@example.test", _share: 0 }, false)).ok).toBe(false);
  });
  it("rejects a basket mixing Paris and Boston", async () => {
    const products = await (await request("products?select=id,city_target&is_amazon_affiliate=eq.false")).json() as { id: string; city_target: string }[];
    const paris = products.find((p) => p.city_target === "Paris");
    const boston = products.find((p) => p.city_target === "Boston");
    expect(paris).toBeDefined(); expect(boston).toBeDefined();
    const response = await request("rpc/place_order", { _items: [{ product_id: paris?.id, quantity: 1 }, { product_id: boston?.id, quantity: 1 }], _shipping: "Adresse de test, Paris" });
    expect(response.ok).toBe(false);
  });
  it("only returns the authenticated admin's own wallet", async () => {
    const wallets = await (await request("admin_wallets?select=admin_id")).json();
    expect(wallets).toEqual([{ admin_id: userId }]);
    expect(await (await request("admin_wallets?select=admin_id", undefined, false)).json()).not.toEqual(wallets);
  });
  it("does not allow a browser to forge a paid order", async () => {
    const response = await request("orders", { client_id: userId, total_amount: 10, payment_status: "paid" });
    expect(response.ok).toBe(false);
  });
  it("rejects Amazon products in local checkout", async () => {
    const products = await (await request("products?select=id&is_amazon_affiliate=eq.true&limit=1")).json();
    expect(products).toHaveLength(1);
    expect((await request("rpc/place_order", { _items: [{ product_id: products[0].id, quantity: 1 }], _shipping: "Adresse de test, Paris" })).ok).toBe(false);
  });
  it("creates pending local orders without changing finances", async () => {
    const walletPath = "admin_wallets?select=total_earned,available_balance,withdrawn_amount";
    const before = await (await request(walletPath)).json();
    const statsBefore = await (await request("rpc/admin_stats", {})).json();
    const products = await (await request("products?select=id,price&is_amazon_affiliate=eq.false&city_target=eq.Paris&limit=1")).json();
    expect(products).toHaveLength(1);
    const response = await request("rpc/place_order", { _items: [{ product_id: products[0].id, quantity: 1, price: 0 }], _shipping: "Vérification automatique sans paiement, Paris" });
    expect(response.ok).toBe(true);
    const id = await response.json();
    const orders = await (await request(`orders?select=payment_status,total_amount&id=eq.${id}`)).json();
    expect(orders).toEqual([{ payment_status: "pending", total_amount: products[0].price }]);
    expect(await (await request(walletPath)).json()).toEqual(before);
    expect(await (await request("rpc/admin_stats", {})).json()).toEqual(statsBefore);
  });
});