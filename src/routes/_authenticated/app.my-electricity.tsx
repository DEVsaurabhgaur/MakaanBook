import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Zap, AlertCircle, CheckCircle2, Clock, FileText, Loader2, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/my-electricity")({
  head: () => ({ meta: [{ title: "My Electricity — MakaanBook" }] }),
  component: MyElectricityPage,
});

type Tenant = Tables<"tenants">;
type ElectricityBill = Tables<"electricity_bills">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function MyElectricityPage() {
  const { user } = Route.useRouteContext();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [house, setHouse] = useState<House | null>(null);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantData();
  }, [user.id]);

  async function fetchTenantData() {
    setLoading(true);
    try {
      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (tenantErr) throw tenantErr;

      if (tenantData) {
        setTenant(tenantData);

        if (tenantData.room_id) {
          const { data: roomData, error: roomErr } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", tenantData.room_id)
            .single();
          if (roomErr) throw roomErr;
          setRoom(roomData);

          if (roomData) {
            const { data: houseData, error: houseErr } = await supabase
              .from("houses")
              .select("*")
              .eq("id", roomData.house_id)
              .single();
            if (houseErr) throw houseErr;
            setHouse(houseData);
          }
        }

        const { data: billsData, error: billsErr } = await supabase
          .from("electricity_bills")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (billsErr) throw billsErr;
        setBills(billsData || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch electricity records");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!tenant) {
    return (
      <Card className="glass-card max-w-md mx-auto text-center mt-12">
        <CardContent className="py-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h3 className="mt-4 font-display text-lg font-semibold">Not a registered tenant</h3>
          <p className="mt-2 text-sm text-muted-foreground">Your account is not linked to any active tenant profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Electricity Bills</h1>
        <p className="text-muted-foreground">Track your meter readings, billed units, per-unit rates, and payments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Bills list */}
        <div className="md:col-span-8 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-1">Bill History</h3>
          {bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No bills logged yet.</div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <div key={bill.id} className="rounded-xl border border-border bg-card/30 p-4 flex flex-col gap-3 hover:bg-card/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        bill.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                        bill.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        <Zap className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{MONTHS[bill.month - 1]} {bill.year}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Bill: INR {bill.total_bill} • Paid: INR {bill.amount_paid}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        bill.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                        bill.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {bill.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> :
                         bill.status === "partial" ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {bill.status.toUpperCase()}
                      </span>
                      {bill.cash_proof_urls && bill.cash_proof_urls.length > 0 && (
                        <a href={bill.cash_proof_urls[0]} target="_blank" rel="noreferrer" className="p-1 rounded-lg border border-border hover:bg-card/40 text-muted-foreground" title="View receipt">
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs border-t border-border/40 pt-2 text-muted-foreground">
                    <div>
                      <span>Previous: </span>
                      <span className="font-semibold text-foreground">{bill.previous_reading}</span>
                    </div>
                    <div>
                      <span>Current: </span>
                      <span className="font-semibold text-foreground">{bill.current_reading}</span>
                    </div>
                    <div>
                      <span>Units: </span>
                      <span className="font-semibold text-foreground">{bill.billed_units}</span>
                    </div>
                    <div>
                      <span>Rate: </span>
                      <span className="font-semibold text-foreground">₹{bill.per_unit_rate}</span>
                    </div>
                  </div>
                  {bill.is_meter_replaced && (
                    <div className="bg-amber-500/5 text-amber-400 border border-amber-500/15 rounded-lg p-2 text-[10px]">
                      ⚠️ Meter replaced this month. Billed Units calculated using two meters:
                      (Old final: {bill.old_meter_final_reading} - Previous: {bill.previous_reading}) +
                      (Current: {bill.current_reading} - New start: {bill.new_meter_start_reading}).
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meter Info card */}
        <div className="md:col-span-4 space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Billing Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Unit Rate:</span>
                <span className="font-bold text-foreground">₹{house?.default_unit_rate || 8} / unit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Room:</span>
                <span className="font-bold text-foreground">Room {room?.room_number || "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
