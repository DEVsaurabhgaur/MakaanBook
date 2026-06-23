import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Download, Users, Calendar, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Reports — MakaanBook" }] }),
  component: ReportsPage,
});

type Tenant = Tables<"tenants">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;
type RentRecord = Tables<"rent_records">;
type ElectricityBill = Tables<"electricity_bills">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function ReportsPage() {
  const { user } = Route.useRouteContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [generating, setGenerating] = useState(false);

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
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function generatePdf() {
    if (!selectedTenantId) {
      toast.error("Please select a tenant to generate a report");
      return;
    }
    setGenerating(true);
    try {
      const tenant = tenants.find((t) => t.id === selectedTenantId);
      if (!tenant) throw new Error("Tenant not found");

      // Fetch rent records
      const { data: rentData, error: rentErr } = await supabase
        .from("rent_records")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (rentErr) throw rentErr;

      // Fetch electricity bills
      const { data: elecData, error: elecErr } = await supabase
        .from("electricity_bills")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (elecErr) throw elecErr;

      const room = rooms.find((r) => r.id === tenant.room_id || (rentData && rentData.length > 0 && r.id === rentData[0].room_id));
      const house = room ? houses.find((h) => h.id === room.house_id) : null;

      const doc = new jsPDF();

      // Styling parameters
      doc.setFillColor(26, 31, 46); // background dark blue header block
      doc.rect(0, 0, 210, 45, "F");

      // Header title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MAKAANBOOK", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Rent & Electricity Bill Statement", 15, 28);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 34);

      // Landlord Info
      doc.setFontSize(9);
      doc.text("MakaanBook Ledger Service", 150, 20);
      doc.text(`Landlord ID: ${user.id.substring(0, 8)}...`, 150, 26);

      // Section: Tenant Details
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Tenant & Property details", 15, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const startY = 62;
      doc.text(`Name: ${tenant.full_name}`, 15, startY);
      doc.text(`Phone: ${tenant.phone || "N/A"}`, 15, startY + 6);
      doc.text(`Email: ${tenant.email || "N/A"}`, 15, startY + 12);

      doc.text(`House: ${house?.house_name || "N/A"}`, 110, startY);
      doc.text(`Room: ${room?.room_number || "N/A"}`, 110, startY + 6);
      doc.text(`Rent: INR ${tenant.monthly_rent}/month`, 110, startY + 12);

      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, startY + 18, 195, startY + 18);

      // Rent Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Rent Collection Ledger", 15, startY + 28);

      const rentRows = (rentData || []).map((r) => [
        `${MONTHS[r.month - 1]} ${r.year}`,
        `INR ${r.rent_amount}`,
        `INR ${r.amount_paid}`,
        `INR ${r.pending_amount}`,
        r.status.toUpperCase(),
        r.mode_of_payment?.toUpperCase() || "-",
        r.paid_date || "-",
      ]);

      (doc as any).autoTable({
        startY: startY + 32,
        head: [["Period", "Rent", "Paid", "Pending", "Status", "Mode", "Paid Date"]],
        body: rentRows,
        theme: "striped",
        headStyles: { fillColor: [26, 31, 46], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 },
      });

      // Electricity Table
      const finalRentY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Electricity Billing Ledger", 15, finalRentY);

      const elecRows = (elecData || []).map((e) => [
        `${MONTHS[e.month - 1]} ${e.year}`,
        `${e.previous_reading} - ${e.current_reading}`,
        `${e.billed_units} units`,
        `INR ${e.total_bill}`,
        `INR ${e.amount_paid}`,
        e.status.toUpperCase(),
        e.paid_date || "-",
      ]);

      (doc as any).autoTable({
        startY: finalRentY + 4,
        head: [["Period", "Readings", "Usage", "Total Bill", "Paid", "Status", "Paid Date"]],
        body: elecRows,
        theme: "striped",
        headStyles: { fillColor: [26, 31, 46], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 },
      });

      // Save PDF
      const filename = `${tenant.full_name.replace(/\s+/g, "_")}_statement.pdf`;
      doc.save(filename);
      toast.success(`Report downloaded as ${filename}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate statement");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Statements & Reports</h1>
        <p className="text-muted-foreground">Generate comprehensive payment ledger PDFs for tax, accounting, or tenant references.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Generate Tenant Statement</CardTitle>
          <CardDescription>Select a tenant from the directory to compile all past rent and electricity transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants registered to generate statements for.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdfTenant">Choose Resident</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger id="pdfTenant"><SelectValue placeholder="Select a tenant..." /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} {t.is_active ? "" : "[Vacated]"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={generatePdf} disabled={generating} className="w-full">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download PDF Statement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
