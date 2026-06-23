import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Zap, Plus, Trash2, CheckCircle2, Clock, AlertCircle, FileText, Loader2, Save, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/electricity")({
  head: () => ({ meta: [{ title: "Electricity Bills — MakaanBook" }] }),
  component: ElectricityPage,
});

type Tenant = Tables<"tenants">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;
type ElectricityBill = Tables<"electricity_bills">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function ElectricityPage() {
  const { user } = Route.useRouteContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [tenantId, setTenantId] = useState("");
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [previousReading, setPreviousReading] = useState("");
  const [currentReading, setCurrentReading] = useState("");
  const [unitRate, setUnitRate] = useState("8");
  const [fixedCharge, setFixedCharge] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"pending" | "paid" | "partial" | "overdue">("pending");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "online" | "bank_transfer">("upi");
  const [transactionId, setTransactionId] = useState("");
  const [cashSerialNotes, setCashSerialNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Meter replaced states
  const [isMeterReplaced, setIsMeterReplaced] = useState(false);
  const [oldMeterFinalReading, setOldMeterFinalReading] = useState("");
  const [newMeterStartReading, setNewMeterStartReading] = useState("");

  useEffect(() => {
    fetchData();
  }, [user.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: tenantsData, error: tenantsErr } = await supabase.from("tenants").select("*").eq("landlord_id", user.id);
      if (tenantsErr) throw tenantsErr;
      setTenants(tenantsData || []);

      const { data: roomsData, error: roomsErr } = await supabase.from("rooms").select("*").eq("landlord_id", user.id);
      if (roomsErr) throw roomsErr;
      setRooms(roomsData || []);

      const { data: housesData, error: housesErr } = await supabase.from("houses").select("*").eq("landlord_id", user.id);
      if (housesErr) throw housesErr;
      setHouses(housesData || []);

      const { data: billsData, error: billsErr } = await supabase
        .from("electricity_bills")
        .select("*")
        .eq("landlord_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (billsErr) throw billsErr;
      setBills(billsData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load electricity bills");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch previous reading and default rates
  useEffect(() => {
    if (tenantId) {
      const tenant = tenants.find((t) => t.id === tenantId);
      if (tenant && tenant.room_id) {
        const room = rooms.find((r) => r.id === tenant.room_id);
        const house = room ? houses.find((h) => h.id === room.house_id) : null;

        if (house) {
          setUnitRate(house.default_unit_rate?.toString() || "8");
        }

        // fetch last reading for this room
        supabase
          .from("electricity_bills")
          .select("current_reading, new_meter_start_reading, is_meter_replaced")
          .eq("room_id", tenant.room_id)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setPreviousReading(data.current_reading.toString());
            } else {
              setPreviousReading("0");
            }
          });

        const day = tenant.rent_due_day || 5;
        const due = `${year}-${month.padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        setDueDate(due);
      }
    }
  }, [tenantId, month, year, tenants, rooms, houses]);

  // Handle calculation of total units & bill
  const prevVal = parseFloat(previousReading) || 0;
  const currVal = parseFloat(currentReading) || 0;
  const rateVal = parseFloat(unitRate) || 0;
  const fixedVal = parseFloat(fixedCharge) || 0;

  let computedUnits = 0;
  if (isMeterReplaced) {
    const oldFinal = parseFloat(oldMeterFinalReading) || 0;
    const newStart = parseFloat(newMeterStartReading) || 0;
    computedUnits = (oldFinal - prevVal) + (currVal - newStart);
  } else {
    computedUnits = currVal - prevVal;
  }
  if (computedUnits < 0) computedUnits = 0;

  const computedBillAmount = computedUnits * rateVal;
  const computedTotalBill = computedBillAmount + fixedVal;

  // Sync amountPaid if paid
  useEffect(() => {
    if (status === "paid") {
      setAmountPaid(computedTotalBill.toString());
    } else if (status === "pending") {
      setAmountPaid("0");
    }
  }, [status, computedTotalBill]);

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      toast.error("Please select a tenant");
      return;
    }
    if (currVal < prevVal && !isMeterReplaced) {
      toast.error("Current reading cannot be lower than previous reading");
      return;
    }
    setSaving(true);
    try {
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      if (!selectedTenant) throw new Error("Tenant not found");

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
        const fileName = `${user.id}/elec_${tempId}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }

      const totalPaid = parseFloat(amountPaid) || 0;

      const { error } = await supabase.from("electricity_bills").insert({
        tenant_id: tenantId,
        room_id: itemRoomId,
        house_id: itemHouseId,
        landlord_id: user.id,
        month: parseInt(month),
        year: parseInt(year),
        previous_reading: prevVal,
        current_reading: currVal,
        billed_units: computedUnits,
        per_unit_rate: rateVal,
        bill_amount: computedBillAmount,
        fixed_charge: fixedVal,
        total_bill: computedTotalBill,
        due_date: dueDate || new Date().toISOString().split("T")[0],
        paid_date: status === "paid" || status === "partial" ? paidDate : null,
        status,
        amount_paid: totalPaid,
        mode_of_payment: status === "paid" || status === "partial" ? paymentMode : null,
        transaction_id: transactionId || null,
        cash_serial_notes: paymentMode === "cash" ? cashSerialNotes : null,
        notes: notes || null,
        cash_proof_urls: proofUrl ? [proofUrl] : null,
        is_meter_replaced: isMeterReplaced,
        old_meter_final_reading: isMeterReplaced ? parseFloat(oldMeterFinalReading) : null,
        new_meter_start_reading: isMeterReplaced ? parseFloat(newMeterStartReading) : null,
      });

      if (error) throw error;
      toast.success("Electricity bill created successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to log bill");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBill(id: string) {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      const { error } = await supabase.from("electricity_bills").delete().eq("id", id);
      if (error) throw error;
      toast.success("Bill deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function resetForm() {
    setTenantId("");
    setPreviousReading("");
    setCurrentReading("");
    setFixedCharge("0");
    setAmountPaid("");
    setTransactionId("");
    setCashSerialNotes("");
    setNotes("");
    setProofFile(null);
    setIsMeterReplaced(false);
    setOldMeterFinalReading("");
    setNewMeterStartReading("");
  }

  function getTenantName(tId: string) {
    const tenant = tenants.find((t) => t.id === tId);
    return tenant ? tenant.full_name : "Unknown Tenant";
  }

  function getHouseName(hId: string | null) {
    if (!hId) return "-";
    const house = houses.find((h) => h.id === hId);
    return house ? house.house_name : "Building";
  }

  function getRoomNumber(rId: string | null) {
    if (!rId) return "-";
    const room = rooms.find((r) => r.id === rId);
    return room ? `Room ${room.room_number}` : "Room";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Electricity Bill Manager</h1>
          <p className="text-muted-foreground">Record meter readings, compute monthly units, and manage bill statuses.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="sm:self-start">
          <Plus className="mr-2 h-4 w-4" /> Enter Meter Reading
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No electricity bills logged yet.</div>
      ) : (
        <div className="grid gap-4">
          {bills.map((bill) => (
            <Card key={bill.id} className="glass-card">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-3 items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    bill.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                    bill.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-base">{getTenantName(bill.tenant_id)}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                      <span>{getHouseName(bill.house_id)} ({getRoomNumber(bill.room_id)})</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">{MONTHS[bill.month - 1]} {bill.year}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:text-right gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground">Readings</div>
                    <div className="font-semibold text-sm text-foreground">
                      {bill.previous_reading} <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" /> {bill.current_reading}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Units</div>
                    <div className="font-semibold text-sm text-foreground">
                      {bill.billed_units} {bill.is_meter_replaced && <span className="text-[10px] text-amber-400">(Fault Change)</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Bill</div>
                    <div className="font-semibold text-sm text-foreground">₹{bill.total_bill}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Paid</div>
                    <div className="font-semibold text-sm text-emerald-400">₹{bill.amount_paid}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    bill.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                    bill.status === "partial" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {bill.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                     bill.status === "partial" ? <Clock className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {bill.status.toUpperCase()}
                  </span>
                  <div className="flex gap-1.5">
                    {bill.cash_proof_urls && bill.cash_proof_urls.length > 0 && (
                      <a href={bill.cash_proof_urls[0]} target="_blank" rel="noreferrer" className="text-xs border border-border p-1.5 rounded-lg hover:bg-card/40" title="View Proof">
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBill(bill.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Log Bill Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleAddBill} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Enter Meter Reading & Generate Bill</DialogTitle>
              <DialogDescription>Input monthly electricity metrics to calculate billing amounts.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="elecTenant">Select Active Tenant</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger id="elecTenant">
                    <SelectValue placeholder="Choose a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.filter((t) => t.is_active).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} ({getRoomNumber(t.room_id)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="elecMonth">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger id="elecMonth"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, idx) => <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="elecYear">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger id="elecYear"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["2025", "2026", "2027", "2028"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Meter Replacement Checkbox */}
              <div className="flex items-center space-x-2 py-2 border-y border-border/40">
                <Checkbox
                  id="meterChange"
                  checked={isMeterReplaced}
                  onCheckedChange={(checked: boolean) => setIsMeterReplaced(checked)}
                />
                <Label htmlFor="meterChange" className="font-semibold text-amber-400 cursor-pointer flex flex-col gap-0.5">
                  <span>Meter changed due to fault?</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Check this to log old and new meter readings.</span>
                </Label>
              </div>

              {isMeterReplaced ? (
                <div className="space-y-4 border border-amber-500/20 bg-amber-500/5 rounded-xl p-3">
                  <h4 className="font-bold text-xs text-amber-500">Meter Replacement Readings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="prevRead">Previous Reading (Old Meter)</Label>
                      <Input id="prevRead" type="number" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="oldFinal">Old Meter Final Reading</Label>
                      <Input id="oldFinal" type="number" value={oldMeterFinalReading} onChange={(e) => setOldMeterFinalReading(e.target.value)} placeholder="Final reading" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="newStart">New Meter Starting Reading</Label>
                      <Input id="newStart" type="number" value={newMeterStartReading} onChange={(e) => setNewMeterStartReading(e.target.value)} placeholder="Usually 0 or low value" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="currRead">Current Reading (New Meter)</Label>
                      <Input id="currRead" type="number" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} placeholder="New meter current reading" required />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="prevRead">Previous Reading</Label>
                    <Input id="prevRead" type="number" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="currRead">Current Reading</Label>
                    <Input id="currRead" type="number" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} required />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="unitRate">Unit Rate (₹/unit)</Label>
                  <Input id="unitRate" type="number" step="0.1" value={unitRate} onChange={(e) => setUnitRate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fixed">Fixed Charges (₹)</Label>
                  <Input id="fixed" type="number" value={fixedCharge} onChange={(e) => setFixedCharge(e.target.value)} required />
                </div>
              </div>

              {/* Live Calculator preview */}
              <div className="rounded-xl bg-card/40 border border-border p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Calculated Units:</span>
                  <span className="font-semibold">{computedUnits} Units</span>
                </div>
                <div className="flex justify-between">
                  <span>Charge:</span>
                  <span>{computedUnits} x ₹{rateVal} = ₹{computedBillAmount.toFixed(2)}</span>
                </div>
                {fixedVal > 0 && (
                  <div className="flex justify-between">
                    <span>Fixed Charges:</span>
                    <span>₹{fixedVal}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground">
                  <span>Total Bill Amount:</span>
                  <span>₹{computedTotalBill.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="billStatus">Payment Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="billStatus"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billDue">Due Date</Label>
                  <Input id="billDue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
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
                          <SelectItem value="online">Card / NetBanking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="billPaidAmt">Amount Paid (₹)</Label>
                      <Input id="billPaidAmt" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="billPaidDate">Paid Date</Label>
                      <Input id="billPaidDate" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} required />
                    </div>
                    {paymentMode === "cash" ? (
                      <div className="space-y-1">
                        <Label htmlFor="serialNotes">Cash Serial Notes Counter</Label>
                        <Input id="serialNotes" value={cashSerialNotes} onChange={(e) => setCashSerialNotes(e.target.value)} placeholder="e.g. 500x3" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="txId">Transaction ID</Label>
                        <Input id="txId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="UPI txn ID" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="proofFile">Upload Payment Proof</Label>
                    <Input id="proofFile" type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="billNotes">Notes</Label>
                <Input id="billNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Log Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
