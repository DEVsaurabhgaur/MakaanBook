import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, Receipt, Zap, FileText, ArrowRight, IndianRupee, Home, Sparkles, AlertCircle, Loader2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard — MakaanBook" }] }),
  component: Dashboard,
});

type Role = "landlord" | "tenant";

function Dashboard() {
  const { user } = Route.useRouteContext();
  const [role, setRole] = useState<Role>("landlord");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  // Landlord stats
  const [houseCount, setHouseCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  // Tenant stats
  const [tenantRoom, setTenantRoom] = useState<any>(null);
  const [tenantHouse, setTenantHouse] = useState<any>(null);
  const [pendingRent, setPendingRent] = useState<any>(null);
  const [latestBill, setLatestBill] = useState<any>(null);

  useEffect(() => {
    fetchProfileAndStats();
  }, [user.id]);

  async function fetchProfileAndStats() {
    setLoading(true);
    try {
      // Fetch profile and role in parallel
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      ]);

      if (profileRes.error) throw profileRes.error;
      if (roleRes.error) throw roleRes.error;

      if (profileRes.data?.full_name) setFullName(profileRes.data.full_name);
      const userRole = (roleRes.data?.role as Role) || "landlord";
      setRole(userRole);

      if (userRole === "landlord") {
        // Fetch landlord metrics
        const { count: houses, error: housesErr } = await supabase.from("houses").select("*", { count: "exact", head: true }).eq("landlord_id", user.id);
        if (housesErr) throw housesErr;
        setHouseCount(houses || 0);

        const { count: rooms, error: roomsErr } = await supabase.from("rooms").select("*", { count: "exact", head: true }).eq("landlord_id", user.id);
        if (roomsErr) throw roomsErr;
        setRoomCount(rooms || 0);

        const { count: tenants, error: tenantsErr } = await supabase.from("tenants").select("*", { count: "exact", head: true }).eq("landlord_id", user.id).eq("is_active", true);
        if (tenantsErr) throw tenantsErr;
        setTenantCount(tenants || 0);

        // Fetch rent record aggregates for the current year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const { data: currentRent, error: currentRentErr } = await supabase
          .from("rent_records")
          .select("amount_paid, rent_amount, status")
          .eq("landlord_id", user.id)
          .eq("month", currentMonth)
          .eq("year", currentYear);
        if (currentRentErr) throw currentRentErr;

        let collected = 0;
        let pending = 0;

        if (currentRent) {
          currentRent.forEach((r) => {
            collected += Number(r.amount_paid || 0);
            if (r.status !== "paid") {
              pending += Number(r.rent_amount) - Number(r.amount_paid);
            }
          });
        }
        setTotalCollected(collected);
        setTotalPending(pending);

        // Fetch recent payments
        const { data: recPayments, error: recPaymentsErr } = await supabase
          .from("rent_records")
          .select("id, tenant_id, rent_amount, amount_paid, month, year, status, tenants(full_name)")
          .eq("landlord_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (recPaymentsErr) throw recPaymentsErr;

        setRecentPayments(recPayments || []);
      } else {
        // Fetch active tenant profile
        const { data: activeTenant, error: activeTenantErr } = await supabase
          .from("tenants")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (activeTenantErr) throw activeTenantErr;

        if (activeTenant) {
          setTenantRoom(activeTenant.room_id);
          // Fetch room
          if (activeTenant.room_id) {
            const { data: roomData, error: roomErr } = await supabase.from("rooms").select("*").eq("id", activeTenant.room_id).single();
            if (roomErr) throw roomErr;
            setTenantRoom(roomData);

            if (roomData) {
              const { data: houseData, error: houseErr } = await supabase.from("houses").select("*").eq("id", roomData.house_id).single();
              if (houseErr) throw houseErr;
              setTenantHouse(houseData);
            }
          }

          // Fetch pending rent records
          const { data: pendingRecord, error: pendingErr } = await supabase
            .from("rent_records")
            .select("*")
            .eq("tenant_id", activeTenant.id)
            .neq("status", "paid")
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (pendingErr) throw pendingErr;

          setPendingRent(pendingRecord);

          // Fetch latest electricity bill
          const { data: latestElec, error: latestElecErr } = await supabase
            .from("electricity_bills")
            .select("*")
            .eq("tenant_id", activeTenant.id)
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestElecErr) throw latestElecErr;

          setLatestBill(latestElec);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  if (role === "tenant") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Namaste, {fullName.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm">Welcome to your home dashboard. View active payments and billing info.</p>
        </div>

        {tenantRoom ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* My Home Detail Card */}
            <Card className="glass-card md:col-span-2">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" /> My Home Details
                </CardTitle>
                <CardDescription>{tenantHouse?.house_name || "MakaanBook Building"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Room Assigned</span>
                    <span className="font-semibold text-lg">Room {tenantRoom.room_number} ({tenantRoom.floor || "N/A"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Monthly Rent</span>
                    <span className="font-semibold text-lg">₹{tenantRoom.monthly_rent}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Security Deposit</span>
                    <span className="font-semibold text-lg">₹{tenantRoom.security_deposit || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Rent Due Day</span>
                    <span className="font-semibold text-lg">{tenantRoom.rent_due_day}th of month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions / Dues */}
            <div className="space-y-4">
              {pendingRent ? (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> Rent Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2 text-red-300">
                    <p>Rent for {MONTHS[pendingRent.month - 1]} {pendingRent.year} is pending.</p>
                    <div className="text-lg font-bold text-foreground">₹{pendingRent.rent_amount - pendingRent.amount_paid} due</div>
                    <Link to="/app/my-rent" className="inline-flex items-center gap-1 text-primary hover:underline font-bold mt-2">
                      View details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Rent Cleared
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-emerald-300">
                    All current rent payments are up to date. Thank you!
                  </CardContent>
                </Card>
              )}

              {latestBill && (
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-500" /> Latest Electricity Bill
                    </CardTitle>
                    <CardDescription>{MONTHS[latestBill.month - 1]} {latestBill.year}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Units consumed:</span>
                      <span className="font-semibold text-foreground">{latestBill.billed_units}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Amount:</span>
                      <span className="font-semibold text-foreground">₹{latestBill.total_bill}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`font-semibold capitalize ${latestBill.status === "paid" ? "text-emerald-400" : "text-destructive"}`}>
                        {latestBill.status}
                      </span>
                    </div>
                    <Link to="/app/my-electricity" className="inline-flex items-center gap-1 text-primary hover:underline font-bold mt-2">
                      View statements <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="glass-card text-center py-12">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="mt-4 font-display text-lg font-semibold">No room links</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask your landlord to link this email to your rented room.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Landlord Dashboard
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Namaste, {fullName.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground text-sm">Here is a quick snapshot of your properties and collections.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {[
          { label: "Buildings", value: houseCount, color: "stat-blue", icon: Building2 },
          { label: "Rooms", value: roomCount, color: "stat-violet", icon: Home },
          { label: "Active Tenants", value: tenantCount, color: "stat-teal", icon: Users },
          { label: "Rent Collected", value: `₹${totalCollected}`, color: "stat-emerald", icon: IndianRupee },
          { label: "Rent Pending", value: `₹${totalPending}`, color: "stat-red", icon: Receipt },
        ].map((s) => (
          <div key={s.label} className="stat-tile">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <s.icon className="h-4 w-4" style={{ color: `var(--color-${s.color})` }} />
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground" style={{ color: `var(--color-${s.color})` }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Quick actions & AI banner */}
        <div className="md:col-span-7 space-y-4">
          <Card className="glass-card bg-primary/5 border-primary/20">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5" /> MakaanBook AI is active
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Query collections, tenant defaults, or meter histories in natural Hinglish.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/app/ai">Chat now</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Collections */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Recent Rent Ledger logs</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center border rounded-xl border-dashed">No payments recorded recently.</p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-card/25 rounded-lg border border-border/40">
                      <div>
                        <span className="font-semibold text-foreground text-sm block">{p.tenants?.full_name || "Resident"}</span>
                        <span className="text-muted-foreground mt-0.5 block">{MONTHS[p.month - 1]} {p.year}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">INR {p.amount_paid}</span>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase mt-0.5 ${
                          p.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick link actions */}
        <div className="md:col-span-5 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Quick Actions</CardTitle>
              <CardDescription>Shortcut triggers to run routine workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="justify-start gap-2.5 text-xs">
                <Link to="/app/tenants">
                  <Users className="h-4 w-4 text-primary" /> Add Resident Profile
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 text-xs">
                <Link to="/app/rent">
                  <Receipt className="h-4 w-4 text-primary" /> Log Rent collections
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 text-xs">
                <Link to="/app/electricity">
                  <Zap className="h-4 w-4 text-amber-500" /> Log Meter Reading
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 text-xs">
                <Link to="/app/reports">
                  <FileText className="h-4 w-4 text-primary" /> Export PDF Ledger Statement
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
