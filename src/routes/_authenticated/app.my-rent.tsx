import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Receipt, Landmark, CreditCard, CheckCircle2, Clock, AlertCircle, FileText, Loader2, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/my-rent")({
  head: () => ({ meta: [{ title: "Rent Ledger — MakaanBook" }] }),
  component: MyRentPage,
});

type Tenant = Tables<"tenants">;
type RentRecord = Tables<"rent_records">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function MyRentPage() {
  const { user } = Route.useRouteContext();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [house, setHouse] = useState<House | null>(null);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantData();
  }, [user.id]);

  async function fetchTenantData() {
    setLoading(true);
    try {
      // Find tenant record for this user
      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (tenantErr) throw tenantErr;

      if (tenantData) {
        setTenant(tenantData);

        // Fetch room
        if (tenantData.room_id) {
          const { data: roomData } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", tenantData.room_id)
            .single();
          setRoom(roomData);

          if (roomData) {
            const { data: houseData } = await supabase
              .from("houses")
              .select("*")
              .eq("id", roomData.house_id)
              .single();
            setHouse(houseData);
          }
        }

        // Fetch rent records
        const { data: records, error: recErr } = await supabase
          .from("rent_records")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (recErr) throw recErr;
        setRentRecords(records || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch tenant records");
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
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is not linked to any active tenant profile. If you are a landlord, please use the Landlord panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendingRecords = rentRecords.filter((r) => r.status === "pending" || r.status === "partial" || r.status === "overdue");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Rent History & Ledger</h1>
        <p className="text-muted-foreground">Verify payments, check monthly dues, and access receipts.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Ledger Column */}
        <div className="md:col-span-8 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-1">Payment Logs</h3>
          {rentRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No rent records found.</div>
          ) : (
            <div className="space-y-3">
              {rentRecords.map((record) => (
                <div key={record.id} className="rounded-xl border border-border bg-card/30 p-4 flex items-center justify-between hover:bg-card/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      record.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                      record.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      <Receipt className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{MONTHS[record.month - 1]} {record.year}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Due: INR {record.rent_amount} • Paid: <span className="text-emerald-400">INR {record.amount_paid}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      record.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                      record.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {record.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> :
                       record.status === "partial" ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {record.status.toUpperCase()}
                    </span>
                    {record.cash_proof_urls && record.cash_proof_urls.length > 0 && (
                      <a href={record.cash_proof_urls[0]} target="_blank" rel="noreferrer" className="p-1 rounded-lg border border-border hover:bg-card/40 text-muted-foreground" title="View receipt">
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="md:col-span-4 space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Resident Profile</CardTitle>
              <CardDescription>{house?.house_name || "MakaanBook Property"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room:</span>
                <span className="font-bold text-foreground">Room {room?.room_number || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Rent:</span>
                <span className="font-bold text-foreground">₹{tenant.monthly_rent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rent Due Day:</span>
                <span className="font-bold text-foreground">{tenant.rent_due_day}th of month</span>
              </div>
            </CardContent>
          </Card>

          {pendingRecords.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Payment Needed
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 text-red-300">
                <p>You have pending rent collection cycles. Please make payment to the landlord directly.</p>
                <div className="bg-background/40 border border-red-500/10 rounded-lg p-2.5 font-mono text-[10px]">
                  <div>Landlord Contact:</div>
                  <div className="font-bold text-foreground mt-0.5">{house?.address || "N/A"}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
