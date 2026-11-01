import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, ShoppingBag, LogOut, LayoutDashboard, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { city, setCity, cart, user, isAdmin } = useStore();
  const navigate = useNavigate();
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto grid min-h-[72px] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 md:flex md:gap-4">
        <Link to="/" aria-label="Allô Marché Global, accueil" className="flex min-h-12 min-w-0 flex-col justify-center font-display text-xl font-semibold leading-tight text-primary md:mr-auto md:shrink-0">
          <span>Allô Marché</span><span className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Global</span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden shrink-0 items-center text-sm md:flex">
          <Button variant="ghost" asChild><Link to="/catalog" activeProps={{ className: "bg-secondary text-primary" }}>Catalogue</Link></Button>
          <Button variant="ghost" asChild><Link to="/shops" activeProps={{ className: "bg-secondary text-primary" }}>Boutiques</Link></Button>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-12 w-[120px] border-transparent bg-secondary shadow-none" aria-label="Ville de livraison">
              <MapPin className="size-4 shrink-0 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" asChild className="relative hidden md:inline-flex">
            <Link to="/cart" aria-label="Panier">
              <ShoppingBag />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count}</span>
              )}
            </Link>
          </Button>
          {user ? (
            <div className="hidden items-center gap-1 md:flex">
              <Button variant="secondary" size="icon" asChild><Link to={isAdmin ? "/admin" : "/auth"} aria-label={isAdmin ? "Espace admin" : "Mon compte"} title={isAdmin ? "Espace admin" : "Mon compte"}>{isAdmin ? <LayoutDashboard /> : <UserRound />}</Link></Button>
              <Button variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}><LogOut /></Button>
            </div>
          ) : (
            <Button size="icon" asChild className="hidden md:inline-flex"><Link to="/auth" aria-label="Mon compte" title="Mon compte"><UserRound /></Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
