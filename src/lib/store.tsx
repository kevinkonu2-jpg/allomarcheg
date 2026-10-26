import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const CITIES = ["Paris", "Boston", "Lomé"] as const;

export type CartItem = {
  product_id: string;
  title: string;
  price: number;
  image_url: string | null;
  city: string;
  quantity: number;
};

type Store = {
  city: string;
  setCity: (c: string) => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => boolean;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  user: User | null;
  isAdmin: boolean;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string>("Paris");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem("amg_city");
    if (c) setCityState(c);
    const k = localStorage.getItem("amg_cart");
    if (k) setCart(JSON.parse(k));
  }, []);
  useEffect(() => {
    localStorage.setItem("amg_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (!u) return setIsAdmin(false);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      setIsAdmin(!!data?.some((r) => r.role === "admin"));
    };
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
        load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setCity = (c: string) => {
    setCityState(c);
    localStorage.setItem("amg_city", c);
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
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(n);
