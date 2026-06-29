import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Receipt, Plus, FileText, CheckCircle2, AlertCircle, Clock, Trash2, Loader2, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/rent")({
  head: () => ({ meta: [{ title: "Rent Records — MakaanBook" }] }),
  component: RentRecordsPage,
});

type Tenant = Tables<"tenants">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;
type RentRecord = Tables<"rent_records">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function RentRecordsPage() {
  const { user } = Route.useRouteContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(new Date().getFullYear().toString());

  // Form states
  const [tenantId, setTenantId] = useState("");
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rentAmount, setRentAmount] = useState("");
  const [status, setStatus] = useState<"pending" | "paid" | "partial" | "overdue">("pending");
  const currentYearNum = new Date().getFullYear();
  const yearOptions = [currentYearNum - 1, currentYearNum, currentYearNum + 1, currentYearNum + 2].map(String);
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "online" | "bank_transfer">("upi");
  const [transactionId, setTransactionId] = useState("");
  const [cashSerialNotes, setCashSerialNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [tenantsRes, roomsRes, housesRes, recordsRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("landlord_id", user.id),
        supabase.from("rooms").select("*").eq("landlord_id", user.id),
        supabase.from("houses").select("*").eq("landlord_id", user.id),
        supabase
          .from("rent_records")
          .select("*")
          .eq("landlord_id", user.id)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
      ]);

      if (tenantsRes.error) throw tenantsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (housesRes.error) throw housesRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setTenants(tenantsRes.data || []);
      setRooms(roomsRes.data || []);
      setHouses(housesRes.data || []);
      setRentRecords(recordsRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load rent records");
    } finally {
      setLoading(false);
    }
  }

  // Pre-fill fields when tenant changes
  useEffect(() => {
    if (tenantId) {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (tenant) {
        setRentAmount(tenant.monthly_rent.toString());
        setAmountPaid(status === "paid" ? tenant.monthly_rent.toString() : "0");
        // default due date based on year, month, and tenant due day
        const day = tenant.rent_due_day || 5;
        const due = `${year}-${month.padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        setDueDate(due);
      }
    }
  }, [tenantId, month, year, status, tenants]);

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      toast.error("Please select a tenant");
      return;
    }
    const totalRentCheck = parseFloat(rentAmount) || 0;
    const totalPaidCheck = parseFloat(amountPaid) || 0;
    if (totalRentCheck <= 0) {
      toast.error("Rent amount must be a positive number");
      return;
    }
    if (totalPaidCheck < 0) {
      toast.error("Amount paid cannot be negative");
      return;
    }
    if (totalPaidCheck > totalRentCheck) {
      toast.error("Amount paid cannot exceed the rent amount");
      return;
    }
    setSaving(true);
    try {
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      if (!selectedTenant) throw new Error("Tenant not found");

      // Find room & house if active or check from room list
      let itemRoomId = selectedTenant.room_id;
      let itemHouseId = null;

      if (itemRoomId) {
        const room = rooms.find((r) => r.id === itemRoomId);
        itemHouseId = room ? room.house_id : null;
      }

      let proofUrl = null;
      if (proofFile) {
        const tempId = crypto.randomUUID();
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `${user.id}/rent_${tempId}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }

      const totalRent = parseFloat(rentAmount) || 0;
      const totalPaid = parseFloat(amountPaid) || 0;
      const pending = totalRent - totalPaid;

      const { error } = await supabase.from("rent_records").insert({
        tenant_id: tenantId,
        room_id: itemRoomId,
        house_id: itemHouseId,
        landlord_id: user.id,
        month: parseInt(month),
        year: parseInt(year),
        rent_amount: totalRent,
        due_date: dueDate || new Date().toISOString().split("T")[0],
        paid_date: status === "paid" || status === "partial" ? paidDate : null,
        status,
        amount_paid: totalPaid,
        pending_amount: pending > 0 ? pending : 0,
        mode_of_payment: status === "paid" || status === "partial" ? paymentMode : null,
        transaction_id: transactionId || null,
        cash_serial_notes: paymentMode === "cash" ? cashSerialNotes : null,
        notes: notes || null,
        cash_proof_urls: proofUrl ? [proofUrl] : null,
      });

      if (error) throw error;
      toast.success("Rent payment logged successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to log rent record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm("Are you sure you want to delete this rent payment entry?")) return;
    try {
      const { error } = await supabase.from("rent_records").delete().eq("id", id);
      if (error) throw error;
      toast.success("Record deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function resetForm() {
    setTenantId("");
    setRentAmount("");
    setStatus("pending");
    setAmountPaid("");
    setTransactionId("");
    setCashSerialNotes("");
    setNotes("");
    setProofFile(null);
  }

  function getTenantName(tId: string) {
    const tenant = tenants.find((t) => t.id === tId);
    return tenant ? tenant.full_name : "Unknown Tenant";
  }

  function getHouseName(hId: string | null) {
    if (!hId) return "-";
    const house = houses.find((h) => h.id === hId);
    return house ? house.house_name : "Unknown Building";
  }

  function getRoomNumber(rId: string | null) {
    if (!rId) return "-";
    const room = rooms.find((r) => r.id === rId);
    return room ? `Room ${room.room_number}` : "Room";
  }

  const filteredRecords = rentRecords.filter((rec) => {
    if (selectedHouseFilter !== "all" && rec.house_id !== selectedHouseFilter) return false;
    if (selectedMonthFilter !== "all" && rec.month.toString() !== selectedMonthFilter) return false;
    if (selectedYearFilter !== "all" && rec.year.toString() !== selectedYearFilter) return false;
    return true;
  });
  const filterYearOptions = Array.from(new Set(rentRecords.map((r) => r.year.toString()))).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Rent Tracker</h1>
          <p className="text-muted-foreground">Log monthly rent dues, collections, cash receipts, and pending balances.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="sm:self-start">
          <Plus className="mr-2 h-4 w-4" /> Log Rent Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Filter by House</Label>
          <Select value={selectedHouseFilter} onValueChange={setSelectedHouseFilter}>
            <SelectTrigger><SelectValue placeholder="All Houses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Houses</SelectItem>
              {houses.map((h) => <SelectItem key={h.id} value={h.id}>{h.house_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Filter by Month</Label>
          <Select value={selectedMonthFilter} onValueChange={setSelectedMonthFilter}>
            <SelectTrigger><SelectValue placeholder="All Months" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, idx) => <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Filter by Year</Label>
          <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter}>
            <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {filterYearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records table/cards */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No rent records recorded yet.</div>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="glass-card">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-3 items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    record.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                    record.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-base">{getTenantName(record.tenant_id)}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                      <span>{getHouseName(record.house_id)} ({getRoomNumber(record.room_id)})</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">{MONTHS[record.month - 1]} {record.year}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:text-right gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground">Rent Amount</div>
                    <div className="font-semibold text-sm text-foreground">₹{record.rent_amount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Amount Paid</div>
                    <div className="font-semibold text-sm text-emerald-400">₹{record.amount_paid}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pending</div>
                    <div className="font-semibold text-sm text-destructive">₹{record.pending_amount}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    record.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                    record.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {record.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                     record.status === "partial" ? <Clock className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {record.status.toUpperCase()}
                  </span>
                  <div className="flex gap-1.5">
                    {record.cash_proof_urls && record.cash_proof_urls.length > 0 && (
                      <a href={record.cash_proof_urls[0]} target="_blank" rel="noreferrer" className="text-xs border border-border p-1.5 rounded-lg hover:bg-card/40" title="View Proof">
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRecord(record.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Log Payment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleAddRecord} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Log Rent Payment</DialogTitle>
              <DialogDescription>Record a new rent collection cycle for a tenant.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="rentTenant">Select Tenant</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger id="rentTenant">
                    <SelectValue placeholder="Choose a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} ({getRoomNumber(t.room_id)}) {t.is_active ? "" : "[Vacated]"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rentMonth">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger id="rentMonth"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, idx) => <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rentYear">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger id="rentYear"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rentAmt">Monthly Rent Amount (₹)</Label>
                  <Input id="rentAmt" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rentDue">Due Date</Label>
                  <Input id="rentDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="rentStatus">Payment Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="rentStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rentPaid">Amount Paid (₹)</Label>
                  <Input id="rentPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} required />
                </div>
              </div>

              {(status === "paid" || status === "partial") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="payMode">Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                        <SelectTrigger id="payMode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="online">Debit/Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rentPaidDate">Paid Date</Label>
                      <Input id="rentPaidDate" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} required />
                    </div>
                  </div>

                  {paymentMode === "cash" ? (
                    <div className="space-y-1">
                      <Label htmlFor="serialNotes">Cash Serial Notes Counter (e.g. 500x10, 100x5)</Label>
                      <Input
                        id="serialNotes"
                        value={cashSerialNotes}
                        onChange={(e) => setCashSerialNotes(e.target.value)}
                        placeholder="Provide details of cash received..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="txId">Transaction ID / Reference</Label>
                      <Input id="txId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="UPI Txn ID or Bank Reference" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="proofFile">Upload Payment Receipt / Image Proof</Label>
                    <Input id="proofFile" type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="rentNotes">Notes</Label>
                <Input id="rentNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional comments" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Log Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
