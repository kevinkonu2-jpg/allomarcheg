import { Link, useLocation } from "@tanstack/react-router";
import { House, Grid2X2, Store, ShoppingBag, UserRound, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export function MobileNavigation() {
  const { cart, isAdmin } = useStore();
  const { pathname } = useLocation();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const tabs = [
    { to: "/", label: "Accueil", icon: House },
    { to: "/catalog", label: "Catalogue", icon: Grid2X2 },
    { to: "/shops", label: "Boutiques", icon: Store },
    { to: "/cart", label: "Panier", icon: ShoppingBag },
    { to: isAdmin ? "/admin" : "/auth", label: isAdmin ? "Admin" : "Profil", icon: isAdmin ? LayoutDashboard : UserRound },
  ] as const;
  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-navigation backdrop-blur-xl md:hidden">
      <div className="mx-auto grid h-[72px] max-w-lg grid-cols-5 items-center gap-1">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (label === "Profil" && pathname === "/orders");
          return <Button key={to} asChild variant="ghost" className={`relative h-16 min-w-0 flex-col gap-1 rounded-lg px-0 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
            <Link to={to} aria-current={active ? "page" : undefined}>
              <span className={`grid h-8 w-12 place-items-center rounded-lg ${active ? "bg-secondary" : ""}`}><Icon className="size-5" /></span>
              <span>{label}</span>
              {to === "/cart" && count > 0 && <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">{count > 99 ? "99+" : count}</span>}
            </Link>
          </Button>;
        })}
      </div>
    </nav>
  );
}