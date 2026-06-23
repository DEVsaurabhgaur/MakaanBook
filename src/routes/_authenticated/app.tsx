import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, Users, Receipt, Zap, Sparkles, FileText, LogOut, Menu, X, IndianRupee, Calculator, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "landlord" | "tenant" | null;

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  const { user } = Route.useRouteContext();
  const [role, setRole] = useState<Role>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRole((data?.role as Role) ?? "landlord"));
  }, [user.id]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const landlordNav = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/app/properties", label: "Properties", icon: Building2 },
    { to: "/app/tenants", label: "Tenants", icon: Users },
    { to: "/app/rent", label: "Record rent", icon: Receipt },
    { to: "/app/electricity", label: "Electricity", icon: Zap },
    { to: "/app/reports", label: "Reports", icon: FileText },
    { to: "/app/ai", label: "AI assistant", icon: Sparkles },
  ];
  const tenantNav = [
    { to: "/app", label: "My home", icon: Home, exact: true },
    { to: "/app/my-rent", label: "Rent history", icon: IndianRupee },
    { to: "/app/my-electricity", label: "Electricity", icon: Zap },
    { to: "/app/calculator", label: "Bill calculator", icon: Calculator },
  ];
  const nav = role === "tenant" ? tenantNav : landlordNav;

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between border-b border-border bg-sidebar/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/app" className="flex items-center gap-2 font-display font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Building2 className="h-4 w-4" /></span>
          MakaanBook
        </Link>
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close navigation menu" : "Open navigation menu"} className="rounded-md p-2 hover:bg-accent">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      <div className="flex">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <Link to="/app" className="mb-8 hidden items-center gap-2 font-display text-lg font-bold md:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span>
            MakaanBook
          </Link>
          <nav className="space-y-1">
            {nav.map((n) => (
              <Link
                key={n.to} to={n.to as any} onClick={() => setOpen(false)}
                activeOptions={{ exact: !!n.exact }}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
            <div className="font-medium text-sidebar-foreground truncate">{user.email}</div>
            <div className="mt-0.5 text-sidebar-foreground/60 capitalize">{role ?? "loading…"}</div>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
