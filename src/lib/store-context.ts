import { createContext, type Context } from "react";
import type { User } from "@supabase/supabase-js";

export type CartItem = {
  product_id: string;
  title: string;
  price: number;
  image_url: string | null;
  city: string;
  quantity: number;
};

export type Store = {
  city: string;
  setCity: (city: string) => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => boolean;
  updateQty: (id: string, quantity: number) => void;
  clearCart: () => void;
  user: User | null;
  isAdmin: boolean;
};

// Keep providers and consumers on the same context across preview updates.
const previous: Context<Store | null> | undefined = import.meta.hot?.data?.['storeContext'];
export const StoreContext = previous ?? createContext<Store | null>(null);
if (import.meta.hot?.data) import.meta.hot.data['storeContext'] = StoreContext;