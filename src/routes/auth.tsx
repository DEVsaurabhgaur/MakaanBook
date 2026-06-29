import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    // Skip on server — ssr:false routes only need this check client-side.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Sign in — MakaanBook" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initial ?? "signin");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const full_name = String(fd.get("full_name") ?? "").trim();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name, role: "landlord" }, emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to MakaanBook!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally { setLoading(false); }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) { toast.error(error.message); return; }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally { setGoogleLoading(false); }
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 font-display font-bold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span>
        MakaanBook
      </Link>
      <div className="mx-auto mt-8 max-w-md">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">{mode === "signup" ? "Create your landlord account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Tenants — your landlord will send you credentials." : "Sign in to your dashboard."}
          </p>

          <Button type="button" variant="outline" className="mt-6 w-full" onClick={onGoogle} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.46-1.7 4.3-5.35 4.3-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.86 4.13 14.66 3.15 12 3.15 6.98 3.15 2.9 7.23 2.9 12.25S6.98 21.35 12 21.35c6.92 0 9.45-4.86 9.45-7.36 0-.5-.05-.88-.1-1.25z"/></svg>}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or {mode === "signup" ? "sign up" : "sign in"} with email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required placeholder="Ramesh Kumar" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already have an account?{" "}<button onClick={() => setMode("signin")} className="text-primary hover:underline">Sign in</button></>
            ) : (
              <>New landlord?{" "}<button onClick={() => setMode("signup")} className="text-primary hover:underline">Create an account</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
