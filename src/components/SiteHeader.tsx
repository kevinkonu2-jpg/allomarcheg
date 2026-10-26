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
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="font-display text-xl font-semibold text-primary">
          Allô Marché <span className="text-accent-foreground/70 italic">Global</span>
        </Link>
        <nav className="ml-6 hidden gap-5 text-sm md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>Catalog</Link>
          <Link to="/shops" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>Local shops</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-9 w-[130px]" aria-label="Delivery city">
              <MapPin className="text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart" aria-label="Cart">
              <ShoppingBag />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count}</span>
              )}
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild><Link to="/orders" aria-label="My orders"><Package /></Link></Button>
              {isAdmin && <Button variant="secondary" size="sm" asChild><Link to="/admin"><LayoutDashboard /> Admin</Link></Button>}
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}><LogOut /></Button>
            </>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
