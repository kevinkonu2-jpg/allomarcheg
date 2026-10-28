import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, ShoppingBag, LogOut, LayoutDashboard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { city, setCity, cart, user, isAdmin } = useStore();
  const navigate = useNavigate();
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-auto font-display text-lg font-semibold text-primary sm:text-xl">
          Allô Marché <span className="text-accent-foreground/70 italic">Global</span>
        </Link>
        <nav className="order-3 flex w-full gap-4 text-sm lg:order-none lg:w-auto">
          <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>Catalogue</Link>
          <Link to="/shops" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>Boutiques locales</Link>
          {user && <Link to="/orders" className="text-muted-foreground hover:text-foreground">Mes commandes</Link>}
        </nav>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-9 w-[112px]" aria-label="Ville de livraison">
              <MapPin className="text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" asChild className="relative">
            <Link to="/cart" aria-label="Panier">
              <ShoppingBag />
              <span className="hidden sm:inline">Panier</span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count}</span>
              )}
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="secondary" size="sm" asChild><Link to={isAdmin ? "/admin" : "/auth"}>{isAdmin ? <LayoutDashboard /> : <Package />}<span className="hidden sm:inline">{isAdmin ? "Espace admin" : "Mon compte"}</span></Link></Button>
              <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}><LogOut /></Button>
            </>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Mon compte</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
