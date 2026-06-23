import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Plus, Trash2, Edit2, LogOut, CheckCircle2, UserMinus, Search, Upload, FileText, Phone, Mail, Calendar, Key, AlertTriangle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/tenants")({
  head: () => ({ meta: [{ title: "Tenants — MakaanBook" }] }),
  component: TenantsPage,
});

type Tenant = Tables<"tenants">;
type Room = Tables<"rooms">;
type House = Tables<"houses">;

function TenantsPage() {
  const { user } = Route.useRouteContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [vacateDialogOpen, setVacateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Add Form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("unassigned");
  const [rent, setRent] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);
  const [aadharNumber, setAadharNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Vacate Form
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: tenantsData, error: tenantsErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false });

      if (tenantsErr) throw tenantsErr;
      setTenants(tenantsData || []);

      const { data: roomsData, error: roomsErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("landlord_id", user.id);

      if (roomsErr) throw roomsErr;
      setRooms(roomsData || []);

      const { data: housesData, error: housesErr } = await supabase
        .from("houses")
        .select("*")
        .eq("landlord_id", user.id);

      if (housesErr) throw housesErr;
      setHouses(housesData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  // Pre-fill fields when room is selected
  useEffect(() => {
    if (roomId && roomId !== "unassigned") {
      const room = rooms.find((r) => r.id === roomId);
      if (room) {
        setRent(room.monthly_rent.toString());
        setDueDay(room.rent_due_day.toString());
      }
    }
  }, [roomId, rooms]);

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName) {
      toast.error("Full name is required");
      return;
    }
    if (phone && !/^\d{10}$/.test(phone.trim())) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      let idProofUrl = null;
      let profilePicUrl = null;

      // Create a UUID for storage references
      const tempTenantId = crypto.randomUUID();

      // Upload ID proof
      if (idFile) {
        const fileExt = idFile.name.split(".").pop();
        const fileName = `${tempTenantId}/id_proof.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("id-proofs")
          .upload(fileName, idFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("id-proofs")
          .getPublicUrl(fileName);
        idProofUrl = urlData.publicUrl;
      }

      // Upload Profile Pic
      if (profileFile) {
        const fileExt = profileFile.name.split(".").pop();
        const fileName = `${tempTenantId}/profile_pic.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("profile-pics")
          .upload(fileName, profileFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("profile-pics")
          .getPublicUrl(fileName);
        profilePicUrl = urlData.publicUrl;
      }

      const activeRoomId = roomId === "unassigned" ? null : roomId;

      // Insert tenant
      const { error: tenantErr } = await supabase.from("tenants").insert({
        id: tempTenantId,
        landlord_id: user.id,
        full_name: fullName,
        phone: phone || null,
        alternate_phone: altPhone || null,
        email: email || null,
        room_id: activeRoomId,
        monthly_rent: parseFloat(rent) || 0,
        rent_due_day: parseInt(dueDay) || 5,
        move_in_date: moveInDate,
        aadhar_number: aadharNumber || null,
        id_proof_url: idProofUrl,
        profile_pic_url: profilePicUrl,
        is_active: true,
      });

      if (tenantErr) throw tenantErr;

      // Update room occupied status
      if (activeRoomId) {
        const { error: roomErr } = await supabase
          .from("rooms")
          .update({ is_occupied: true })
          .eq("id", activeRoomId);
        if (roomErr) throw roomErr;
      }

      toast.success("Tenant added successfully");
      setAddDialogOpen(false);
      resetAddForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add tenant");
    } finally {
      setSaving(false);
    }
  }

  async function handleVacateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);
    try {
      // 1. Mark tenant inactive and set vacate date
      const { error: tenantErr } = await supabase
        .from("tenants")
        .update({
          is_active: false,
          move_out_date: moveOutDate,
          room_id: null, // disconnect from room
        })
        .eq("id", selectedTenant.id);

      if (tenantErr) throw tenantErr;

      // 2. Set the room as vacant
      if (selectedTenant.room_id) {
        const { error: roomErr } = await supabase
          .from("rooms")
          .update({ is_occupied: false })
          .eq("id", selectedTenant.room_id);
        if (roomErr) throw roomErr;
      }

      toast.success(`${selectedTenant.full_name} has vacated successfully`);
      setVacateDialogOpen(false);
      setSelectedTenant(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to vacate tenant");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTenant(id: string) {
    if (!confirm("Are you sure? This will delete the tenant record and all associated history permanently. To preserve records, use 'Vacate' instead.")) return;
    try {
      const tenant = tenants.find((t) => t.id === id);
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;

      if (tenant && tenant.room_id) {
        await supabase.from("rooms").update({ is_occupied: false }).eq("id", tenant.room_id);
      }

      toast.success("Tenant deleted permanently");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function resetAddForm() {
    setFullName("");
    setPhone("");
    setAltPhone("");
    setEmail("");
    setRoomId("unassigned");
    setRent("");
    setDueDay("5");
    setMoveInDate(new Date().toISOString().split("T")[0]);
    setAadharNumber("");
    setIdFile(null);
    setProfileFile(null);
  }

  const vacantRooms = rooms.filter((r) => !r.is_occupied);

  function getRoomDisplay(roomIdVal: string | null) {
    if (!roomIdVal) return "None / Unassigned";
    const room = rooms.find((r) => r.id === roomIdVal);
    if (!room) return "Unknown Room";
    const house = houses.find((h) => h.id === room.house_id);
    return `${house?.house_name || "Building"} - Room ${room.room_number}`;
  }

  const filteredTenants = tenants.filter((t) =>
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTenants = filteredTenants.filter((t) => t.is_active);
  const inactiveTenants = filteredTenants.filter((t) => !t.is_active);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Tenants Directory</h1>
          <p className="text-muted-foreground">Manage active residents, record documents, and track move-outs.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="sm:self-start">
          <Plus className="mr-2 h-4 w-4" /> Add Tenant
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant by name, email, or phone..."
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeTenants.length})</TabsTrigger>
          <TabsTrigger value="inactive">Vacated ({inactiveTenants.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : activeTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No active tenants found.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeTenants.map((tenant) => (
                <Card key={tenant.id} className="glass-card flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                    <div className="flex gap-3 items-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                        {tenant.profile_pic_url ? (
                          <img src={tenant.profile_pic_url} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="font-display font-semibold text-lg">{tenant.full_name}</CardTitle>
                        <CardDescription className="text-xs text-primary/80 font-medium mt-0.5">{getRoomDisplay(tenant.room_id)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400 hover:bg-amber-400/10" title="Vacate Room" aria-label={`Vacate ${tenant.full_name}`} onClick={() => { setSelectedTenant(tenant); setVacateDialogOpen(true); }}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete Permanently" aria-label={`Delete ${tenant.full_name} permanently`} onClick={() => handleDeleteTenant(tenant.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> <span>{tenant.phone || "No Phone"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> <span>{tenant.email || "No Email"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> <span>In: {tenant.move_in_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Key className="h-3.5 w-3.5" /> <span>Rent: ₹{tenant.monthly_rent}</span>
                      </div>
                    </div>
                    {tenant.aadhar_number && (
                      <div className="border-t border-border/40 pt-2 flex items-center justify-between text-muted-foreground">
                        <span>Aadhar: {tenant.aadhar_number}</span>
                        {tenant.id_proof_url && (
                          <a href={tenant.id_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[10px] uppercase font-bold">
                            <FileText className="h-3 w-3" /> View ID
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : inactiveTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">No vacated tenants registered.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveTenants.map((tenant) => (
                <Card key={tenant.id} className="opacity-60 grayscale border-zinc-700 bg-zinc-900/40 flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                    <div className="flex gap-3 items-center">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                        {tenant.profile_pic_url ? (
                          <img src={tenant.profile_pic_url} alt={`${tenant.full_name} profile photo`} className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="font-display font-semibold text-lg text-zinc-300">{tenant.full_name}</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Vacated</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTenant(tenant.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2 text-xs text-zinc-400">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-zinc-500" /> <span>{tenant.phone || "No Phone"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" /> <span>Out: {tenant.move_out_date || "N/A"}</span>
                      </div>
                    </div>
                    <div className="border-t border-zinc-800/80 pt-2 flex justify-between text-zinc-500">
                      <span>Aadhar: {tenant.aadhar_number || "N/A"}</span>
                      {tenant.id_proof_url && (
                        <a href={tenant.id_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-400 hover:text-white underline">
                          <FileText className="h-3 w-3" /> View ID
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Tenant Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleAddTenant} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>Input tenant details. Pre-registered tenant emails will enable auto-linking upon signup.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="tenantName">Full Name</Label>
                <Input id="tenantName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amit Sharma" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tenantPhone">Primary Phone</Label>
                  <Input id="tenantPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tenantAltPhone">Alt Phone</Label>
                  <Input id="tenantAltPhone" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} placeholder="9988776655" />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tenantEmail">Email Address (Crucial for Tenant Sign in)</Label>
                <Input id="tenantEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amit@example.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="roomSelect">Room Assignment</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger id="roomSelect">
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned / No Room</SelectItem>
                      {vacantRooms.map((room) => {
                        const h = houses.find((house) => house.id === room.house_id);
                        return (
                          <SelectItem key={room.id} value={room.id}>
                            {h?.house_name || "House"} - Room {room.room_number}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tenantRent">Monthly Rent (₹)</Label>
                  <Input id="tenantRent" type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="8000" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tenantDue">Rent Due Day</Label>
                  <Input id="tenantDue" type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="5" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tenantInDate">Move-In Date</Label>
                  <Input id="tenantInDate" type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="aadhar">Aadhar Number</Label>
                <Input id="aadhar" value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} placeholder="1234 5678 9012" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="idFile">Aadhar Card Copy</Label>
                  <Input id="idFile" type="file" accept="image/*,application/pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profileFile">Profile Picture</Label>
                  <Input id="profileFile" type="file" accept="image/*" onChange={(e) => setProfileFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Tenant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vacate Dialog */}
      <Dialog open={vacateDialogOpen} onOpenChange={setVacateDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleVacateTenant}>
            <DialogHeader>
              <DialogTitle>Vacate Tenant</DialogTitle>
              <DialogDescription>
                Confirm when <span className="font-bold text-foreground">{selectedTenant?.full_name}</span> is leaving.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-warning/10 p-3 border border-warning/20 flex gap-2 text-warning text-xs">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  This action marks the tenant as inactive and frees up their room. Rent records and histories will be preserved.
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="vacateDate">Move-Out Date</Label>
                <Input id="vacateDate" type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} required />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVacateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Vacated
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
