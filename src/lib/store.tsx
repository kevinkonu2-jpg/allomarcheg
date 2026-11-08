import { useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, validCity } from "@/lib/marketplace";
import { StoreContext as Ctx, type CartItem, type Store } from "@/lib/store-context";

export { CITIES };
export type { CartItem } from "@/lib/store-context";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string>("Paris");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem("amg_city");
      const activeCity = validCity(c) ? c : "Paris";
      setCityState(activeCity);
      const k = localStorage.getItem("amg_cart");
      const saved: unknown = k ? JSON.parse(k) : [];
      if (Array.isArray(saved)) setCart(saved.filter((i): i is CartItem => !!i && typeof i.product_id === "string" && typeof i.title === "string" && typeof i.price === "number" && i.city === activeCity && Number.isInteger(i.quantity) && i.quantity > 0));
    } catch { /* Ignore unavailable or corrupted browser storage. */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem("amg_cart", JSON.stringify(cart)); } catch { /* In-memory basket remains usable. */ }
  }, [cart, restored]);

  useEffect(() => {
    let revision = 0;
    let disposed = false;
    const load = async (u: User | null) => {
      const current = ++revision;
      setUser(u);
      setIsAdmin(false);
      if (!u) return;
      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
        if (!disposed && current === revision) setIsAdmin(!error && data === true);
      } catch { /* Unknown privileges must stay denied. */ }
    };
    const initial = revision;
    void supabase.auth.getUser().then(({ data }) => {
      if (!disposed && revision === initial) void load(data.user);
    }).catch(() => { if (!disposed && revision === initial) void load(null); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
        void load(session?.user ?? null);
    });
    return () => { disposed = true; revision++; sub.subscription.unsubscribe(); };
  }, []);

  const setCity = (c: string) => {
    if (!validCity(c)) return;
    setCityState(c);
    try { localStorage.setItem("amg_city", c); } catch { /* City selection still works. */ }
    // Prevent cross-city deliveries: drop local items from other cities
    setCart((prev) => prev.filter((i) => i.city === c));
  };

  const addToCart: Store["addToCart"] = (item) => {
    if (item.city !== city) return false;
    setCart((prev) => {
      const ex = prev.find((p) => p.product_id === item.product_id);
      if (ex) return prev.map((p) => (p === ex ? { ...p, quantity: p.quantity + 1 } : p));
      return [...prev, { ...item, quantity: 1 }];
    });
    return true;
  };
  const updateQty = (id: string, qty: number) =>
    setCart((prev) =>
      qty <= 0 ? prev.filter((p) => p.product_id !== id) : prev.map((p) => (p.product_id === id ? { ...p, quantity: qty } : p)),
    );

  return (
    <Ctx.Provider value={{ city, setCity, cart, addToCart, updateQty, clearCart: () => setCart([]), user, isAdmin }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
