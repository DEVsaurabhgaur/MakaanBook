import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Building2, Receipt, Sparkles, ShieldCheck, ArrowRight, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    // Skip on server — ssr:false routes only need this check client-side.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "MakaanBook — Rent & Electricity Bill Manager for Indian Landlords" },
      { name: "description", content: "Track rent, electricity bills, payment proofs and tenants. AI-powered insights, PDF reports, multi-property dashboard." },
      { name: "keywords", content: "rent manager, electricity bill calculator, indian landlords, tenant ledger, rent receipt, rent tracker india, submeter calculator" },
      { name: "author", content: "Saurabh Gaur" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span>
          MakaanBook
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90">Get started</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Built for Indian landlords & tenants
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-6xl">
              Rent, bills & tenants — <span className="text-primary">finally in order.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Manage multiple houses, track rent due dates, log electricity meter readings, store payment proofs, and ask an AI assistant about your finances — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 font-medium hover:bg-accent">
                I'm a tenant — sign in
              </Link>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-card rounded-3xl p-6 shadow-2xl shadow-primary/10">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Expected", value: "₹1,84,000", color: "stat-blue", icon: IndianRupee },
                { label: "Collected", value: "₹1,42,500", color: "stat-emerald", icon: Receipt },
                { label: "Pending", value: "₹28,500", color: "stat-amber", icon: ShieldCheck },
                { label: "Overdue", value: "₹13,000", color: "stat-red", icon: Building2 },
              ].map((s) => (
                <div key={s.label} className="stat-tile">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><s.icon className="h-4 w-4" style={{ color: `var(--color-${s.color})` }} />{s.label}</div>
                  <div className="mt-2 text-2xl font-bold" style={{ color: `var(--color-${s.color})` }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-border bg-card/50 p-4 text-sm">
              <div className="font-medium">Ask MakaanBook AI</div>
              <p className="mt-1 text-muted-foreground">"Kitna rent pending hai is mahine?"</p>
            </div>
          </motion.div>
        </motion.div>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { t: "Multi-property dashboard", d: "Track every house, every room, every tenant — at a glance." },
            { t: "Electricity made simple", d: "Meter readings in, bills out. Tenants get a self-service calculator." },
            { t: "Payment proofs & PDF reports", d: "Photos of cash, transaction IDs, and exportable statements for 20 years." },
          ].map((f) => (
            <div key={f.t} className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MakaanBook</footer>
    </div>
  );
}
