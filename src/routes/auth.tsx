import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { title: "Mon compte — Allô Marché Global" },
      { name: "description", content: "Connectez-vous ou créez votre compte Allô Marché Global." },
      { property: "og:title", content: "Mon compte — Allô Marché Global" },
      { property: "og:description", content: "Accédez à votre compte Allô Marché Global." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Consultez votre e-mail pour confirmer votre compte.");
      setMode("in");
    }
    return undefined;
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-4xl">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border bg-card p-6 shadow-card">
        {mode === "up" && <div className="space-y-1"><Label htmlFor="n">Nom complet</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>}
        <div className="space-y-1"><Label htmlFor="e">E-mail</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="p">Mot de passe</Label><Input id="p" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Se connecter" : "Créer mon compte"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Pas de compte ? Inscrivez-vous" : "Déjà un compte ? Connectez-vous"}
        </button>
      </form>
    </div>
  );
}
